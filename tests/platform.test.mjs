import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { migrateDatabase, indexProgress } from '../server/database.mjs';
import { createAccounts } from '../server/accounts.mjs';
import { createAuth } from '../server/auth.mjs';
import { createSessions } from '../server/sessions.mjs';
import { createJobs } from '../server/jobs.mjs';
import { createProfile } from '../server/profiles.mjs';
import { createInterviewService } from '../server/interview.mjs';
import { loadConfig } from '../server/config.mjs';
function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE profiles(id TEXT PRIMARY KEY,handle TEXT UNIQUE,document TEXT);CREATE TABLE sessions(token TEXT PRIMARY KEY,profile_id TEXT);');
  migrateDatabase(db);
  const save = s => {
    db.prepare('INSERT INTO profiles VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document').run(s.profile.id, s.profile.handle, JSON.stringify(s));
    indexProgress(db, s);
  };
  const read = id => {
    const row = db.prepare('SELECT document FROM profiles WHERE id=?').get(id);
    return row ? JSON.parse(row.document) : null;
  };
  const admin = createProfile({
    name: 'Admin Person',
    handle: 'college-admin',
    college: 'Test College'
  });
  Object.assign(admin.profile, {
    role: 'admin',
    collegeId: 'test',
    email: 'admin@example.com',
    onboardingDone: true
  });
  save(admin);
  const student = createProfile({
    name: 'Student Person',
    handle: 'college-student',
    college: 'Test College'
  });
  Object.assign(student.profile, {
    role: 'student',
    collegeId: 'test',
    email: 'student@example.com'
  });
  save(student);
  const auth = createAuth(db),
    sessions = createSessions(db),
    queued = [];
  auth.setPassword(student.profile.id, 'original-password');
  const config = {
    origin: 'https://college.example',
    mailConfigured: true,
    production: false
  };
  const accounts = createAccounts({
    db,
    read,
    save,
    auth,
    sessions,
    config,
    enqueue: job => queued.push(job)
  });
  return {
    db,
    save,
    read,
    admin,
    student,
    auth,
    sessions,
    accounts,
    queued,
    config
  };
}
test('versioned migrations are repeatable and normalized evidence is idempotent', () => {
  const f = fixture();
  migrateDatabase(f.db);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get().n, 6);
  f.student.progressEvents = [{
    id: 'event',
    key: 'lesson:one',
    kind: 'lesson',
    resourceId: 'one',
    skill: 'Frontend',
    score: 100,
    verification: 'server-checked',
    time: new Date().toISOString()
  }];
  f.save(f.student);
  f.save(f.student);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM progress_events').get().n, 1);
  f.db.close();
});
test('roster previews validate all records without creating invitations and reject duplicate recipients', () => {
  const f = fixture();
  try {
    const csv = 'email,role,department\nnew-student@example.test,student,Computer Science\nnew-faculty@example.test,teacher,Electronics';
    const preview = f.accounts.importRoster(f.admin, {
      csv,
      preview: true
    });
    assert.equal(preview.rows.length, 2);
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM account_tokens').get().n, 0);
    const result = f.accounts.importRoster(f.admin, {
      csv
    });
    assert.equal(result.invitations.length, 2);
    assert.equal(f.queued.length, 2);
    assert.throws(() => f.accounts.importRoster(f.student, {
      csv,
      preview: true
    }), /role/);
    assert.throws(() => f.accounts.importRoster(f.admin, {
      csv: 'email,role\nrepeat@example.test,student\nrepeat@example.test,teacher'
    }), /Duplicate/);
  } finally {
    f.db.close();
  }
});
test('staff invitations are authorized, role-bound, expiring one-use credentials', () => {
  const f = fixture();
  assert.throws(() => f.accounts.invite(f.student, {
    role: 'teacher',
    email: 'mentor@example.com'
  }), /role/);
  const invitation = f.accounts.invite(f.admin, {
      role: 'teacher',
      email: 'mentor@example.com',
      department: 'Computing'
    }),
    token = new URL(invitation.url).searchParams.get('token');
  assert.equal(f.accounts.inviteInfo(token).role, 'teacher');
  const account = f.accounts.acceptInvite({
    token,
    name: 'Invited Teacher',
    handle: 'invited-teacher',
    password: 'teacher-password',
    role: 'admin'
  });
  assert.equal(account.profile.role, 'teacher');
  assert.equal(account.profile.collegeId, 'test');
  assert.equal(f.auth.login('invited-teacher', 'teacher-password'), account.profile.id);
  assert.throws(() => f.accounts.acceptInvite({
    token,
    name: 'Another User',
    handle: 'another-user',
    password: 'teacher-password'
  }), /invalid or expired/);
  f.db.close();
});
test('recovery avoids account enumeration, rotates the credential and revokes old sessions', () => {
  const f = fixture(),
    cookie = f.sessions.create(f.student.profile.id);
  const known = f.accounts.recover({
      identifier: 'college-student'
    }),
    unknown = f.accounts.recover({
      identifier: 'missing-user'
    });
  assert.deepEqual(known, unknown);
  assert.equal(f.queued.length, 1);
  const token = /token=([a-f0-9]{64})/.exec(f.queued[0].payload.text)[1];
  f.accounts.reset({
    token,
    password: 'replacement-password'
  });
  assert.equal(f.sessions.identity(cookie), null);
  assert.equal(f.auth.login('college-student', 'replacement-password'), f.student.profile.id);
  assert.throws(() => f.accounts.reset({
    token,
    password: 'another-password'
  }), /invalid or expired/);
  f.db.close();
});
test('account operations reject cross-college administration and revoke suspended access', () => {
  const f = fixture(),
    cookie = f.sessions.create(f.student.profile.id);
  assert.throws(() => f.accounts.manage({
    ...f.admin,
    profile: {
      ...f.admin.profile,
      collegeId: 'other'
    }
  }, {
    id: f.student.profile.id,
    operation: 'suspend'
  }), /not found/);
  f.accounts.manage(f.admin, {
    id: f.student.profile.id,
    operation: 'suspend'
  });
  assert.equal(f.sessions.identity(cookie), null);
  assert.throws(() => f.auth.login('college-student', 'original-password'), /suspended/);
  assert.throws(() => f.accounts.manage(f.admin, {
    id: f.admin.profile.id,
    operation: 'suspend'
  }), /another administrator/);
  f.db.close();
});
test('academic corrections require an administrator and validate the entire update before saving', () => {
  const f = fixture();
  try {
    const cookie = f.sessions.create(f.student.profile.id);
    assert.throws(() => f.accounts.manage(f.student, {
      id: f.student.profile.id,
      operation: 'academic',
      cgpa: 9
    }), /role/);
    assert.throws(() => f.accounts.manage(f.admin, {
      id: f.student.profile.id,
      operation: 'academic',
      cgpa: 9,
      backlogs: '0'
    }), /backlogs/);
    assert.equal(f.read(f.student.profile.id).profile.cgpa, undefined);
    f.accounts.manage(f.admin, {
      id: f.student.profile.id,
      operation: 'academic',
      cgpa: 8.6,
      backlogs: 0,
      graduationYear: 2027,
      section: 'A'
    });
    const record = f.read(f.student.profile.id).profile;
    assert.equal(record.cgpa, 8.6);
    assert.equal(record.academicRecordUpdatedBy, f.admin.profile.id);
    assert.equal(f.sessions.identity(cookie), f.student.profile.id);
  } finally {
    f.db.close();
  }
});
test('durable jobs deduplicate reminders and retry failed delivery with backoff', async () => {
  const f = fixture();
  let now = 1000,
    calls = 0;
  const jobs = createJobs({
    ...f,
    clock: () => now,
    broadcast: () => {},
    sendMail: async () => {
      calls++;
      if (calls === 1) throw new Error('Temporary provider outage.');
    }
  });
  jobs.enqueue({
    key: 'one-reminder',
    profileId: f.student.profile.id,
    payload: {
      title: 'Reminder',
      text: 'A useful next step.'
    }
  });
  jobs.enqueue({
    key: 'one-reminder',
    profileId: f.student.profile.id,
    payload: {
      title: 'Duplicate',
      text: 'Should not deliver.'
    }
  });
  jobs.enqueue({
    key: 'mail',
    kind: 'mail',
    payload: {
      to: 'student@example.com',
      subject: 'Example',
      text: 'Message'
    }
  });
  await jobs.tick();
  assert.equal(f.read(f.student.profile.id).notifications.filter(n => n.jobId).length, 1);
  assert.equal(calls, 1);
  now = 32000;
  await jobs.tick();
  assert.equal(calls, 2);
  assert.equal(f.db.prepare("SELECT status FROM jobs WHERE dedupe_key='mail'").get().status, 'done');
  f.db.close();
});
test('interviews persist role-specific prompts, drafts, answers and honest guided feedback', async () => {
  const f = fixture(),
    service = createInterviewService({
      ...f,
      broadcast: () => {}
    });
  let {
    session
  } = await service.action(f.student.profile.id, 'start', {
    role: 'Data analytics',
    round: 'Technical + introduction'
  });
  assert.ok(session.questions.some(q => /Revenue|refunds|dashboard|active-user/.test(q.text)));
  await service.action(f.student.profile.id, 'draft', {
    sessionId: session.id,
    answer: 'A saved draft for a future answer.'
  });
  assert.match(f.read(f.student.profile.id).interviewSessions[0].draft, /saved draft/);
  const firstQuestion = session.questions[0].id;
  while (session.status === 'active') ({
    session
  } = await service.action(f.student.profile.id, 'answer', {
    sessionId: session.id,
    questionId: session.questions[session.responses.length].id,
    answer: 'In my project I built an API because the users needed a reliable way to register. I tested duplicate requests, measured the result and checked the database constraint with a regression test.'
  }));
  assert.equal(session.verification, 'guided-practice');
  assert.equal(session.score, null);
  assert.ok(session.responses.every(r => r.feedback.mode === 'structured-practice'));
  const saved = f.read(f.student.profile.id);
  assert.equal(saved.journey.xp, 40);
  assert.equal(saved.skills.Communication, 0);
  assert.throws(() => f.accounts.manage(f.student, {
    id: f.admin.profile.id,
    operation: 'suspend'
  }), /role/);
  await assert.rejects(service.action(f.student.profile.id, 'answer', {
    sessionId: session.id,
    questionId: firstQuestion,
    answer: 'A duplicate answer should never award additional progress.'
  }), /active interview/);
  f.db.close();
});
test('production configuration requires HTTPS and rejects sample seeding', () => {
  assert.throws(() => loadConfig('.', {
    NODE_ENV: 'production'
  }), /HTTPS/);
  assert.throws(() => loadConfig('.', {
    NODE_ENV: 'production',
    APP_ORIGIN: 'https://college.example',
    STUDENTOS_SEED_HKBK: '1'
  }), /seeding/);
  assert.ok(loadConfig('.', {
    NODE_ENV: 'production',
    APP_ORIGIN: 'https://college.example'
  }).production);
});
