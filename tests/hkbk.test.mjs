import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { spawn } from 'node:child_process';
import { createAuth, passwordMatches } from '../server/auth.mjs';
import { createCommunity } from '../server/community.mjs';
import { seedHkbk, HKBK_ID } from '../server/hkbk-seed.mjs';
import { createCampusService } from '../server/campus.mjs';
import { metrics, dateKey, applyAction } from '../server/model.mjs';
const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE profiles(id TEXT PRIMARY KEY,handle TEXT UNIQUE,document TEXT)');
const saveProfile = s => db.prepare('INSERT INTO profiles VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document').run(s.profile.id, s.profile.handle, JSON.stringify(s));
const readProfile = id => {
  const r = db.prepare('SELECT document FROM profiles WHERE id=?').get(id);
  return r ? JSON.parse(r.document) : null;
};
const auth = createAuth(db),
  community = createCommunity({
    db,
    broadcastCampus: () => {}
  }),
  campus = createCampusService({
    db,
    readProfile,
    saveProfile,
    onPublished: (a, i) => community.shareItem(a, i)
  });
seedHkbk({
  db,
  auth,
  community,
  readProfile,
  saveProfile
});
test('HKBK seeds exactly 400 students, 100 staff, distinct identities, and balanced year groups', () => {
  const all = db.prepare('SELECT document FROM profiles').all().map(r => JSON.parse(r.document).profile);
  assert.equal(all.length, 500);
  assert.equal(new Set(all.map(p => p.handle)).size, 500);
  for (const year of [1, 2, 3, 4]) assert.equal(all.filter(p => p.role === 'student' && p.year === year).length, 100);
  assert.equal(all.filter(p => p.role !== 'student').length, 100);
  assert.equal(all.filter(p => p.role === 'placement').length, 10);
  assert.ok(all.every(p => p.sampleData && p.collegeId === HKBK_ID));
  assert.ok(all.filter(p => p.role === 'student').every(p => Number.isInteger(p.backlogs) && p.graduationYear === 2031 - p.year && p.academicRecordSource === 'fictional sample campus'));
});
test('Bhavani is a near-complete four-year top candidate with coherent learning and career history', () => {
  const s = readProfile('demo-bhavanisingh'),
    m = metrics(s);
  assert.equal(s.profile.year, 4);
  assert.equal(s.journey.totalDays, 1460);
  assert.equal(s.journey.day, 1438);
  assert.ok(m.readiness >= 98);
  assert.ok(m.solved >= 1400);
  assert.ok(s.activity.length > 1400);
  assert.ok(s.quizAttempts.length >= 150);
  assert.ok(s.applications.some(a => a.status === 'Selected'));
  assert.ok(s.assignments.every(a => a.status === 'graded'));
  assert.ok(s.profile.targetCompanies.length >= 3);
});
test('seeded history contains varied preparation, linked reviews, past/upcoming events, and four years of shared posts', () => {
  const c = community.read(HKBK_ID),
    records = campus.allStudents(HKBK_ID),
    summaries = records.map(metrics),
    college = campus.getCampus(HKBK_ID);
  assert.ok(summaries.some(m => m.readiness < 35));
  assert.ok(summaries.some(m => m.readiness > 90));
  assert.ok(c.posts.length > 1000);
  assert.ok(c.posts.at(0).time < '2023-01-01');
  assert.ok(c.events.some(e => e.date < dateKey()));
  assert.ok(c.events.some(e => e.date > dateKey()));
  assert.equal(college.drives.length, 24);
  assert.ok(college.items.some(i => i.kind === 'Feedback'));
  assert.ok(college.items.some(i => i.kind === 'Announcement'));
  for (const item of college.items) for (const id of item.targetIds) assert.ok(readProfile(id));
});
test('seed is idempotent and never overwrites later student work', () => {
  const s = readProfile('demo-bhavanisingh');
  s.resume.summary = 'A saved student edit.';
  saveProfile(s);
  const before = community.read(HKBK_ID).posts.length;
  seedHkbk({
    db,
    auth,
    community,
    readProfile,
    saveProfile
  });
  assert.equal(readProfile(s.profile.id).resume.summary, 'A saved student edit.');
  assert.equal(community.read(HKBK_ID).posts.length, before);
});
test('updating a full-degree profile preserves its four-year journey', () => {
  const s = readProfile('demo-bhavanisingh');
  applyAction(s, 'profile.update', {
    year: 4,
    bio: 'Final-year preparation.'
  });
  assert.equal(s.journey.totalDays, 1460);
  assert.equal(s.journey.day, 1438);
});
test('passwords are hashed, valid login succeeds, and repeated incorrect attempts are limited', () => {
  const row = db.prepare('SELECT password_hash FROM credentials WHERE profile_id=?').get('demo-bhavanisingh');
  assert.notEqual(row.password_hash, '12345678');
  assert.ok(passwordMatches('12345678', row.password_hash));
  assert.ok(!passwordMatches('wrong-password', row.password_hash));
  assert.equal(auth.login('BHAVANISINGH', '12345678'), 'demo-bhavanisingh');
  for (let i = 0; i < 8; i++) assert.throws(() => auth.login('bhavanisingh', 'incorrect', 'test-client'), /incorrect/);
  assert.throws(() => auth.login('bhavanisingh', '12345678', 'test-client'), /Too many/);
});
test('student and teacher posts, replies, follows and DMs share one college store with private recipients', () => {
  const student = readProfile('demo-bhavanisingh'),
    teacher = readProfile('demo-teacher'),
    other = readProfile('hkbk-student-1-1');
  community.action(student, 'community.post', {
    text: 'A connected campus test.',
    tag: 'Project'
  });
  const post = community.snapshot(teacher).communityPosts.at(-1);
  assert.equal(post.author, student.profile.id);
  community.action(teacher, 'community.comment', {
    id: post.id,
    text: 'Clear explanation. Add one edge case.'
  });
  community.action(teacher, 'community.like', {
    id: post.id
  });
  assert.equal(community.snapshot(student).communityPosts.at(-1).comments[0].author, teacher.profile.id);
  community.action(student, 'community.message', {
    to: teacher.profile.id,
    text: 'A private project question.'
  });
  assert.ok(community.snapshot(teacher).communityMessages.some(m => m.text === 'A private project question.'));
  assert.ok(!community.snapshot(other).communityMessages.some(m => m.text === 'A private project question.'));
  assert.ok(!JSON.stringify(community.snapshot(other)).includes('password_hash'));
});
test('staff announcements join the shared feed only for their reviewed audience; joining events adds a plan step', () => {
  const teacher = readProfile('demo-teacher'),
    student = readProfile('hkbk-student-1-1'),
    other = readProfile('hkbk-student-2-1');
  campus.mutate(teacher, 'item.save', {
    kind: 'Announcement',
    title: 'A targeted college update',
    description: 'Bring your project questions.',
    publish: true,
    audience: {
      scope: 'selected',
      ids: [student.profile.id]
    }
  });
  assert.ok(community.snapshot(student).communityPosts.some(p => p.text.startsWith('A targeted college update')));
  assert.ok(!community.snapshot(other).communityPosts.some(p => p.text.startsWith('A targeted college update')));
  const event = community.read(HKBK_ID).events.find(e => e.date > dateKey());
  community.action(student, 'community.event.register', {
    id: event.id
  });
  community.action(student, 'community.event.register', {
    id: event.id
  });
  assert.equal(student.tasks.filter(t => t.id === 'campus-event-' + event.id).length, 1);
});
test('HTTP password login blocks chooser bypass and registration cannot create a staff account', async () => {
  const child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: '5097',
      STUDENTOS_TEST_DB: 'memory',
      STUDENTOS_SEED_HKBK: '1'
    },
    stdio: 'pipe'
  });
  let output = '';
  child.stderr.on('data', d => output += d);
  try {
    let ready = false;
    for (let i = 0; i < 240; i++) {
      try {
        if ((await fetch('http://127.0.0.1:5097/api/health')).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 50));
    }
    assert.ok(ready, output);
    const call = async (body, cookie, path = 'session') => {
      const res = await fetch('http://127.0.0.1:5097/api/' + path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cookie ? {
            Cookie: cookie
          } : {})
        },
        body: JSON.stringify(body)
      });
      return {
        status: res.status,
        data: await res.json(),
        cookie: res.headers.get('set-cookie')?.split(';')[0]
      };
    };
    assert.equal((await call({
      mode: 'existing',
      id: 'demo-bhavanisingh'
    })).status, 401);
    assert.equal((await call({
      mode: 'staff',
      role: 'teacher'
    })).status, 401);
    assert.equal((await call({
      mode: 'login',
      handle: 'bhavanisingh',
      password: 'incorrect'
    })).status, 401);
    const student = await call({
      mode: 'login',
      handle: 'bhavanisingh',
      password: '12345678'
    });
    assert.equal(student.status, 200);
    assert.equal(student.data.profile.year, 4);
    assert.equal(student.data.communityPeople.length, 500);
    const next = await call({
      mode: 'register',
      name: 'New Student',
      handle: 'new-student-test',
      password: 'a-test-password',
      year: 1,
      role: 'placement'
    });
    assert.equal(next.status, 200);
    assert.equal(next.data.profile.role, 'student');
    assert.equal(next.data.metrics.readiness, 0);
    assert.equal(next.data.journey.totalDays, 1460);
    assert.equal(next.data.profile.onboardingDone, false);
    assert.equal((await call({
      mode: 'login',
      handle: 'new-student-test',
      password: 'a-test-password'
    })).status, 200);
    const res = await fetch('http://127.0.0.1:5097/api/staff', {
      headers: {
        Cookie: next.cookie
      }
    });
    assert.equal(res.status, 403);
  } finally {
    child.kill('SIGTERM');
  }
});
