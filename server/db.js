'use strict';
/* ---------------------------------------------------------------------------
   The database.

   SQLite, in one file, under DATA_DIR. For a few users and a few thousand
   schedule records that is the right size of tool: nothing to administer, and
   a backup is a file copy. Every query lives in this module, so moving to
   Postgres later means rewriting this file and nothing else.

   The one rule that matters here: a schedule change is never updated and never
   deleted. A withdrawal sets void_at. That is what makes a month you closed in
   September still read the same next year, and it is the whole reason this data
   is in a database rather than in a browser.
   --------------------------------------------------------------------------- */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/* ------------------------------------------------------------------- driver

   Two ways to reach SQLite, and the first one that works is used.

   better-sqlite3 is faster and is what this was written against, but it is a
   native module: it needs a prebuilt binary for your exact Node version and
   platform, or a working compiler. When neither is there the install fails,
   which is a miserable way to meet a deployment.

   Node 22 ships SQLite in the standard library, so the fallback needs nothing
   at all. The shim below gives it the same small surface this file uses, which
   is why nothing downstream has to care which one is in play. */
const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');

function dbPath() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.mkdirSync(path.join(DATA_DIR, 'files'), { recursive: true });
  } catch (e) {
    console.error('\n  Cannot write to DATA_DIR (' + DATA_DIR + '): ' + e.message + '\n' +
      '  On a platform this usually means the volume is not mounted there.\n' +
      '  Point DATA_DIR at the mount path, or the database cannot be created.\n');
    throw e;
  }
  return path.join(DATA_DIR, 'docpules.db');
}

let db, DRIVER;
try {
  const Database = require('better-sqlite3');
  DRIVER = 'better-sqlite3';
  db = makeBetter(Database);
} catch (e) {
  try {
    DRIVER = 'node:sqlite';
    db = makeBuiltin();
  } catch (e2) {
    console.error('\n  No SQLite driver could be opened.\n' +
      '    better-sqlite3: ' + e.message + '\n' +
      '    node:sqlite:    ' + e2.message + '\n\n' +
      '  Running on Node ' + process.versions.node + '.\n\n' +
      (parseInt(process.versions.node, 10) < 22
        ? '  SQLite is only built into Node 22 and newer, so on this version the\n' +
          '  native better-sqlite3 module is the only option and it is not there.\n' +
          '  Either move to Node 22+ (the repo asks for it in package.json and\n' +
          '  .nvmrc) or make sure npm install builds better-sqlite3.\n'
        : '  Both drivers are unavailable, which usually means the message above\n' +
          '  is about the database file or DATA_DIR rather than the driver.\n'));
    process.exit(1);
  }
}

function makeBetter(Database) {
  const raw = new Database(dbPath());
  /* WAL lets a reader and a writer work at once, which matters as soon as two
     coordinators have the portal open. */
  raw.pragma('journal_mode = WAL');
  raw.pragma('foreign_keys = ON');
  raw.pragma('busy_timeout = 5000');
  return raw;
}

