import { randomBytes, createHash } from 'node:crypto';
export function createSessions(db, {
  clock = Date.now,
  idleMs = 7 * 86400000,
  absoluteMs = 30 * 86400000,
  secure = false
} = {}) {
  const columns = new Set(db.prepare('PRAGMA table_info(sessions)').all().map(c => c.name));
  for (const column of ['created_at', 'last_seen', 'expires_at']) {
    if (!columns.has(column)) db.exec(`ALTER TABLE sessions ADD COLUMN ${column} INTEGER NOT NULL DEFAULT 0`);
  }
  const now = clock();
  db.prepare('UPDATE sessions SET created_at=?,last_seen=?,expires_at=? WHERE expires_at=0').run(now, now, now + absoluteMs);
  const hash = token => createHash('sha256').update(token).digest('hex');
  const cookie = token => `studentos=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${token ? Math.floor(absoluteMs / 1000) : 0}${secure ? '; Secure' : ''}`;
  function create(profileId) {
    const token = randomBytes(32).toString('hex'),
      time = clock();
    db.prepare('INSERT INTO sessions(token,profile_id,created_at,last_seen,expires_at) VALUES(?,?,?,?,?)').run(hash(token), profileId, time, time, time + absoluteMs);
    return cookie(token);
  }
  function identity(rawCookie = '') {
    const token = /(?:^|;\s*)studentos=([^;]+)/.exec(rawCookie)?.[1];
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const key = hash(token),
      session = db.prepare('SELECT * FROM sessions WHERE token=?').get(key),
      time = clock();
    if (!session) return null;
    if (session.expires_at <= time || session.last_seen + idleMs <= time) {
      db.prepare('DELETE FROM sessions WHERE token=?').run(key);
      return null;
    }
    const row = db.prepare('SELECT document FROM profiles WHERE id=?').get(session.profile_id);
    if (!row || JSON.parse(row.document).profile.suspended) {
      revokeAll(session.profile_id);
      return null;
    }
    if (time - session.last_seen > 60000) db.prepare('UPDATE sessions SET last_seen=? WHERE token=?').run(time, key);
    return session.profile_id;
  }
  function end(rawCookie = '') {
    const token = /(?:^|;\s*)studentos=([^;]+)/.exec(rawCookie)?.[1];
    if (token) db.prepare('DELETE FROM sessions WHERE token=?').run(hash(token));
    return cookie('');
  }
  function revokeAll(profileId) {
    db.prepare('DELETE FROM sessions WHERE profile_id=?').run(profileId);
  }
  function list(profileId) {
    return db.prepare('SELECT created_at,last_seen,expires_at FROM sessions WHERE profile_id=? AND expires_at>? ORDER BY last_seen DESC').all(profileId, clock());
  }
  function cleanup() {
    db.prepare('DELETE FROM sessions WHERE expires_at<=? OR last_seen<=?').run(clock(), clock() - idleMs);
  }
  return {
    create,
    identity,
    end,
    revokeAll,
    list,
    cleanup
  };
}
