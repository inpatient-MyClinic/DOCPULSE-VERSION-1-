'use strict';
/* ---------------------------------------------------------------------------
   DocPules server.

   Serves the portal and the small API behind it. The portal itself still does
   all the reading and arithmetic in the browser, exactly as it did before; what
   moved to the server is the data that has to outlive a browser tab: the
   schedule change history, the portal's own master schedule, the shared
   settings, the workbooks, and who is allowed in.

   Start it with:  npm start
   --------------------------------------------------------------------------- */

const fs = require('fs');
const path = require('path');
const express = require('express');

/* .env, read without a dependency */
(function loadEnv() {
  const f = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(f)) return;
  fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) return;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  });
})();

const DB = require('./db');
const { Users, Sessions, Changes, Schedules, Settings, Files, Audit } = DB;
const A = require('./auth');

const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', true);

/* The health check is the one thing in front of the gate. A platform probes it
   from inside its own network, so an address list would fail every probe and
   the service would be restarted for ever. It says 'ok' and nothing else. */
app.get('/health', (req, res) => res.type('text/plain').send('ok\n'));

/* Everything else is behind the gate, including the login page. */
app.use(A.ipGuard);

/* A workbook is a few megabytes; the JSON bodies are small. */
app.use(express.json({ limit: '4mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '64mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
app.use(A.attach);

const api = express.Router();
const ok = (res, body) => res.json(body === undefined ? { ok: true } : body);
function guard(fn) {                       /* one place to turn a throw into 400 */
  return (req, res) => {
    try { fn(req, res); }
    catch (e) {
      console.error(req.method, req.path, '-', e.message);
      if (!res.headersSent) res.status(400).json({ error: e.message || 'That did not work.' });
    }
  };
}
const who = (req) => (req.user ? (req.user.name || req.user.email) : '');

/* What the sign-in page needs to know before anybody has signed in: whether an
   account exists at all, and if not, why not. It says nothing about any real
   account, and it sits behind the IP gate like everything else. Without it an
   unconfigured portal just repeats "those details did not match an account"
   with no way to find out that the details were never set. */
api.get('/setup', guard((req, res) => {
  const n = Users.count();
  ok(res, {
    users: n,
    needsSetup: n === 0,
    /* a problem worth showing even when an account exists, because a reset that
       quietly did nothing looks exactly like a wrong password */
    note: n === 0 ? (SETUP_NOTE || 'No account has been created yet.') : SETUP_NOTE,
    emailHint: String(process.env.ADMIN_EMAIL || '').trim()
  });
}));

/* ------------------------------------------------------------------- sign in */
api.post('/login', guard(A.login));
api.post('/logout', guard(A.logout));
api.get('/me', guard((req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
  ok(res, {
    user: req.user,
    ipRestricted: A.ALLOW.length > 0,
    counts: {
      users: Users.count(),
      changes: Changes.count(new Date().getFullYear())
    }
  });
}));

/* --------------------------------------------------------------------- users */
api.get('/users', A.requireUser, A.isAdmin, guard((req, res) => ok(res, { users: Users.all() })));

api.post('/users', A.requireUser, A.isAdmin, guard((req, res) => {
  const u = Users.create({ ...req.body, by: who(req) });
  Audit.add(who(req), req.clientIp, 'user.create', u.email + ' as ' + u.role);
  ok(res, { user: u });
}));

api.post('/users/:id/role', A.requireUser, A.isAdmin, guard((req, res) => {
  /* An admin must not be able to lock every admin out of the portal. */
  const target = Users.byId(req.params.id);
  if (!target) throw new Error('No such user.');
  if (target.role === 'admin' && req.body.role !== 'admin') {
    const admins = Users.all().filter((u) => u.role === 'admin' && u.active).length;
    if (admins <= 1) throw new Error('That is the last administrator — make somebody else an administrator first.');
  }
  const u = Users.setRole(req.params.id, req.body.role);
  Audit.add(who(req), req.clientIp, 'user.role', u.email + ' -> ' + u.role);
  ok(res, { user: u });
}));

api.post('/users/:id/active', A.requireUser, A.isAdmin, guard((req, res) => {
  const target = Users.byId(req.params.id);
  if (!target) throw new Error('No such user.');
  if (!req.body.active && target.role === 'admin') {
    const admins = Users.all().filter((u) => u.role === 'admin' && u.active).length;
    if (admins <= 1) throw new Error('That is the last administrator — you would lock everyone out.');
  }
  const u = Users.setActive(req.params.id, !!req.body.active);
  Audit.add(who(req), req.clientIp, 'user.active', u.email + ' -> ' + (u.active ? 'on' : 'off'));
  ok(res, { user: u });
}));

api.post('/users/:id/password', A.requireUser, guard((req, res) => {
  /* your own password, or anyone's if you are an administrator */
  const mine = req.user.id === req.params.id;
  if (!mine && req.user.role !== 'admin')
    return res.status(403).json({ error: 'You can only change your own password.' });
  if (mine) {
    const self = Users.byEmail(req.user.email);
    if (!DB.verifyPassword(String(req.body.current || ''), self.pass_hash))
      throw new Error('Your current password did not match.');
  }
  Users.setPassword(req.params.id, String(req.body.password || ''));
  Audit.add(who(req), req.clientIp, 'user.password', mine ? 'own' : req.params.id);
  ok(res);
}));

/* ------------------------------------------------------------------- changes
   The portal holds every record for the year in memory and reads it
   synchronously, so this endpoint hands over the whole year in one go. */
api.get('/changes', A.requireUser, guard((req, res) => {
  const year = +(req.query.year || new Date().getFullYear());
  ok(res, { year, rows: Changes.list(year).map(toPortal) });
}));

api.post('/changes', A.requireUser, A.canWrite, guard((req, res) => {
  const recs = Array.isArray(req.body) ? req.body : [req.body];
  if (recs.length > 500) throw new Error('Too many records in one go.');
  const added = [], dup = [];
  /* All or nothing: a half-written batch would be worse than a rejected one. */
  DB.db.transaction(() => {
    recs.forEach((r) => {
      const out = Changes.add(r, who(req));
      (out.duplicate ? dup : added).push(out.id);
    });
  })();
  if (added.length) Audit.add(who(req), req.clientIp, 'change.add', added.join(','));
  ok(res, { added: added.length, duplicates: dup.length, ids: added });
}));

api.post('/changes/:id/revoke', A.requireUser, A.canWrite, guard((req, res) => {
  const row = Changes.revoke(req.params.id, who(req));
  Audit.add(who(req), req.clientIp, 'change.revoke', req.params.id);
  ok(res, { row: toPortal(row) });
}));

/* the database columns, in the shape the portal already works with */
function toPortal(r) {
  const out = {
    id: r.id, key: r.doc_key, kind: r.kind,
    from: r.from_date || '', to: r.to_date || '',
    note: r.note || '', at: r.recorded_at, by: r.recorded_by || ''
  };
  if (r.kind === 'day') {
    out.day = r.day;
    out.sessions = r.sessions;
    if (r.hours !== null && r.hours !== undefined) out.hours = r.hours;
  }
  if (r.void_at) { out.void = r.void_at; out.voidBy = r.void_by || ''; }
  return out;
}

/* ------------------------------------------------------- the portal schedule */
api.get('/schedule', A.requireUser, guard((req, res) => {
  const year = +(req.query.year || new Date().getFullYear());
  const row = Schedules.latest(year);
  if (!row) return ok(res, { year, schedule: null, versions: [] });
  ok(res, {
    year,
    schedule: JSON.parse(row.body),
    savedAt: row.saved_at, savedBy: row.saved_by, lines: row.lines,
    versions: Schedules.versions(year)
  });
}));

api.put('/schedule', A.requireUser, A.canWrite, guard((req, res) => {
  const year = +(req.body.year || new Date().getFullYear());
  if (!req.body.schedule) throw new Error('No schedule in that request.');
  const row = Schedules.save(year, req.body.schedule, who(req), req.body.note);
  Audit.add(who(req), req.clientIp, 'schedule.save', year + ' v' + row.id + ' (' + row.lines + ' lines)');
  ok(res, { version: row.id, savedAt: row.saved_at, lines: row.lines });
}));

api.get('/schedule/:id', A.requireUser, guard((req, res) => {
  const row = Schedules.get(req.params.id);
  if (!row) return res.status(404).json({ error: 'No such version.' });
  ok(res, { year: row.year, schedule: JSON.parse(row.body), savedAt: row.saved_at, savedBy: row.saved_by });
}));

/* ------------------------------------------------------------------ settings
   The rules, the holiday list, hours per session, the colour key. These used to
   live per-browser, which is why two people could read different numbers off
   the same workbook. */
api.get('/settings', A.requireUser, guard((req, res) => ok(res, { settings: Settings.all() })));

/* PUT is the method; POST is accepted too, because a browser holding an older
   copy of the page sends POST, and a shared setting that silently fails to save
   is worse than a tidy route list. */
const saveSettings = guard((req, res) => {
  const body = req.body && req.body.settings;
  if (!body || typeof body !== 'object') throw new Error('No settings in that request.');
  const keys = Object.keys(body);
  if (keys.length > 100) throw new Error('Too many settings at once.');
  DB.db.transaction(() => { keys.forEach((k) => Settings.put(k, body[k], who(req))); })();
  Audit.add(who(req), req.clientIp, 'settings.put', keys.join(','));
  ok(res, { saved: keys.length });
});
api.put('/settings', A.requireUser, A.canWrite, saveSettings);
api.post('/settings', A.requireUser, A.canWrite, saveSettings);

/* --------------------------------------------------------------------- files
   The workbooks, kept so the portal can load the last ones by itself. Sent as
   a raw body with the name in the query, which keeps a multipart parser out of
   the dependency list. */
api.get('/files', A.requireUser, guard((req, res) => ok(res, {
  master: Files.list('master'),
  capacity: Files.list('capacity')
})));

api.get('/files/latest/:kind', A.requireUser, guard((req, res) => {
  const row = Files.latest(req.params.kind);
  if (!row) return res.status(404).json({ error: 'Nothing uploaded yet.' });
  sendFile(res, row);
}));

api.get('/files/:id', A.requireUser, guard((req, res) => {
  const row = Files.get(req.params.id);
  if (!row) return res.status(404).json({ error: 'No such file.' });
  sendFile(res, row);
}));

function sendFile(res, row) {
  const p = Files.path(row);
  if (!fs.existsSync(p))
    return res.status(410).json({ error: 'That file is recorded but missing from disk.' });
  res.setHeader('Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition',
    'attachment; filename="' + row.name.replace(/[^\w.\- ]+/g, '_') + '"');
  res.setHeader('X-File-Name', encodeURIComponent(row.name));
  res.setHeader('X-File-Id', row.id);
  fs.createReadStream(p).pipe(res);
}

api.post('/files/:kind', A.requireUser, A.canWrite, guard((req, res) => {
  if (!Buffer.isBuffer(req.body) || !req.body.length)
    throw new Error('Send the workbook as the request body, with Content-Type: application/octet-stream.');
  const row = Files.add({
    kind: req.params.kind,
    name: String(req.query.name || 'workbook.xlsx'),
    buf: req.body, who: who(req)
  });
  Audit.add(who(req), req.clientIp, 'file.upload', req.params.kind + ' ' + row.name);
  ok(res, { file: { id: row.id, kind: row.kind, name: row.name, bytes: row.bytes, uploadedAt: row.uploaded_at } });
}));

/* --------------------------------------------------------------------- audit */
api.get('/audit', A.requireUser, A.isAdmin, guard((req, res) =>
  ok(res, { rows: Audit.recent(+(req.query.limit || 200)) })));

/* ------------------------------------------------------- everything in one go
   What the portal asks for on boot, so a cold start is a single request. */
api.get('/bootstrap', A.requireUser, guard((req, res) => {
  const year = +(req.query.year || new Date().getFullYear());
  const sched = Schedules.latest(year);
  ok(res, {
    user: req.user,
    year,
    changes: Changes.list(year).map(toPortal),
    settings: Settings.all(),
    schedule: sched ? { lines: sched.lines, savedAt: sched.saved_at, savedBy: sched.saved_by } : null,
    files: { master: Files.latest('master') || null, capacity: Files.latest('capacity') || null }
  });
}));

app.use('/api', api);

/* ------------------------------------------------------------------ the page */
const PUB = path.join(__dirname, '..', 'public');

/* The portal is only served to somebody signed in; otherwise the sign-in page.
   It is one HTML file, and the browser must not hold a stale copy of it after a
   deploy, hence no-store. */
app.get('/', (req, res) => {
  if (!req.user) return res.sendFile(path.join(PUB, 'login.html'));
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(PUB, 'docpules.html'));
});
app.get('/login', (req, res) => res.sendFile(path.join(PUB, 'login.html')));
app.use(express.static(PUB, { index: false, maxAge: '1h' }));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'No such endpoint.' });
  res.status(404).type('text/plain').send('Not found\n');
});

