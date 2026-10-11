'use strict';
/* ---------------------------------------------------------------------------
   Who is asking, and are they allowed in.

   Two independent gates, and both have to open:

     1. the IP allowlist, which applies to every request including the login
        page, so an address you have not named never gets as far as a password
        prompt;
     2. a signed session cookie.

   Sessions are rows in the database rather than self-contained tokens, so
   switching a user off, or changing their password, ends their sessions
   immediately on every device. A JWT could not do that.
   --------------------------------------------------------------------------- */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Users, Sessions, Audit } = require('./db');

const COOKIE = 'dp_session';
const INSECURE = process.env.INSECURE_COOKIES === '1';

/* The secret that signs login cookies.

   Refusing to start without one is tidy in principle and miserable in practice:
   the first deploy to a platform dies before it logs anything useful, and all
   anyone sees is CRASHED. So if the variable is not set, one is generated and
   kept in DATA_DIR, which makes the portal start and work. It is a real random
   secret, as strong as one you would paste in.

   What it is not is durable. Where DATA_DIR is not a persistent volume the file
   goes with the container, a new secret is generated on the next deploy, and
   everyone is signed out. That is why this warns on every start until the
   variable is set properly. */
const SECRET = (function resolveSecret() {
  const given = String(process.env.SESSION_SECRET || '').trim();
  if (given.length >= 32) return given;
  if (given) {
    console.warn('\n  SESSION_SECRET is set but shorter than 32 characters, so it is being ignored.\n');
  }
  const dir = path.resolve(process.env.DATA_DIR || './data');
  const file = path.join(dir, '.session-secret');
  let secret = '';
  try {
    if (fs.existsSync(file)) secret = fs.readFileSync(file, 'utf8').trim();
  } catch (e) { /* unreadable is the same as absent */ }
  if (secret.length < 32) {
    secret = crypto.randomBytes(48).toString('hex');
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, secret, { mode: 0o600 });
    } catch (e) {
      console.warn('  Could not save the generated secret to ' + file + ' (' + e.message + ').\n' +
        '  The portal will still run, but everyone is signed out whenever it restarts.\n');
    }
  }
  console.warn(
    '\n  ----------------------------------------------------------------\n' +
    '  SESSION_SECRET is not set, so a generated one is being used.\n' +
    '  Everyone is signed out whenever the container is replaced.\n\n' +
    '  Set it as an environment variable to fix that. Generate one with:\n' +
    '    node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"\n' +
    '  ----------------------------------------------------------------\n');
  return secret;
})();

/* ------------------------------------------------------------------- cookies
   The cookie carries the token plus an HMAC of it, so a tampered or invented
   cookie is rejected without touching the database. */
