'use strict';
/* A fresh DocPules server for one test: its own port, its own empty database,
   one admin account, and the workbooks the test asks for already uploaded.
   Several can run side by side, because nothing is shared between them. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const EMAIL = 'test@docpules.local';
const PASSWORD = 'test-password-123';

function freePort() {
  return new Promise((res, rej) => {
    const s = net.createServer();
    s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); });
    s.on('error', rej);
  });
}
function request(base, p, opt) {
  return new Promise((res, rej) => {
    const u = new URL(base + p);
    const r = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search,
      method: (opt && opt.method) || 'GET', headers: (opt && opt.headers) || {} }, (resp) => {
      const chunks = []; resp.on('data', (c) => chunks.push(c));
      resp.on('end', () => res({ status: resp.statusCode, headers: resp.headers, body: Buffer.concat(chunks) }));
    });
    r.on('error', rej);
    if (opt && opt.body) r.write(opt.body);
    r.end();
  });
}
async function waitUp(base, ms) {
  const end = Date.now() + (ms || 15000);
  while (Date.now() < end) {
    try { const r = await request(base, '/health'); if (r.status === 200) return; } catch (e) { /* not yet */ }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('server did not start');
}
function startProcess(env, logFile) {
  const out = fs.openSync(logFile, 'a');
  const child = spawn(process.execPath, ['server/index.js'], { cwd: ROOT, env, stdio: ['ignore', out, out] });
  return child;
}
/* opts: { master, capacity } file paths (or null to upload nothing) */
async function start(opts) {
  const port = await freePort();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dp-test-'));
  const env = Object.assign({}, process.env, {
    PORT: String(port), DATA_DIR: dir, SESSION_SECRET: crypto.randomBytes(24).toString('hex'),
    INSECURE_COOKIES: '1', ADMIN_EMAIL: EMAIL, ADMIN_PASSWORD: PASSWORD, ALLOW_IPS: ''
  });
  const base = 'http://localhost:' + port;
  const log = path.join(dir, 'server.log');
  let child = startProcess(env, log);
  await waitUp(base);
  const login = await request(base, '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }) });
  const sc = [].concat(login.headers['set-cookie'] || []).map((c) => c.split(';')[0]).find((c) => /^dp_session=/.test(c));
  if (!sc) throw new Error('could not sign in to the test server: ' + login.body.toString().slice(0, 200));
  const upload = async (kind, file, name) => {
    const r = await request(base, '/api/files/' + kind + '?name=' + encodeURIComponent(name || (kind === 'master' ? 'M.xlsx' : 'C.xlsx')),
      { method: 'POST', headers: { Cookie: sc, 'Content-Type': 'application/octet-stream' }, body: fs.readFileSync(file) });
    if (r.status !== 200) throw new Error('upload ' + kind + ' failed: ' + r.status);
  };
  if (opts && opts.master) await upload('master', opts.master);
  if (opts && opts.capacity) await upload('capacity', opts.capacity);
  const cookieFile = path.join(dir, 'cookie.txt');
  fs.writeFileSync(cookieFile, sc);
  const srv = {
    base, port, dir, env, log, cookie: sc, cookieFile, email: EMAIL, password: PASSWORD,
    get pid() { return child.pid; },
    /* stop and start again on the same database: what a deploy does */
    async restart() {
      await new Promise((r) => { child.once('exit', r); child.kill(); });
      child = startProcess(env, log);
      await waitUp(base);
    },
    async stop() {
      if (child.exitCode === null) await new Promise((r) => { child.once('exit', r); child.kill(); });
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* leave it */ }
    }
  };
  return srv;
}
module.exports = { start, request, EMAIL, PASSWORD };