function makeBuiltin() {
  /* The built-in module is flagged experimental and says so on every start.
     The warning is noise in a server log, not information, so it is dropped —
     and only that one. */
  const onWarn = (w) => { if (!/SQLite is an experimental/.test(String(w.message))) console.warn(w); };
  process.removeAllListeners('warning');
  process.on('warning', onWarn);

  const { DatabaseSync } = require('node:sqlite');
  const raw = new DatabaseSync(dbPath());
  raw.exec('PRAGMA journal_mode = WAL');
  raw.exec('PRAGMA foreign_keys = ON');
  raw.exec('PRAGMA busy_timeout = 5000');

  /* The shape the rest of this file expects. The only things missing from the
     built-in module are transaction() and backup(), and both are small. */
  return {
    builtin: true,
    exec: (sql) => raw.exec(sql),
    prepare: (sql) => raw.prepare(sql),
    close: () => raw.close(),
    /* better-sqlite3 hands back a function you call; same here, and a throw
       still rolls the whole thing back */
    transaction(fn) {
      return function (...args) {
        raw.exec('BEGIN');
        try { const out = fn(...args); raw.exec('COMMIT'); return out; }
        catch (err) { try { raw.exec('ROLLBACK'); } catch (e) {} throw err; }
      };
    },
    /* VACUUM INTO writes a consistent copy while the database is in use, which
       is the property that matters: copying a WAL database with cp can produce
       a file that will not open. */
    backup(target) {
      return new Promise((resolve, reject) => {
        try {
          fs.mkdirSync(path.dirname(target), { recursive: true });
          if (fs.existsSync(target)) fs.unlinkSync(target);
          raw.exec("VACUUM INTO '" + String(target).replace(/'/g, "''") + "'");
          resolve({ totalPages: 0, remainingPages: 0 });
        } catch (e) { reject(e); }
      });
    }
  };
}

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL DEFAULT '',
  pass_hash  TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'editor',   -- admin | editor | viewer
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  ip         TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

-- Append-only. A withdrawal sets void_at; nothing is ever UPDATEd otherwise
-- and nothing is ever DELETEd.
CREATE TABLE IF NOT EXISTS changes (
  id          TEXT PRIMARY KEY,
  year        INTEGER NOT NULL,
  doc_key     TEXT NOT NULL,          -- empId|site|nameKey, as the portal keys a line
  kind        TEXT NOT NULL,          -- day | from | to
  day         INTEGER,                -- 0=Sunday .. 6=Saturday, for kind=day
  sessions    REAL,
  hours       REAL,
  from_date   TEXT NOT NULL DEFAULT '',   -- YYYY-MM-DD, when it took effect
  to_date     TEXT NOT NULL DEFAULT '',
  note        TEXT NOT NULL DEFAULT '',
  recorded_at TEXT NOT NULL,              -- when somebody wrote it down
  recorded_by TEXT NOT NULL DEFAULT '',
  void_at     TEXT NOT NULL DEFAULT '',
  void_by     TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS changes_year ON changes(year);
CREATE INDEX IF NOT EXISTS changes_doc  ON changes(doc_key);

-- The portal's own copy of the master schedule, versioned. A new version is
-- inserted; the old ones stay, so a past month can always be rebuilt.
CREATE TABLE IF NOT EXISTS schedules (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  year      INTEGER NOT NULL,
  body      TEXT NOT NULL,            -- JSON: the lines, as the portal stores them
  lines     INTEGER NOT NULL DEFAULT 0,
  saved_at  TEXT NOT NULL,
  saved_by  TEXT NOT NULL DEFAULT '',
  note      TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS schedules_year ON schedules(year, id);

-- Shared settings: rules, holidays, hours per session, colour key. Everything
-- the portal used to keep per-browser and that should be the same for everyone.
CREATE TABLE IF NOT EXISTS settings (
  k          TEXT PRIMARY KEY,
  body       TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

-- The workbooks, kept so nobody has to hunt for the file again.
CREATE TABLE IF NOT EXISTS files (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL,          -- master | capacity
  name        TEXT NOT NULL,
  bytes       INTEGER NOT NULL,
  sha256      TEXT NOT NULL DEFAULT '',
  stored_as   TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  uploaded_by TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS files_kind ON files(kind, id);

-- Who did what. Everyone who logs in may change the schedule, so this is the
-- only record of who did.
CREATE TABLE IF NOT EXISTS audit (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  at     TEXT NOT NULL,
  who    TEXT NOT NULL DEFAULT '',
  ip     TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS audit_at ON audit(at);
`);

const nowISO = () => new Date().toISOString();
const newId = (p) => p + crypto.randomBytes(9).toString('hex');

/* ------------------------------------------------------------------ passwords
   scrypt from the standard library. No dependency, and the parameters are
   stored alongside the hash so they can be raised later without invalidating
   existing passwords. */
function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const N = 16384, r = 8, p = 1, len = 64;
  const key = crypto.scryptSync(plain, salt, len, { N, r, p, maxmem: 64 * 1024 * 1024 });
  return ['scrypt', N, r, p, salt.toString('base64'), key.toString('base64')].join('$');
}
function verifyPassword(plain, stored) {
  try {
    const [alg, N, r, p, saltB64, keyB64] = String(stored).split('$');
    if (alg !== 'scrypt') return false;
    const salt = Buffer.from(saltB64, 'base64');
    const want = Buffer.from(keyB64, 'base64');
    const got = crypto.scryptSync(plain, salt, want.length,
      { N: +N, r: +r, p: +p, maxmem: 64 * 1024 * 1024 });
    return crypto.timingSafeEqual(want, got);
  } catch { return false; }
}

/* ---------------------------------------------------------------------- users */
const Users = {
  all() {
    return db.prepare(
      `SELECT id,email,name,role,active,created_at,created_by FROM users ORDER BY name,email`
    ).all();
  },
  byEmail(email) {
    return db.prepare(`SELECT * FROM users WHERE email=? COLLATE NOCASE`).get(String(email).trim());
  },
  byId(id) {
    return db.prepare(
      `SELECT id,email,name,role,active,created_at,created_by FROM users WHERE id=?`
    ).get(id);
  },
  count() { return db.prepare(`SELECT COUNT(*) n FROM users`).get().n; },
  create({ email, name, password, role, by }) {
    const e = String(email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('That is not an email address.');
    if (String(password || '').length < 10)
      throw new Error('Use at least 10 characters for the password.');
    if (Users.byEmail(e)) throw new Error('Somebody already has that email address.');
    const id = newId('u');
    db.prepare(`INSERT INTO users (id,email,name,pass_hash,role,active,created_at,created_by)
                VALUES (?,?,?,?,?,1,?,?)`)
      .run(id, e, String(name || '').trim(), hashPassword(password),
           ['admin', 'editor', 'viewer'].includes(role) ? role : 'editor', nowISO(), by || '');
    return Users.byId(id);
  },
  setActive(id, active) {
    db.prepare(`UPDATE users SET active=? WHERE id=?`).run(active ? 1 : 0, id);
    if (!active) db.prepare(`DELETE FROM sessions WHERE user_id=?`).run(id);
    return Users.byId(id);
  },
  setRole(id, role) {
    if (!['admin', 'editor', 'viewer'].includes(role)) throw new Error('Unknown role.');
    db.prepare(`UPDATE users SET role=? WHERE id=?`).run(role, id);
    return Users.byId(id);
  },
  setPassword(id, password) {
    if (String(password || '').length < 10)
      throw new Error('Use at least 10 characters for the password.');
    db.prepare(`UPDATE users SET pass_hash=? WHERE id=?`).run(hashPassword(password), id);
    /* every other device has to sign in again */
    db.prepare(`DELETE FROM sessions WHERE user_id=?`).run(id);
  },
  remove(id) { db.prepare(`DELETE FROM users WHERE id=?`).run(id); }
};

/* ------------------------------------------------------------------- sessions */
const DAY = 86400000;
const Sessions = {
  create(userId, ip, days = 14) {
    const token = crypto.randomBytes(32).toString('base64url');
    db.prepare(`INSERT INTO sessions (token,user_id,created_at,expires_at,ip) VALUES (?,?,?,?,?)`)
      .run(token, userId, nowISO(), new Date(Date.now() + days * DAY).toISOString(), ip || '');
    return token;
  },
  user(token) {
    if (!token) return null;
    const row = db.prepare(
      `SELECT s.token, s.expires_at, u.id, u.email, u.name, u.role, u.active
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token = ?`).get(token);
    if (!row) return null;
    if (new Date(row.expires_at).getTime() < Date.now() || !row.active) {
      Sessions.drop(token);
      return null;
    }
    return { id: row.id, email: row.email, name: row.name, role: row.role };
  },
  drop(token) { if (token) db.prepare(`DELETE FROM sessions WHERE token=?`).run(token); },
  sweep() { db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(nowISO()); }
};

/* -------------------------------------------------------------------- changes */
const num = (v) => (v === null || v === undefined || v === '' || isNaN(+v) ? null : +v);
const YMD = /^\d{4}-\d{2}-\d{2}$/;

const Changes = {
  /* Everything for a year, withdrawn rows included, because the portal shows
     them greyed rather than hiding that they ever existed. */
  list(year) {
    return db.prepare(
      `SELECT * FROM changes WHERE year=? ORDER BY from_date, recorded_at`).all(+year);
  },
  add(rec, who) {
    const kind = ['day', 'from', 'to'].includes(rec.kind) ? rec.kind : 'day';
    const from = YMD.test(String(rec.from || '')) ? rec.from : '';
    const to = YMD.test(String(rec.to || '')) ? rec.to : '';
    if (kind === 'to' ? !to : !from)
      throw new Error('A change needs the date it takes effect.');
    const year = +String(from || to).slice(0, 4);
    if (!(year > 1900 && year < 2200)) throw new Error('That date could not be read.');
    if (!String(rec.key || '').trim()) throw new Error('A change needs a doctor.');

    let day = null, sessions = null, hours = null;
    if (kind === 'day') {
      day = num(rec.day);
      if (day === null || day < 0 || day > 6) throw new Error('A weekday change needs a weekday.');
      sessions = num(rec.sessions);
      if (sessions === null || sessions < 0) sessions = 0;
      hours = num(rec.hours);
      if (hours !== null && hours <= 0) hours = null;
    }
    const id = String(rec.id || '').trim() || newId('c');
    /* An id that is already here means the same record arriving twice — a retry,
       or a second person loading the same backup. Keep the first. */
    if (db.prepare(`SELECT 1 FROM changes WHERE id=?`).get(id)) return { id, duplicate: true };

    db.prepare(`INSERT INTO changes
      (id,year,doc_key,kind,day,sessions,hours,from_date,to_date,note,recorded_at,recorded_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, year, String(rec.key).trim(), kind, day, sessions, hours, from, to,
           String(rec.note || '').slice(0, 500),
           String(rec.at || '') || nowISO(), String(rec.by || who || ''));
    return { id, duplicate: false };
  },
  /* Withdrawal is a mark, not a delete: the history still shows the record was
     there and who took it back out. */
  revoke(id, who) {
    const row = db.prepare(`SELECT * FROM changes WHERE id=?`).get(id);
    if (!row) throw new Error('No such record.');
    if (row.void_at) return row;
    db.prepare(`UPDATE changes SET void_at=?, void_by=? WHERE id=?`).run(nowISO(), who || '', id);
    return db.prepare(`SELECT * FROM changes WHERE id=?`).get(id);
  },
  count(year) {
    return db.prepare(`SELECT COUNT(*) n FROM changes WHERE year=? AND void_at=''`).get(+year).n;
  }
};

/* ------------------------------------------------------------------ schedules */
const Schedules = {
  latest(year) {
    return db.prepare(
      `SELECT * FROM schedules WHERE year=? ORDER BY id DESC LIMIT 1`).get(+year);
  },
  versions(year) {
    return db.prepare(
      `SELECT id,year,lines,saved_at,saved_by,note FROM schedules
        WHERE year=? ORDER BY id DESC`).all(+year);
  },
  get(id) { return db.prepare(`SELECT * FROM schedules WHERE id=?`).get(+id); },
  /* A new version is inserted, never an update, so last month's schedule is
     still there after this month's edit. */
  save(year, body, who, note) {
    const json = JSON.stringify(body);
    const lines = (body && body.lines && body.lines.length) || 0;
    const prev = Schedules.latest(year);
    /* The portal stamps the schedule with the moment it was captured, so two
       identical schedules differ by that timestamp alone. Comparing the lines
       instead is what stops a new version being written on every page load. */
    if (prev && sameSchedule(prev.body, json)) return prev;
    const info = db.prepare(
      `INSERT INTO schedules (year,body,lines,saved_at,saved_by,note) VALUES (?,?,?,?,?,?)`)
      .run(+year, json, lines, nowISO(), who || '', String(note || '').slice(0, 300));
    return Schedules.get(info.lastInsertRowid);
  }
};

/* Two stored schedules are the same schedule when their lines match, whatever
   the capture timestamp or the file name on them says. */
function sameSchedule(aJson, bJson) {
  try {
    const a = JSON.parse(aJson), b = JSON.parse(bJson);
    return JSON.stringify({ l: a.lines, g: a.legend }) ===
           JSON.stringify({ l: b.lines, g: b.legend });
  } catch { return aJson === bJson; }
}

/* ------------------------------------------------------------------- settings */
const Settings = {
  all() {
    const out = {};
    db.prepare(`SELECT k,body FROM settings`).all().forEach((r) => {
      try { out[r.k] = JSON.parse(r.body); } catch { /* a bad row must not stop the rest */ }
    });
    return out;
  },
  get(k) {
    const r = db.prepare(`SELECT body FROM settings WHERE k=?`).get(k);
    if (!r) return undefined;
    try { return JSON.parse(r.body); } catch { return undefined; }
  },
  put(k, value, who) {
    db.prepare(`INSERT INTO settings (k,body,updated_at,updated_by) VALUES (?,?,?,?)
                ON CONFLICT(k) DO UPDATE SET body=excluded.body,
                  updated_at=excluded.updated_at, updated_by=excluded.updated_by`)
      .run(k, JSON.stringify(value === undefined ? null : value), nowISO(), who || '');
  }
};

/* ---------------------------------------------------------------------- files */
const Files = {
  latest(kind) {
    /* by upload time: ids are random, so ordering by id picked an older file */
    return db.prepare(`SELECT * FROM files WHERE kind=? ORDER BY uploaded_at DESC, rowid DESC LIMIT 1`).get(kind);
  },
  list(kind, limit = 20) {
    return db.prepare(
      `SELECT id,kind,name,bytes,sha256,uploaded_at,uploaded_by FROM files
        WHERE kind=? ORDER BY uploaded_at DESC LIMIT ?`).all(kind, limit);
  },
  get(id) { return db.prepare(`SELECT * FROM files WHERE id=?`).get(id); },
  add({ kind, name, buf, who }) {
    if (!['master', 'capacity'].includes(kind)) throw new Error('Unknown file kind.');
    const sha = crypto.createHash('sha256').update(buf).digest('hex');
    /* the same workbook uploaded again is the same workbook */
    const same = db.prepare(`SELECT * FROM files WHERE kind=? AND sha256=?`).get(kind, sha);
    if (same) {
      /* uploading an older workbook again makes it the current one again */
      db.prepare(`UPDATE files SET uploaded_at=?, uploaded_by=?, name=? WHERE id=?`)
        .run(nowISO(), who || '', String(name || same.name).slice(0, 200), same.id);
      return Files.get(same.id);
    }
    const id = newId('f');
    const stored = id + '.xlsx';
    fs.writeFileSync(path.join(DATA_DIR, 'files', stored), buf);
    db.prepare(`INSERT INTO files (id,kind,name,bytes,sha256,stored_as,uploaded_at,uploaded_by)
                VALUES (?,?,?,?,?,?,?,?)`)
      .run(id, kind, String(name || 'workbook.xlsx').slice(0, 200), buf.length, sha, stored,
           nowISO(), who || '');
    return Files.get(id);
  },
  path(row) { return path.join(DATA_DIR, 'files', row.stored_as); }
};

/* ---------------------------------------------------------------------- audit */
const Audit = {
  add(who, ip, action, detail) {
    db.prepare(`INSERT INTO audit (at,who,ip,action,detail) VALUES (?,?,?,?,?)`)
      .run(nowISO(), who || '', ip || '', action, String(detail || '').slice(0, 1000));
  },
  recent(limit = 200) {
    return db.prepare(`SELECT * FROM audit ORDER BY id DESC LIMIT ?`).all(limit);
  }
};

module.exports = {
  db, DRIVER, DATA_DIR, nowISO, newId,
  hashPassword, verifyPassword,
  Users, Sessions, Changes, Schedules, Settings, Files, Audit
};
