# DocPules

Doctor session analytics for My Clinic / CareBlock. Reads the Master Schedules
and Daily Capacity workbooks and works out, per doctor and per branch, how many
sessions were due, run, blocked and paid.

The reading and the arithmetic still happen in the browser, as they always did.
What lives on the server is the data that has to outlast a browser tab:

| In the database | Why |
|---|---|
| Schedule change history | A doctor who joined on 15 September must not be counted from the 1st, and the month you closed today must read the same next year |
| The portal's own master schedule, versioned | So the portal can run with no workbook loaded, and a past month can be rebuilt |
| Shared settings — rules, holidays, hours per session, colour key | Two people reading different rules off the same workbook is how the numbers used to disagree |
| The uploaded workbooks | Nobody has to hunt for the file again |
| Users, sessions, and an audit trail | Everyone who signs in may change the schedule, so the trail is the only record of who did |

---

## Running it

Needs **Node 20 or newer**. Node 22+ is better: it has SQLite built in, so there
is no native module to compile.

### The database driver

Two are supported and the first that works is used, so this installs on a
machine with no compiler:

- **better-sqlite3** — faster, and what this was written against. It is a native
  module, so it needs a prebuilt binary for your exact Node version and platform,
  or build tools. It is an *optional* dependency: if the build fails, `npm
  install` still succeeds.
- **node:sqlite** — built into Node 22 and newer. Needs nothing. Used
  automatically when better-sqlite3 is not there.

The server prints which one it is using on startup. Both have been tested
against the full flow, including transactions and backups; there is no
difference in behaviour, only in speed.

```bash
npm install
cp .env.example .env
# put a long random secret in .env:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

npm run adduser       # the first account; it has to be an administrator
npm start             # http://localhost:3000
```

For local testing over plain `http://`, set `INSECURE_COOKIES=1` in `.env`,
otherwise the browser will not keep the login cookie. **Never set that in
production.**

### Everyday commands

```bash
npm start                         # run the portal
npm run adduser                   # add a user, interactively
npm run adduser -- --list         # who exists
npm run adduser -- --password-reset --email someone@example.com
npm run backup                    # a consistent copy of the database
npm run backup -- /mnt/backups    # ...somewhere else
```

---

## Your four requirements

### Only reachable from your addresses

Put them in `ALLOW_IPS`, comma separated. Single addresses or CIDR ranges, IPv4
or IPv6:

```
ALLOW_IPS=203.0.113.4,203.0.113.0/24,2001:db8::/32
```

The gate runs **before everything, including the login page**, so an address you
have not named never gets as far as a password prompt. Leaving `ALLOW_IPS` empty
allows any address — do that only while testing. The server prints which rule
set is live when it starts, so you can see at a glance whether the gate is on.

If the app sits behind a reverse proxy or a platform load balancer (Railway,
Render, Nginx, Cloudflare), set `TRUST_PROXY=1` so the real client address is
read from `X-Forwarded-For` rather than the proxy's own. **Only set it when there
really is a proxy** — otherwise a request can claim any address it likes.

A caveat worth knowing: most office internet connections have a dynamic public
address that changes without notice, and mobile data will not be on your list at
all. If you want to work from outside the clinic, a VPN into the clinic network
is steadier than chasing addresses.

### A secure server

The app speaks plain HTTP and expects **TLS to be terminated in front of it**.
Do not expose it directly. Either:

- put it behind Nginx or Caddy with a certificate (Caddy gets one from Let's
  Encrypt by itself), or
- deploy to a platform that terminates TLS for you, and set `TRUST_PROXY=1`.

What the app does itself: passwords hashed with scrypt, login sessions as rows
in the database (so switching a user off or changing a password ends their
sessions everywhere, immediately), `HttpOnly` `Secure` `SameSite=Lax` cookies
signed with your secret, a login rate limit per address, `nosniff`,
`X-Frame-Options: DENY`, and no stack traces in responses.

What it deliberately does not do: no password reset by email (an administrator
resets it), and no two-factor authentication. If you want either, say so and
they can be added.

