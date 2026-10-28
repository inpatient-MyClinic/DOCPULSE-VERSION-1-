#!/usr/bin/env node
'use strict';
/* DocPules test runner.

     node tests/run.js                 run everything
     node tests/run.js ot live         run the tests whose name contains "ot" or "live"
     node tests/run.js --update NAME   accept the current output of NAME as the expected one
     node tests/run.js -j 3            three at a time (default 2)

   Each test gets its own fresh server and database with the workbooks it
   asks for. A test fails when it prints a ✗, when the page threw an error,
   when it crashes or times out, or when what it prints (or the numbers it
   captures) differs from the accepted copy in fixtures/golden/. */
const fs = require('fs');
const path = require('path');
const { fork } = require('child_process');
const Srv = require('./lib/server');
const LIST = require('./tests');

const HERE = __dirname;
const FIX = process.env.DP_FIXTURES || path.join(HERE, 'fixtures');
const GOLD = path.join(FIX, 'golden');
const OUTROOT = path.join(HERE, '.out');

const argv = process.argv.slice(2);
let update = false, jobs = 2; const pick = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--update') update = true;
  else if (argv[i] === '-j') jobs = Math.max(1, +argv[++i] || 1);
  else pick.push(argv[i]);
}
const todo = LIST.filter((t) => !pick.length || pick.some((p) => t.name.includes(p)));

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const guess = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'];
  for (const g of guess) if (fs.existsSync(g)) return g;
  try { return require('playwright-core').chromium.executablePath(); } catch (e) { return undefined; }
}
/* today's date in the forms the page prints it */
const TODAY = (() => {
  const d = new Date(), M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const forms = [d.getDate() + ' ' + M[d.getMonth()] + ' ' + d.getFullYear(), M[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(), iso];
  return new RegExp(forms.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
})();
/* what may differ from run to run without anything being wrong */
function normalise(text) {
  return text.split('\n')
    .map((l) => l.replace(/\x1b\[[0-9;]*m/g, '').replace(/\s+$/, ''))
    .filter((l) => l.trim())
    .filter((l) => !/\b\d+(\.\d+)?\s?ms\b/.test(l))              /* timings */
    .filter((l) => !/\(\d+(\.\d+)? s\)/.test(l))
    .filter((l) => !/^\s*(captured|mem MB|freezes)/.test(l))
    .map((l) => l
      .replace(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z?/g, '<time>')
      .replace(/(?<!\d)\d{1,2}:\d\d(:\d\d)?(\s?(AM|PM|am|pm))?(?!\d)/g, '<clock>')
      .replace(TODAY, '<today>')
      .replace(/\b[a-z]?[0-9a-f]{16,}\b/g, '<id>')
      .replace(/\b(just now|\d+ (sec|min|hour|day)s? ago)\b/g, '<ago>')
      .replace(/dp-test-[A-Za-z0-9]+/g, '<dir>'))
    .join('\n');
}
/* things that mean failure whatever the expected output says */
function redFlags(text) {
  const out = [];
  text.split('\n').forEach((l) => {
    if (/✗/.test(l)) out.push(l.trim());
    if (/JSDOM ERROR/.test(l)) out.push(l.trim());
    if (/^\s*errors\s*\[\s*['"{]/.test(l)) out.push(l.trim());
    if (/^RESULT:/.test(l) && !/RESULT: clean/.test(l)) out.push(l.trim());
  });
  return out;
}
function diffLines(want, got) {
  const a = want.split('\n'), b = got.split('\n'), out = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n && out.length < 12; i++) {
    if (a[i] === b[i]) continue;
    out.push('    line ' + (i + 1) + ':');
    if (a[i] !== undefined) out.push('      expected: ' + a[i].slice(0, 300));
    if (b[i] !== undefined) out.push('      got     : ' + b[i].slice(0, 300));
  }
  return out;
}
function diffSnap(a, b) {
  const out = [];
  const walk = (x, y, p) => {
    if (out.length >= 10) return;
    if (JSON.stringify(x) === JSON.stringify(y)) return;
    if (x && y && typeof x === 'object' && typeof y === 'object') {
      new Set(Object.keys(x).concat(Object.keys(y))).forEach((k) => walk(x[k], y[k], p + '/' + k));
      return;
    }
    out.push('    ' + p + ': expected ' + JSON.stringify(x) + ', got ' + JSON.stringify(y));
  };
  walk(a, b, '');
  return out;
}
function runCase(file, srv, outDir, args, timeoutS) {
  return new Promise((resolve) => {
    let text = '';
    const env = Object.assign({}, process.env, {
      DP_BASE: srv.base, DP_COOKIE_FILE: srv.cookieFile, DP_FIXTURES: FIX, DP_OUT: outDir,
      DP_EMAIL: srv.email, DP_PASSWORD: srv.password, CHROME_PATH: chromePath() || ''
    });
    const child = fork(path.join(HERE, 'cases', file + '.js'), args || [], { env, silent: true, cwd: HERE });
    child.stdout.on('data', (d) => { text += d; });
    child.stderr.on('data', (d) => { text += d; });
    child.on('message', async (m) => {
      if (m && m.restart) { try { await srv.restart(); } catch (e) { text += '\nrestart failed: ' + e.message; } child.send({ restarted: true }); }
    });
    const timer = setTimeout(() => { text += '\n✗ timed out after ' + timeoutS + ' s'; child.kill('SIGKILL'); }, timeoutS * 1000);
    child.on('exit', (code) => { clearTimeout(timer); resolve({ code, text }); });
  });
}
async function runOne(t) {
  const started = Date.now();
  const outDir = path.join(OUTROOT, t.name);
  fs.rmSync(outDir, { recursive: true, force: true }); fs.mkdirSync(outDir, { recursive: true });
  const res = { name: t.name, problems: [] };
  let srv;
  try {
    srv = await Srv.start({
      master: t.master === null ? null : path.join(FIX, t.master || 'back.xlsx'),
      capacity: t.capacity === null ? null : path.join(FIX, t.capacity || 'cap-banjar.xlsx')
    });
    let all = '';
    for (const s of (t.steps || [])) {
      const r = await runCase(s, srv, outDir, [], t.timeout || 240);
      all += r.text;
      if (r.code !== 0) res.problems.push('set-up ' + s + ' exited with ' + r.code);
    }
    const r = await runCase(t.name, srv, outDir, t.args, t.timeout || 240);
    fs.writeFileSync(path.join(outDir, 'output.txt'), r.text);
    if (r.code !== 0) res.problems.push('exited with code ' + r.code);
    redFlags(r.text).forEach((l) => res.problems.push(l));
    fs.mkdirSync(GOLD, { recursive: true });
    if (t.golden !== false) {
      const gf = path.join(GOLD, t.name + '.txt'), got = normalise(r.text);
      if (update || !fs.existsSync(gf)) { fs.writeFileSync(gf, got + '\n'); res.note = update ? 'expected output updated' : 'expected output recorded (first run)'; }
      else {
        const want = fs.readFileSync(gf, 'utf8').replace(/\n$/, '');
        if (want !== got) { res.problems.push('output differs from fixtures/golden/' + t.name + '.txt'); res.diff = diffLines(want, got); }
      }
    }
    if (t.snapshot) {
      const sf = path.join(outDir, 'snapshot.json'), gj = path.join(GOLD, t.name + '.json');
      if (!fs.existsSync(sf)) res.problems.push('no snapshot written');
      else if (update || !fs.existsSync(gj)) { fs.copyFileSync(sf, gj); res.note = (res.note ? res.note + '; ' : '') + 'numbers ' + (update ? 'updated' : 'recorded'); }
      else {
        const d = diffSnap(JSON.parse(fs.readFileSync(gj, 'utf8')), JSON.parse(fs.readFileSync(sf, 'utf8')));
        if (d.length) { res.problems.push('numbers differ from fixtures/golden/' + t.name + '.json'); res.diff = (res.diff || []).concat(d); }
      }
    }
  } catch (e) {
    res.problems.push('runner: ' + e.message);
  } finally {
    if (srv) await srv.stop();
  }
  res.secs = Math.round((Date.now() - started) / 1000);
  return res;
}
(async () => {
  if (!fs.existsSync(path.join(FIX, 'back.xlsx'))) {
    console.error('The test workbooks are missing. Put them in ' + FIX + ' (see tests/README.md).');
    process.exit(2);
  }
  if (!todo.length) { console.error('No test matches ' + pick.join(' ')); process.exit(2); }
  console.log('Running ' + todo.length + ' test' + (todo.length === 1 ? '' : 's') + ', ' + jobs + ' at a time\n');
  const results = []; let next = 0;
  async function worker() {
    while (next < todo.length) {
      const t = todo[next++];
      const r = await runOne(t);
      results.push(r);
      const ok = !r.problems.length;
      console.log((ok ? 'PASS ' : 'FAIL ') + r.name.padEnd(30) + String(r.secs).padStart(4) + ' s' + (r.note ? '   (' + r.note + ')' : ''));
      if (!ok) { r.problems.slice(0, 8).forEach((p) => console.log('    ' + p)); (r.diff || []).forEach((d) => console.log(d)); console.log('    full output: tests/.out/' + r.name + '/output.txt'); }
    }
  }
  await Promise.all(Array.from({ length: Math.min(jobs, todo.length) }, worker));
  const bad = results.filter((r) => r.problems.length);
  console.log('\n' + (results.length - bad.length) + ' passed, ' + bad.length + ' failed');
  if (bad.length) console.log('Failed: ' + bad.map((r) => r.name).join(', '));
  process.exit(bad.length ? 1 : 0);
})();
