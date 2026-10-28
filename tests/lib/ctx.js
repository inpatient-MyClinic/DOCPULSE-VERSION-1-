'use strict';
/* What a test case gets from the runner: where the server is, how to sign in,
   where the workbooks are, where to write, and a way to say pass or fail. */
const fs = require('fs');
const path = require('path');
const E = process.env;
const OUT = E.DP_OUT || path.join(__dirname, '..', '.out');
fs.mkdirSync(OUT, { recursive: true });
let failed = 0, passed = 0;
const T = {
  base: E.DP_BASE || 'http://localhost:3112',
  email: E.DP_EMAIL || 'test@docpules.local',
  password: E.DP_PASSWORD || 'test-password-123',
  cookie: E.DP_COOKIE_FILE ? fs.readFileSync(E.DP_COOKIE_FILE, 'utf8').trim() : '',
  chrome: E.CHROME_PATH || undefined,
  SP: (E.DP_FIXTURES || path.join(__dirname, '..', 'fixtures')) + '/',
  OUT: OUT + '/',
  fixture: (n) => path.join(E.DP_FIXTURES || path.join(__dirname, '..', 'fixtures'), n),
  out: (n) => path.join(OUT, n),
  /* a named check: printed as ✓ or ✗, and any ✗ fails the test */
  check(label, cond, detail) {
    if (cond) passed++; else failed++;
    console.log((cond ? '  ✓ ' : '  ✗ ') + label + (!cond && detail !== undefined ? '  — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''));
    return !!cond;
  },
  /* page errors collected by a browser test: none allowed */
  noErrors(errs, where) { return T.check('no page errors' + (where ? ' (' + where + ')' : ''), !errs || !errs.length, errs); },
  /* sign a Playwright page in */
  async login(p) {
    await p.goto(T.base + '/login.html');
    await p.fill('#email', T.email); await p.fill('#password', T.password);
    await p.click('#go'); await p.waitForURL('**/');
  },
  /* ask the runner to stop and start the server on the same database */
  restartServer() {
    return new Promise((res, rej) => {
      if (!process.send) return rej(new Error('restart needs the test runner'));
      const on = (m) => { if (m && m.restarted) { process.off('message', on); res(); } };
      process.on('message', on);
      process.send({ restart: true });
    });
  },
  done() { process.exit(failed ? 1 : 0); },
  get failed() { return failed; }
};
module.exports = T;
