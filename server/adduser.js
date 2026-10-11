'use strict';
/* Create a user from the command line. This is how the first administrator gets
   in, because there is no way to sign in before one exists.

     npm run adduser
     npm run adduser -- --email wail@example.com --name "Wail" --role admin
     npm run adduser -- --email x@y.com --role viewer --password "..."    (unsafe: it lands in your shell history)

   Run with --list to see who exists, or --password-reset to set a new password.
*/
const fs = require('fs');
const path = require('path');
const readline = require('readline');

(function loadEnv() {
  const f = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(f)) return;
  fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) return;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  });
})();

const { Users } = require('./db');

const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : undefined; };
const has = (n) => argv.includes('--' + n);

if (has('list')) {
  const rows = Users.all();
  if (!rows.length) console.log('\n  No users yet.\n');
  else {
    console.log('');
    rows.forEach((u) => console.log('  ' + (u.active ? ' ' : '(off) ') +
      u.email.padEnd(34) + u.role.padEnd(8) + (u.name || '')));
    console.log('');
  }
  process.exit(0);
}

/* A password typed at a prompt should not appear on screen. */
function ask(q, hidden) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (!hidden) { rl.question(q, (a) => { rl.close(); resolve(a.trim()); }); return; }
    process.stdout.write(q);
    const onData = (ch) => {
      const s = ch.toString();
      if (s === '\n' || s === '\r' || s === '\u0004') {
        process.stdin.removeListener('data', onData);
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        process.stdout.write('\n');
        rl.close();
        resolve(buf);
      } else if (s === '\u0003') { process.stdout.write('\n'); process.exit(1); }
      else if (s === '\u007f' || s === '\b') { buf = buf.slice(0, -1); }
      else { buf += s; }
    };
    let buf = '';
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.on('data', onData);
  });
}

(async () => {
  const reset = has('password-reset');
  let email = arg('email');
  if (!email) email = await ask(reset ? '  Email of the account to reset: ' : '  Email: ');
  if (!email) { console.error('  An email address is needed.'); process.exit(1); }

  if (reset) {
    const u = Users.byEmail(email);
    if (!u) { console.error('  No account with that address.'); process.exit(1); }
    let pw = arg('password') || await ask('  New password (at least 10 characters): ', true);
    const again = arg('password') ? pw : await ask('  Again: ', true);
    if (pw !== again) { console.error('  Those did not match.'); process.exit(1); }
    try { Users.setPassword(u.id, pw); }
    catch (e) { console.error('  ' + e.message); process.exit(1); }
    console.log('\n  Password changed for ' + u.email + '. Every signed-in device will have to sign in again.\n');
    process.exit(0);
  }

  const first = Users.count() === 0;
  let name = arg('name');
  if (name === undefined) name = await ask('  Name: ');
  let role = arg('role');
  if (!role) {
    role = first ? 'admin'
      : (await ask('  Role [admin / editor / viewer] (editor): ') || 'editor');
  }
  if (first && role !== 'admin') {
    console.log('  The first account has to be an administrator, so making this one admin.');
    role = 'admin';
  }
  let pw = arg('password');
  if (!pw) {
    pw = await ask('  Password (at least 10 characters): ', true);
    const again = await ask('  Again: ', true);
    if (pw !== again) { console.error('  Those did not match.'); process.exit(1); }
  }
  try {
    const u = Users.create({ email, name, password: pw, role, by: 'command line' });
    console.log('\n  Created ' + u.email + ' as ' + u.role + '.\n');
    if (first) console.log('  Start the server with  npm start  and sign in.\n');
  } catch (e) { console.error('\n  ' + e.message + '\n'); process.exit(1); }
  process.exit(0);
})();