function sign(v) {
  return v + '.' + crypto.createHmac('sha256', SECRET).update(v).digest('base64url');
}
function unsign(raw) {
  const s = String(raw || '');
  const i = s.lastIndexOf('.');
  if (i < 1) return null;
  const v = s.slice(0, i), mac = s.slice(i + 1);
  const want = crypto.createHmac('sha256', SECRET).update(v).digest('base64url');
  const a = Buffer.from(mac), b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return v;
}
function readCookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function setSessionCookie(res, token) {
  const bits = [
    COOKIE + '=' + encodeURIComponent(sign(token)),
    'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=' + 14 * 86400
  ];
  if (!INSECURE) bits.push('Secure');
  res.append('Set-Cookie', bits.join('; '));
}
function clearSessionCookie(res) {
  const bits = [COOKIE + '=', 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (!INSECURE) bits.push('Secure');
  res.append('Set-Cookie', bits.join('; '));
}

/* ------------------------------------------------------------- the IP gate
   Addresses and CIDR ranges, IPv4 and IPv6, compared on the bits rather than
   as text, so 203.0.113.0/24 behaves the way you would expect. */
function ipToBytes(ip) {
  let s = String(ip || '').trim();
  if (s.startsWith('[') && s.endsWith(']')) s = s.slice(1, -1);
  /* ::ffff:203.0.113.4 is an IPv4 address wearing an IPv6 coat */
  const m6 = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (m6) s = m6[1];
  if (/^\d+\.\d+\.\d+\.\d+$/.test(s)) {
    const p = s.split('.').map(Number);
    if (p.some((n) => !(n >= 0 && n <= 255))) return null;
    return Buffer.from(p);
  }
  if (s.includes(':')) {
    let tail = '';
    const m = s.match(/^(.*):(\d+\.\d+\.\d+\.\d+)$/);
    if (m) {                                 /* ...:a.b.c.d  mixed form */
      const v4 = ipToBytes(m[2]); if (!v4) return null;
      tail = [...v4].map((b) => b.toString(16).padStart(2, '0')).join('');
      tail = tail.slice(0, 4) + ':' + tail.slice(4);
      s = m[1] + ':' + tail;
    }
    const halves = s.split('::');
    if (halves.length > 2) return null;
    const head = halves[0] ? halves[0].split(':') : [];
    const rear = halves.length === 2 ? (halves[1] ? halves[1].split(':') : []) : null;
    let groups;
    if (rear === null) { if (head.length !== 8) return null; groups = head; }
    else {
      const fill = 8 - head.length - rear.length;
      if (fill < 0) return null;
      groups = head.concat(Array(fill).fill('0'), rear);
    }
    const out = Buffer.alloc(16);
    for (let i = 0; i < 8; i++) {
      const g = groups[i] === '' ? '0' : groups[i];
      if (!/^[0-9a-f]{1,4}$/i.test(g)) return null;
      const n = parseInt(g, 16);
      out[i * 2] = n >> 8; out[i * 2 + 1] = n & 255;
    }
    return out;
  }
  return null;
}
function parseAllow(spec) {
  return String(spec || '').split(',').map((s) => s.trim()).filter(Boolean).map((entry) => {
    const [addr, bitsRaw] = entry.split('/');
    const bytes = ipToBytes(addr);
    if (!bytes) { console.warn('  ALLOW_IPS: could not read "' + entry + '", ignoring it'); return null; }
    const full = bytes.length * 8;
    const bits = bitsRaw === undefined ? full : parseInt(bitsRaw, 10);
    if (!(bits >= 0 && bits <= full)) {
      console.warn('  ALLOW_IPS: "' + entry + '" has an impossible prefix, ignoring it'); return null;
    }
    return { bytes, bits, text: entry };
  }).filter(Boolean);
}
const ALLOW = parseAllow(process.env.ALLOW_IPS);

function ipAllowed(ip) {
  if (!ALLOW.length) return true;                 /* empty list means open */
  const got = ipToBytes(ip);
  if (!got) return false;
  return ALLOW.some((rule) => {
    if (rule.bytes.length !== got.length) return false;
    let bits = rule.bits, i = 0;
    while (bits >= 8) { if (rule.bytes[i] !== got[i]) return false; i++; bits -= 8; }
    if (bits === 0) return true;
    const mask = 0xff << (8 - bits) & 0xff;
    return (rule.bytes[i] & mask) === (got[i] & mask);
  });
}
function clientIp(req) {
  if (process.env.TRUST_PROXY === '1') {
    const f = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (f) return f;
  }
  return (req.socket && req.socket.remoteAddress) || '';
}
function ipGuard(req, res, next) {
  const ip = clientIp(req);
  req.clientIp = ip;
  if (ipAllowed(ip)) return next();
  /* Say nothing about what exists behind the gate. */
  res.status(403).type('text/plain').send(
    'This portal is restricted to approved network addresses.\n\nYour address: ' + ip + '\n');
}

/* ------------------------------------------------------- login rate limiting
   A small in-memory counter per address. Enough to make guessing passwords
   pointless; it resets when the server restarts, which is fine. */
const tries = new Map();
function tooManyTries(ip) {
  const e = tries.get(ip);
  if (!e) return false;
  if (Date.now() > e.until) { tries.delete(ip); return false; }
  return e.n >= 8;
}
function noteFailure(ip) {
  const e = tries.get(ip) || { n: 0, until: 0 };
  e.n++; e.until = Date.now() + 15 * 60000;
  tries.set(ip, e);
}
function clearFailures(ip) { tries.delete(ip); }

/* ------------------------------------------------------------------ who is it */
function attach(req, res, next) {
  const raw = readCookies(req)[COOKIE];
  const token = raw ? unsign(raw) : null;
  req.sessionToken = token || null;
  req.user = token ? Sessions.user(token) : null;
  next();
}
function requireUser(req, res, next) {
  if (req.user) return next();
  res.status(401).json({ error: 'Please sign in.' });
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) return next();
    res.status(403).json({
      error: 'Your account does not have permission for that.',
      need: roles, have: req.user ? req.user.role : null
    });
  };
}
/* viewer may read; editor and admin may write */
const canWrite = requireRole('admin', 'editor');
const isAdmin = requireRole('admin');

function login(req, res) {
  const ip = req.clientIp || clientIp(req);
  const { email, password } = req.body || {};
  if (tooManyTries(ip)) {
    Audit.add(String(email || ''), ip, 'login.blocked', 'too many attempts');
    return res.status(429).json({ error: 'Too many attempts. Try again in fifteen minutes.' });
  }
  const u = email ? Users.byEmail(email) : null;
  /* One message for a wrong address and a wrong password, so neither can be
     used to find out which accounts exist. */
  if (!u || !u.active || !require('./db').verifyPassword(String(password || ''), u.pass_hash)) {
    noteFailure(ip);
    Audit.add(String(email || ''), ip, 'login.failed', '');
    return res.status(401).json({ error: 'Those details did not match an account.' });
  }
  clearFailures(ip);
  const token = Sessions.create(u.id, ip);
  setSessionCookie(res, token);
  Audit.add(u.email, ip, 'login', '');
  res.json({ user: { id: u.id, email: u.email, name: u.name, role: u.role } });
}
function logout(req, res) {
  if (req.sessionToken) Sessions.drop(req.sessionToken);
  clearSessionCookie(res);
  if (req.user) Audit.add(req.user.email, req.clientIp, 'logout', '');
  res.json({ ok: true });
}

module.exports = {
  ipGuard, attach, requireUser, requireRole, canWrite, isAdmin,
  login, logout, clientIp, ipAllowed, ipToBytes, parseAllow,
  ALLOW, setSessionCookie, clearSessionCookie
};
