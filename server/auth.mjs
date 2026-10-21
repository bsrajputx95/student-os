import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
export function passwordHash(password, salt = randomBytes(16).toString('hex')) {
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}
export function passwordMatches(password, stored) {
  try {
    const [salt, key] = stored.split(':');
    const actual = scryptSync(password, salt, 64),
      expected = Buffer.from(key, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
export function createAuth(db) {
  db.exec('CREATE TABLE IF NOT EXISTS credentials(profile_id TEXT PRIMARY KEY,password_hash TEXT NOT NULL); CREATE TABLE IF NOT EXISTS login_attempts(key TEXT PRIMARY KEY,failures INTEGER,blocked_until INTEGER);');
  const protectedProfile = id => !!db.prepare('SELECT profile_id FROM credentials WHERE profile_id=?').get(id);
  function setPassword(id, password, hash) {
    db.prepare('INSERT OR IGNORE INTO credentials VALUES(?,?)').run(id, hash || passwordHash(password));
  }
  function login(handle, password, address = 'local') {
    const name = String(handle || '').trim().toLowerCase(),
      key = address + ':' + name,
      attempt = db.prepare('SELECT * FROM login_attempts WHERE key=?').get(key);
    if (attempt?.blocked_until > Date.now()) {
      const e = new Error('Too many attempts. Try again in a few minutes.');
      e.status = 429;
      throw e;
    }
    const row = db.prepare('SELECT p.id,c.password_hash FROM profiles p JOIN credentials c ON p.id=c.profile_id WHERE lower(p.handle)=?').get(name);
    if (!row || !passwordMatches(String(password || ''), row.password_hash)) {
      const n = (attempt?.failures || 0) + 1;
      db.prepare('INSERT INTO login_attempts VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET failures=excluded.failures,blocked_until=excluded.blocked_until').run(key, n, n >= 8 ? Date.now() + 300000 : 0);
      const e = new Error('Username or password is incorrect.');
      e.status = 401;
      throw e;
    }
    const document = JSON.parse(db.prepare('SELECT document FROM profiles WHERE id=?').get(row.id).document);
    if (document.profile.suspended) {
      const error = new Error('This account is suspended. Contact your college administrator.');
      error.status = 403;
      throw error;
    }
    db.prepare('DELETE FROM login_attempts WHERE key=?').run(key);
    return row.id;
  }
  function replacePassword(id, password) {
    db.prepare('INSERT INTO credentials VALUES(?,?) ON CONFLICT(profile_id) DO UPDATE SET password_hash=excluded.password_hash').run(id, passwordHash(password));
  }
  return {
    protectedProfile,
    setPassword,
    replacePassword,
    login
  };
}
