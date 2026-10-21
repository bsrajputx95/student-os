import { taskLocation } from '../shared/navigation.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createProfile } from '../server/profiles.mjs';
import { applyAction, dateKey } from '../server/model.mjs';
import { quizzes, projects } from '../shared/catalog.js';
import { createSessions } from '../server/sessions.mjs';
test('learning tasks cannot award progress through a generic checkbox', () => {
  for (const kind of ['course', 'coding', 'project', 'quiz', 'interview', 'assessment', 'review']) {
    const s = createProfile({
      name: 'Integrity Student',
      handle: 'integrity-student'
    });
    s.tasks = [{
      id: 'target',
      kind,
      date: dateKey(),
      category: 'Frontend',
      xp: 30,
      status: 'pending'
    }];
    const before = JSON.stringify(s);
    assert.throws(() => applyAction(s, 'task.complete', {
      id: 'target'
    }), /linked activity/);
    assert.equal(JSON.stringify(s), before);
  }
});
test('quiz rewards are bounded by best improvement and practice never overwrites assignment grades', () => {
  const s = createProfile({
      name: 'Quiz Student',
      handle: 'quiz-student'
    }),
    q = quizzes[0];
  s.assignments = ['one', 'two'].map(id => ({
    id,
    kind: 'Quiz',
    quizId: q.id,
    maxPoints: 100,
    status: 'pending'
  }));
  const {
    session
  } = applyAction(s, 'quiz.start', {
    id: q.id,
    assignmentId: 'one'
  });
  const payload = {
    id: q.id,
    answers: q.questions.map(q => q.correct)
  };
  applyAction(s, 'quiz.submit', {
    ...payload,
    assignmentId: 'one',
    sessionId: session.id
  });
  const earned = s.journey.xp,
    skill = s.skills[q.topic];
  for (let i = 0; i < 10; i++) applyAction(s, 'quiz.submit', payload);
  applyAction(s, 'quiz.submit', {
    id: q.id,
    answers: q.questions.map(q => (q.correct + 1) % q.options.length)
  });
  assert.equal(s.journey.xp, earned);
  assert.equal(s.skills[q.topic], skill);
  assert.equal(s.assignments[0].grade, 100);
  assert.equal(s.assignments[1].status, 'pending');
  assert.throws(() => applyAction(s, 'quiz.submit', {
    ...payload,
    assignmentId: 'one',
    sessionId: session.id
  }), /already submitted/);
});
test('project tasks require the exact milestone, not an old step from the same project', () => {
  const s = createProfile({
      name: 'Project Student',
      handle: 'project-student'
    }),
    p = projects[0];
  s.projectProgress[p.id] = [0];
  s.tasks = [{
    id: 'milestone',
    kind: 'project',
    resourceId: p.id,
    step: 1,
    date: dateKey(),
    status: 'pending'
  }];
  applyAction(s, 'project.step', {
    id: p.id,
    step: 0
  });
  assert.equal(s.tasks[0].status, 'pending');
  applyAction(s, 'project.step', {
    id: p.id,
    step: 1
  });
  assert.equal(s.tasks[0].status, 'completed');
});
test('invalid profile types are rejected before any mutation', () => {
  for (const p of [{
    dailyMinutes: '75'
  }, {
    dailyMinutes: NaN
  }, {
    dailyMinutes: 'not-a-number'
  }, {
    weeklyDays: 99
  }, {
    year: 4.5
  }, {
    notifications: 'false'
  }, {
    name: 'Changed',
    track: 'Invalid'
  }]) {
    const s = createProfile({
        name: 'Settings Student',
        handle: 'settings-student'
      }),
      before = JSON.stringify(s);
    assert.throws(() => applyAction(s, 'profile.update', p));
    assert.equal(JSON.stringify(s), before);
  }
});
test('daily quiz navigation preserves the exact assigned quiz resource', () => {
  assert.equal(taskLocation({
    kind: 'quiz',
    resourceId: 'os-fundamentals',
    category: 'Databases'
  }).id, 'os-fundamentals');
});
test('sessions migrate old tables, expire server-side, revoke and reject suspended users', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE sessions(token TEXT PRIMARY KEY,profile_id TEXT);CREATE TABLE profiles(id TEXT PRIMARY KEY,document TEXT);');
  db.prepare('INSERT INTO profiles VALUES(?,?)').run('student', JSON.stringify({
    profile: {
      id: 'student'
    }
  }));
  let time = 1000;
  const sessions = createSessions(db, {
    clock: () => time,
    idleMs: 100,
    absoluteMs: 300,
    secure: true
  });
  const cookie = sessions.create('student');
  assert.match(cookie, /Secure/);
  assert.equal(sessions.identity(cookie), 'student');
  time = 1101;
  assert.equal(sessions.identity(cookie), null);
  const next = sessions.create('student');
  sessions.revokeAll('student');
  assert.equal(sessions.identity(next), null);
  const suspended = sessions.create('student');
  db.prepare('UPDATE profiles SET document=? WHERE id=?').run(JSON.stringify({
    profile: {
      id: 'student',
      suspended: true
    }
  }), 'student');
  assert.equal(sessions.identity(suspended), null);
  db.close();
});