/* --------------------------------------------------- the first administrator
   On a platform there is no terminal to run `npm run adduser` in, so the first
   account can come from environment variables instead. It is created once, only
   while there are no users at all, and the variables can be deleted afterwards.
   Change the password as soon as you are in: a password set this way has been
   visible in your platform's dashboard. */
let SETUP_NOTE = '';
function seedAdmin() {
  const email = String(process.env.ADMIN_EMAIL || '').trim();
  const pass = String(process.env.ADMIN_PASSWORD || '');
  if (!email && !pass) {
    SETUP_NOTE = 'ADMIN_EMAIL and ADMIN_PASSWORD are not set, so no account could be created.';
    return;
  }
  if (Users.count() > 0) {
    /* The way back in when the password is lost and there is no terminal to
       run a reset in. It is deliberately explicit: setting a password alone
       never overwrites an existing account, ADMIN_RESET=1 has to be set too. */
    if (/^(1|true|yes|on)$/i.test(String(process.env.ADMIN_RESET || '').trim())) {
      const u = Users.byEmail(email);
      if (!u) {
        SETUP_NOTE = 'ADMIN_RESET is set, but no account has the address ' + email +
          '. The accounts that do exist: ' + Users.all().map((x) => x.email).join(', ');
        console.error('  ' + SETUP_NOTE + '\n');
        return;
      }
      try {
        Users.setPassword(u.id, pass);
        if (u.role !== 'admin') Users.setRole(u.id, 'admin');
        if (!u.active) Users.setActive(u.id, true);
        Audit.add('environment', '', 'user.password', u.email + ' reset via ADMIN_RESET');
        console.log('  Password reset for ' + u.email + ', and the account is an active administrator.');
        console.log('  Every signed-in device has been signed out.');
        console.log('  NOW DELETE ADMIN_RESET and ADMIN_PASSWORD, or the reset runs again\n' +
                    '  on every restart and the password stays visible in your dashboard.\n');
      } catch (e) {
        SETUP_NOTE = 'ADMIN_PASSWORD was rejected, so the password was NOT changed: ' + e.message;
        console.error('  ' + SETUP_NOTE + '\n');
      }
      return;
    }
    if (process.env.ADMIN_RESET !== undefined && String(process.env.ADMIN_RESET).trim() !== '') {
      SETUP_NOTE = 'ADMIN_RESET is set to "' + String(process.env.ADMIN_RESET).trim() +
        '", which is not recognised. Set it to 1 to reset the password.';
      console.log('  ' + SETUP_NOTE + '\n');
      return;
    }
    console.log('  ADMIN_EMAIL is set but accounts already exist, so it was ignored.');
    console.log('  Delete that variable, and ADMIN_PASSWORD with it.');
    console.log('  To reset a forgotten password instead, set ADMIN_RESET=1 and restart.\n');
    return;
  }
  if (!email || !pass) {
    SETUP_NOTE = 'Only one of ADMIN_EMAIL and ADMIN_PASSWORD is set. Both are needed.';
    console.error('  ' + SETUP_NOTE + '\n');
    return;
  }
  try {
    const u = Users.create({ email, name: String(process.env.ADMIN_NAME || '').trim(),
      password: pass, role: 'admin', by: 'environment' });
    Audit.add('environment', '', 'user.create', u.email + ' as admin (first run)');
    SETUP_NOTE = '';
    console.log('  Created the first administrator: ' + u.email);
    console.log('  Sign in with ' + u.email + ' and the password in ADMIN_PASSWORD.');
    console.log('  Then change it and delete ADMIN_PASSWORD.\n');
  } catch (e) {
    SETUP_NOTE = 'ADMIN_PASSWORD was rejected: ' + e.message;
    console.error('  Could not create the first administrator: ' + e.message + '\n');
  }
}

