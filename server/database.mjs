export function migrateDatabase(db) {
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY,name TEXT NOT NULL,applied_at TEXT NOT NULL);');
  const migrations = [['identity-and-platform', `
      CREATE TABLE IF NOT EXISTS progress_events(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL,event_key TEXT NOT NULL,kind TEXT NOT NULL,resource_id TEXT,skill TEXT,score REAL,verification TEXT NOT NULL,document TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(profile_id,event_key));
      CREATE INDEX IF NOT EXISTS progress_events_profile_time ON progress_events(profile_id,created_at);
      CREATE TABLE IF NOT EXISTS audit_log(id INTEGER PRIMARY KEY AUTOINCREMENT,actor_id TEXT,college_id TEXT NOT NULL,action TEXT NOT NULL,target_id TEXT,document TEXT NOT NULL,created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS audit_college_time ON audit_log(college_id,created_at);
      CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,profile_id TEXT,dedupe_key TEXT UNIQUE NOT NULL,kind TEXT NOT NULL,due_at INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,payload TEXT NOT NULL,last_error TEXT,updated_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS jobs_due ON jobs(status,due_at);
      CREATE TABLE IF NOT EXISTS account_tokens(token_hash TEXT PRIMARY KEY,kind TEXT NOT NULL,profile_id TEXT,college_id TEXT NOT NULL,document TEXT NOT NULL,expires_at INTEGER NOT NULL,used_at INTEGER);
      CREATE TABLE IF NOT EXISTS rate_limits(bucket TEXT PRIMARY KEY,window_at INTEGER NOT NULL,used INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS content_revisions(id TEXT PRIMARY KEY,college_id TEXT NOT NULL,kind TEXT NOT NULL,document TEXT NOT NULL,created_by TEXT NOT NULL,created_at TEXT NOT NULL);
    `], ['files-and-assessment-records', `
      CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,college_id TEXT NOT NULL,name TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,storage_key TEXT NOT NULL,created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS files_owner ON files(owner_id);
      CREATE TABLE IF NOT EXISTS submissions(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL,assignment_id TEXT NOT NULL,version INTEGER NOT NULL,document TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(profile_id,assignment_id,version));
      CREATE INDEX IF NOT EXISTS submissions_assignment ON submissions(assignment_id,profile_id);
      CREATE TABLE IF NOT EXISTS assessment_runs(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL,resource_id TEXT NOT NULL,verification TEXT NOT NULL,document TEXT NOT NULL,created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS runs_profile ON assessment_runs(profile_id,created_at);
    `], ['attachment-custody-and-question-banks', `
      ALTER TABLE files ADD COLUMN context_kind TEXT NOT NULL DEFAULT 'resource';
      ALTER TABLE files ADD COLUMN context_id TEXT;
      ALTER TABLE files ADD COLUMN deleted_at TEXT;
      CREATE TABLE IF NOT EXISTS question_banks(id TEXT NOT NULL,college_id TEXT NOT NULL,version INTEGER NOT NULL,document TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(id,version));
      CREATE INDEX IF NOT EXISTS question_banks_college ON question_banks(college_id,id);
    `], ['college-challenges', `
      CREATE TABLE IF NOT EXISTS challenges(id TEXT PRIMARY KEY,college_id TEXT NOT NULL,document TEXT NOT NULL,starts_at INTEGER NOT NULL,ends_at INTEGER NOT NULL,created_by TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS challenges_college_window ON challenges(college_id,ends_at,starts_at);
      CREATE TABLE IF NOT EXISTS challenge_sessions(id TEXT PRIMARY KEY,challenge_id TEXT NOT NULL,profile_id TEXT NOT NULL,attempt_number INTEGER NOT NULL,status TEXT NOT NULL,started_at INTEGER NOT NULL,deadline INTEGER NOT NULL,submitted_at INTEGER,score REAL,document TEXT NOT NULL,UNIQUE(challenge_id,profile_id,attempt_number));
      CREATE INDEX IF NOT EXISTS challenge_scores ON challenge_sessions(challenge_id,status,score DESC,submitted_at);
      CREATE INDEX IF NOT EXISTS challenge_sessions_owner ON challenge_sessions(profile_id,challenge_id);
    `], ['searchable-campus-records', `
      CREATE TABLE IF NOT EXISTS memberships(profile_id TEXT PRIMARY KEY,college_id TEXT NOT NULL,role TEXT NOT NULL,year INTEGER,department TEXT,handle TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS membership_cohort ON memberships(college_id,role,year,department);
      CREATE TABLE IF NOT EXISTS community_posts(id TEXT PRIMARY KEY,college_id TEXT NOT NULL,author_id TEXT NOT NULL,created_at TEXT NOT NULL,document TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS community_post_page ON community_posts(college_id,created_at,id);
      CREATE TABLE IF NOT EXISTS community_messages(id TEXT PRIMARY KEY,college_id TEXT NOT NULL,author_id TEXT NOT NULL,recipient_id TEXT NOT NULL,created_at TEXT NOT NULL,document TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS community_message_thread ON community_messages(college_id,recipient_id,author_id,created_at);
      CREATE TABLE IF NOT EXISTS opportunities(id TEXT PRIMARY KEY,source_url TEXT UNIQUE NOT NULL,document TEXT NOT NULL,checked_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS judge_runs(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL,resource_id TEXT NOT NULL,document TEXT NOT NULL,created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS judge_runs_owner ON judge_runs(profile_id,created_at);
    `], ['public-campus-directory', `
      CREATE TABLE IF NOT EXISTS public_members(profile_id TEXT PRIMARY KEY,college_id TEXT NOT NULL,document TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS public_member_college ON public_members(college_id,profile_id);
      CREATE TABLE IF NOT EXISTS support_tickets(id TEXT PRIMARY KEY,college_id TEXT NOT NULL,author_id TEXT NOT NULL,status TEXT NOT NULL,document TEXT NOT NULL,created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS tickets_college_status ON support_tickets(college_id,status,created_at);
    `]];
  migrations.forEach(([name, sql], i) => {
    if (db.prepare('SELECT version FROM schema_migrations WHERE version=?').get(i + 1)) return;
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations VALUES(?,?,?)').run(i + 1, name, new Date().toISOString());
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  });
}
export function indexProgress(db, state) {
  indexMember(db, state.profile);
  db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?,?) ON CONFLICT(profile_id) DO UPDATE SET college_id=excluded.college_id,role=excluded.role,year=excluded.year,department=excluded.department,handle=excluded.handle').run(state.profile.id, state.profile.collegeId || 'independent', state.profile.role || 'student', state.profile.year || null, state.profile.department || null, state.profile.handle);
  const insert = db.prepare('INSERT OR IGNORE INTO progress_events VALUES(?,?,?,?,?,?,?,?,?,?)');
  for (const e of state.progressEvents || []) insert.run(e.id, state.profile.id, e.key, e.kind, e.resourceId || null, e.skill || null, e.score ?? null, e.verification, JSON.stringify(e), e.time);
  const run = db.prepare('INSERT OR IGNORE INTO assessment_runs VALUES(?,?,?,?,?,?)');
  for (const attempt of [...(state.assessmentAttempts || []), ...(state.quizAttempts || []), ...(state.interviewSessions || []).filter(s => s.status === 'completed')]) {
    if (attempt.sample || !attempt.id) continue;
    run.run(attempt.id, state.profile.id, attempt.labId || attempt.quizId || 'interview', attempt.verification || 'practice', JSON.stringify(attempt), attempt.time || attempt.date || new Date().toISOString());
  }
  const submission = db.prepare('INSERT INTO submissions VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document');
  for (const a of state.assignments || []) for (const version of a.versions || []) submission.run(version.id, state.profile.id, a.id, version.version, JSON.stringify(version), version.time);
}
export function indexMember(db, p) {
  const college = p.collegeId || String(p.college || 'Independent student').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const publicProfile = {
    id: p.id,
    name: p.name,
    handle: p.handle,
    role: p.role || 'student',
    designation: p.designation,
    year: p.year,
    department: p.department,
    bio: p.bio || '',
    studentId: p.studentId,
    track: p.track,
    suspended: !!p.suspended,
    enrollmentStatus: p.enrollmentStatus,
    color: ['purple', 'mint', 'blue', 'peach'][p.name.length % 4],
    initials: p.name.replace(/^Dr\. /, '').split(' ').map(n => n[0]).slice(0, 2).join('')
  };
  db.prepare('INSERT INTO public_members VALUES(?,?,?) ON CONFLICT(profile_id) DO UPDATE SET college_id=excluded.college_id,document=excluded.document').run(p.id, college, JSON.stringify(publicProfile));
}
export function createRateLimiter(db, clock = Date.now) {
  return function limit(bucket, max, interval) {
    const now = clock(),
      old = db.prepare('SELECT * FROM rate_limits WHERE bucket=?').get(bucket);
    const count = old && old.window_at + interval > now ? old.used + 1 : 1;
    if (count > max) {
      const error = new Error('Too many requests. Please try again shortly.');
      error.status = 429;
      throw error;
    }
    db.prepare('INSERT INTO rate_limits VALUES(?,?,?) ON CONFLICT(bucket) DO UPDATE SET window_at=excluded.window_at,used=excluded.used').run(bucket, count === 1 ? now : old.window_at, count);
  };
}
export function audit(db, actor, action, targetId, details = {}) {
  db.prepare('INSERT INTO audit_log(actor_id,college_id,action,target_id,document,created_at) VALUES(?,?,?,?,?,?)').run(actor.id, actor.collegeId || actor.college || 'independent', action, targetId || null, JSON.stringify(details), new Date().toISOString());
}