### Adding users

Three roles:

| Role | Can do |
|---|---|
| **admin** | Everything, plus add and remove users and read the audit trail |
| **editor** | Read everything, record schedule changes, upload workbooks, change shared settings |
| **viewer** | Read only. The server refuses their writes; the portal tells them so |

The first account is created with `npm run adduser`, or from `ADMIN_EMAIL` and
`ADMIN_PASSWORD` where there is no terminal, because there is nobody to sign in
as yet. After that, an administrator adds people on the **Users** page in the
portal — name, email, password, role, and they are in.

The page only appears for administrators, and the server refuses everyone else
regardless of what the page shows: a hidden button is not a permission.

The server will not let you demote or switch off the last remaining
administrator, which is the one mistake that would lock everybody out.

**Switching someone off** rather than deleting them is how to handle a leaver.
Their sessions end immediately on every device, they cannot sign in, and their
name stays on every schedule change they recorded — which is the point of having
accounts at all.

### Permanent storage

Everything is in **one SQLite file**, `data/docpules.db`, plus the uploaded
workbooks under `data/files/`. A backup is a file copy, and `npm run backup` uses
SQLite's own backup API so it is safe to run while people are using the portal.

**The one thing that will cost you your data:** on a platform like Railway or
Render, the container filesystem is wiped on every deploy. `DATA_DIR` **must**
point at a mounted persistent volume. Check this before you put real data in.

Back the database up on a schedule and keep the copies somewhere else. It holds
your schedule history, and that is the one thing nothing else can reconstruct —
the workbooks only ever show the present.

---

## Deploying

### A small VM (recommended — most control, least surprise)

```bash
git clone <your repo> /opt/docpules && cd /opt/docpules
npm ci --omit=dev
cp .env.example .env     # fill it in; DATA_DIR=/var/lib/docpules
mkdir -p /var/lib/docpules
```

Run it under systemd so it comes back after a reboot:

```ini
# /etc/systemd/system/docpules.service
[Unit]
Description=DocPules
After=network.target

[Service]
WorkingDirectory=/opt/docpules
ExecStart=/usr/bin/node server/index.js
Restart=always
User=docpules
EnvironmentFile=/opt/docpules/.env

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable --now docpules
```

Then Caddy in front, which handles the certificate on its own:

```
docpules.yourdomain.sa {
    reverse_proxy localhost:3000
}
```

…and set `TRUST_PROXY=1`.

### Railway / Render

Set these variables before the first deploy:

| Variable | Value | Why |
|---|---|---|
| `SESSION_SECRET` | a long random string | Without it one is generated, and everyone is signed out on every deploy |
| `DATA_DIR` | the volume's mount path, e.g. `/data` | **Attach a volume first.** Without one the database is erased on every deploy |
| `TRUST_PROXY` | `1` | The platform's router sits in front, so the real client address arrives in a header |
| `ADMIN_EMAIL` · `ADMIN_PASSWORD` | your first account | There is no terminal to run `npm run adduser` in. Created once, only while no accounts exist |
| `ALLOW_IPS` | your addresses | Leave unset until you have signed in once and know it works |

Leave `PORT` alone — the platform sets it.

Then: **Settings → Networking → Generate Domain**. Until you do, the service
shows as *Unexposed* and there is no address to open, even when it is running
perfectly.

Once you are in: change the password, then delete `ADMIN_PASSWORD` — a password
set this way has been visible in the dashboard. Add `ALLOW_IPS` last, and keep
`TRUST_PROXY=1` with it, or the list sees the router's address instead of yours
and refuses everybody.

**Node version.** `package.json` and `.nvmrc` ask for Node 22, which has SQLite
built in. On Node 20 the only driver is the native one, and if its build fails
the service cannot start.

### A forgotten password, with no terminal

Setting `ADMIN_PASSWORD` on its own never overwrites an existing account — that
would mean anyone who can edit a variable could silently take one over. To reset
it deliberately, set all three and restart:

```
ADMIN_EMAIL      the account's address
ADMIN_PASSWORD   the new password, 10 characters or more
ADMIN_RESET      1
```

The log confirms the reset and says every device has been signed out. **Then
delete `ADMIN_RESET` and `ADMIN_PASSWORD`** — otherwise the reset runs again on
every restart and the password sits readable in your dashboard.

Once you are in, change it properly on the **Schedule changes** page: the
Storage card has a *Change password* button, and that route asks for the current
password first.

### When it will not start

The log says why, in words, as the first thing it prints. The three that
actually happen:

- **`Cannot write to DATA_DIR`** — the volume is not mounted where `DATA_DIR`
  points.
- **`No SQLite driver could be opened`** — Node 20 with a failed native build.
  Move to Node 22.
- **Starts, but nobody can reach it** — either no domain has been generated, or
  `ALLOW_IPS` is set without `TRUST_PROXY=1`. The startup log warns about the
  second.

`/health` answers `ok` without a login and is the one route in front of the IP
gate, so a platform health check never trips it.

### Moving to Postgres later

Every query lives in `server/db.js`. Rewriting that one file is the whole job;
nothing else in the server knows what the database is. Worth doing if you ever
want several server instances at once — SQLite is one file and expects one
writer, which is exactly right for a handful of users and wrong for a fleet.

---

## What is in the repo

```
server/index.js    the HTTP app and every endpoint
server/db.js       the schema and every query — the only file that touches SQLite
server/auth.js     the IP gate, password hashing, sessions, roles
server/adduser.js  create users and reset passwords from the command line
server/backup.js   a consistent database copy
public/docpules.html   the portal itself
public/login.html      the sign-in page
data/              the database and the uploaded workbooks — git-ignored
```

### Never commit

`.gitignore` already excludes them, but to be explicit: **`data/` and `.env`
must not go into the repository.** The database holds your schedule history and
password hashes; `.env` holds the secret that signs every login cookie. If you
ever push either by accident, treat the secret as burned, generate a new one, and
remember that git history keeps the old copy until you rewrite it.

---

## The API

Everything needs a signed-in session except `/health`.

| | |
|---|---|
| `POST /api/login` · `POST /api/logout` · `GET /api/me` | signing in |
| `GET /api/bootstrap?year=2026` | what the portal asks for on load: the records, the shared settings, which workbooks are stored |
| `GET /api/changes?year=2026` | every record for the year, withdrawn ones included |
| `POST /api/changes` | one record, or an array of up to 500 (all or nothing) |
| `POST /api/changes/:id/revoke` | withdraw a record |
| `GET /api/schedule?year=2026` · `PUT /api/schedule` · `GET /api/schedule/:id` | the portal's own master schedule, and its earlier versions |
| `GET /api/settings` · `PUT /api/settings` | the shared settings |
| `GET /api/files` · `GET /api/files/latest/:kind` · `POST /api/files/:kind` | the workbooks (`master` or `capacity`) |
| `GET /api/audit` | who did what (admin only) |

### Two rules the API keeps

**A schedule change is never updated and never deleted.** Withdrawing one sets
`void_at` and records who did it; the row stays. This is what makes a closed
month reproducible, and it is the reason this data belongs in a database rather
than in a browser.

**Every record carries its own id**, so the same record arriving twice — a
retry, a queued write sent again, two people loading the same backup — is
recognised and ignored rather than written twice.

---

## Working offline

The portal keeps the year's records in memory and reads them synchronously,
because the arithmetic runs once per doctor per day and cannot wait on the
network. A change you record is applied on screen at once, then sent. If the
server cannot be reached the write waits in a queue that survives a reload, the
Schedule changes page shows how many are waiting and says the server is
unreachable, and the queue drains by itself when it comes back. It does not
pretend to have saved something it has not.

## Without a server at all

`public/docpules.html` still works opened straight from disk — it falls back to
browser storage and the export file, exactly as it did before. Useful for a
quick look at a workbook on a laptop. Just remember that records made that way
live in that browser only.