/* ----------------------------------------------------------------- start up */
const PORT = +(process.env.PORT || 3000);
/* 0.0.0.0 rather than the default, because a platform's router reaches the
   container from outside and a loopback-only bind would look like a crash. */
const HOST = process.env.HOST || '0.0.0.0';
Sessions.sweep();
try { seedAdmin(); } catch (e) { console.error('  ' + e.message); }
setInterval(() => { try { Sessions.sweep(); } catch (e) { /* not worth stopping for */ } },
  6 * 3600 * 1000).unref();

const server = app.listen(PORT, HOST, () => {
  const n = Users.count();
  console.log('\n  DocPules listening on ' + HOST + ':' + PORT);
  console.log('  data        ' + DB.DATA_DIR + '  (' + DB.DRIVER + ')');
  console.log('  IP gate     ' + (A.ALLOW.length
    ? A.ALLOW.map((r) => r.text).join(', ')
    : 'OPEN — every address is allowed, set ALLOW_IPS before this is reachable from outside'));
  if (A.ALLOW.length && process.env.TRUST_PROXY !== '1') {
    console.log('\n  ALLOW_IPS is set but TRUST_PROXY is not.');
    console.log('  Behind a load balancer or reverse proxy every request appears to come');
    console.log('  from the proxy, so the list will reject everyone. If there is a proxy');
    console.log('  in front of this, set TRUST_PROXY=1. If there is not, ignore this.');
  }
  console.log('  users       ' + n);
  if (!n) console.log('\n  No users yet. Create the first administrator with\n' +
    '    npm run adduser\n' +
    '  or, where there is no terminal, set ADMIN_EMAIL and ADMIN_PASSWORD and restart.\n');
  else console.log('');
});

function shutdown() {
  console.log('\n  stopping');
  server.close(() => { try { DB.db.close(); } catch (e) {} process.exit(0); });
  setTimeout(() => process.exit(0), 4000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

/* A crash with no message is the hardest kind to diagnose from a deploy log,
   so anything that escapes says what it was before the process goes. */
process.on('uncaughtException', (e) => {
  console.error('\n  Stopping on an unhandled error: ' + (e && e.message));
  console.error(e && e.stack);
  process.exit(1);
});
process.on('unhandledRejection', (e) => {
  console.error('\n  Unhandled promise rejection: ' + (e && e.message ? e.message : e));
  if (e && e.stack) console.error(e.stack);
});

module.exports = app;
