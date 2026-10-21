import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProfile } from '../server/profiles.mjs';
import { createAuth } from '../server/auth.mjs';
import { migrateDatabase } from '../server/database.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
if (existsSync(resolve(root, '.env'))) process.loadEnvFile(resolve(root, '.env'));
// Read credentials from stdin, never from command arguments or log output.
let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
  if (input.length > 5000) throw new Error('Administrator input is too large.');
}
const p = JSON.parse(input || '{}');
if (typeof p.password !== 'string' || p.password.length < 12 || p.password.length > 128) throw new Error('Use a 12–128 character administrator password.');
if (!p.collegeId || !p.college || !p.email) throw new Error('Provide collegeId, college, name, handle, email and password as JSON on stdin.');
const dataDir = resolve(root, process.env.STUDENTOS_DATA_DIR || 'data');
mkdirSync(dataDir, {
  recursive: true
});
const db = new DatabaseSync(resolve(dataDir, 'studentos.sqlite'));
try {
  db.exec('CREATE TABLE IF NOT EXISTS profiles(id TEXT PRIMARY KEY,handle TEXT UNIQUE NOT NULL,document TEXT NOT NULL);');
  migrateDatabase(db);
  if (db.prepare('SELECT id FROM profiles WHERE lower(handle)=?').get(String(p.handle).toLowerCase())) throw new Error('This username already exists. No account was changed.');
  const s = createProfile({
    name: p.name,
    handle: p.handle,
    college: p.college
  });
  s.profile = {
    ...s.profile,
    role: 'admin',
    collegeId: p.collegeId,
    email: p.email,
    emailVerified: true,
    enrollmentStatus: 'approved',
    onboardingDone: true,
    designation: 'College administrator'
  };
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO profiles VALUES(?,?,?)').run(s.profile.id, s.profile.handle, JSON.stringify(s));
    createAuth(db).setPassword(s.profile.id, p.password);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  console.log('Created college administrator ' + s.profile.handle + '. No sample campus or sample passwords were added.');
} finally {
  db.close();
}
