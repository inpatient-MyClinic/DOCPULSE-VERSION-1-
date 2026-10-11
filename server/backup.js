'use strict';
/* A consistent copy of the database, safe to run while the server is serving.

     npm run backup
     npm run backup -- /path/to/somewhere

   SQLite's own backup API is used rather than cp, because copying a WAL
   database with a writer mid-transaction can produce a file that will not open.
   Keep these somewhere that is not the same disk: this file is your schedule
   history, and it is the one thing nothing else can reconstruct.
*/
const fs = require('fs');
const path = require('path');

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

const { db, DATA_DIR, Changes, Users } = require('./db');

const outDir = path.resolve(process.argv[2] || path.join(DATA_DIR, 'backups'));
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const target = path.join(outDir, 'docpules-' + stamp + '.db');

db.backup(target)
  .then(() => {
    const year = new Date().getFullYear();
    const size = (fs.statSync(target).size / 1048576).toFixed(2);
    console.log('\n  Backed up to ' + target);
    console.log('  ' + size + ' MB · ' + Users.count() + ' users · ' +
      Changes.count(year) + ' live schedule changes in ' + year);
    console.log('\n  Copy it off this machine. A backup on the same disk is not a backup.\n');
    process.exit(0);
  })
  .catch((e) => { console.error('\n  Backup failed: ' + e.message + '\n'); process.exit(1); });
