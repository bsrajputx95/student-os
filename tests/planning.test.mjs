import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile } from '../server/profiles.mjs';
import { ensureDailyPlan, applyAction, dateKey } from '../server/model.mjs';
import { buildPlan, missionFor } from '../shared/journey.js';
import { catalog } from '../shared/catalog.js';
import { diagnosticAction } from '../server/diagnostic.mjs';
import { balanceDay, queueCollegeWork, captureMissedWork } from '../server/planning.mjs';
test('diagnostics hide answer keys, retain drafts and establish a baseline without XP', () => {
  const s = createProfile({
      name: 'Baseline Student',
      handle: 'baseline-student'
    }),
    {
      session
    } = diagnosticAction(s, 'start');
  assert.ok(session.questions.length >= 12);
  assert.equal(session.questions[0].correct, undefined);
  assert.equal(session.questions[0].explanation, undefined);
  const privateSession = s.diagnosticSessions[0],
    answers = privateSession.questions.map(q => q.correct);
  diagnosticAction(s, 'draft', {
    sessionId: session.id,
    answers
  });
  assert.deepEqual(privateSession.answers, answers);
  const result = diagnosticAction(s, 'submit', {
    sessionId: session.id,
    answers
  });
  assert.equal(result.result.overall, 100);
  assert.equal(s.journey.xp, 0);
  assert.equal(s.journey.baseline, 100);
  assert.throws(() => diagnosticAction(s, 'start'), /this week/);
});
test('starting experience and preferred language change the initial learning plan', () => {
  const s = createProfile({
      name: 'Plan Student',
      handle: 'plan-student'
    }),
    j = buildPlan(s.profile, '2026-10-20', {
      days: 150
    });
  const novice = missionFor({
      ...s.profile,
      level: 'I am brand new'
    }, j, 1, catalog),
    advanced = missionFor({
      ...s.profile,
      level: 'Comfortable building things'
    }, j, 1, catalog);
  assert.notEqual(novice.steps[0].resourceId, advanced.steps[0].resourceId);
  const python = missionFor({
    ...s.profile,
    level: 'I am brand new',
    onboardingAnswers: [3, 'Full-stack development', '', 'Python']
  }, j, 1, catalog);
  assert.equal(python.steps.find(t => t.kind === 'course').resourceId, 'python');
});
test('college obligations join the plan without increasing the daily time budget', () => {
  const s = createProfile({
    name: 'Workload Student',
    handle: 'workload-student'
  });
  s.profile.dailyMinutes = 60;
  s.journey = buildPlan(s.profile, '2026-10-20', {
    days: 150
  });
  s.tasks = [];
  s.assignments = [{
    id: 'teacher-task',
    kind: 'Assignment',
    title: 'API explanation',
    teacher: 'A mentor',
    deadline: '2026-10-22',
    status: 'pending',
    subject: 'Web engineering'
  }];
  ensureDailyPlan(s, '2026-10-20');
  const today = s.tasks.filter(t => t.date === '2026-10-20');
  assert.ok(today.some(t => t.kind === 'assignment'));
  assert.ok(today.some(t => t.id.includes('-mission-')));
  assert.equal(today.reduce((n, t) => n + t.minutes, 0), 60);
  ensureDailyPlan(s, '2026-10-20');
  assert.equal(s.tasks.filter(t => t.resourceId === 'teacher-task').length, 1);
});
test('balancing preserves completed work and defers overflow instead of silently exceeding capacity', () => {
  const s = createProfile({
    name: 'Capacity Student',
    handle: 'capacity-student'
  });
  s.profile.dailyMinutes = 30;
  s.tasks = [{
    id: 'done',
    kind: 'course',
    date: '2026-10-20',
    minutes: 20,
    status: 'completed'
  }, {
    id: 'external',
    kind: 'quiz',
    date: '2026-10-20',
    minutes: 20,
    status: 'pending'
  }, {
    id: '2026-10-20-mission-1',
    kind: 'coding',
    date: '2026-10-20',
    minutes: 20,
    status: 'pending'
  }];
  balanceDay(s, '2026-10-20');
  assert.equal(s.tasks.find(t => t.id === 'done').minutes, 20);
  assert.notEqual(s.tasks.find(t => t.id === 'external').date, '2026-10-20');
  assert.equal(s.tasks.filter(t => t.date === '2026-10-20').reduce((n, t) => n + t.minutes, 0), 30);
});
test('missed work remains incomplete and is queued for purposeful catch-up', () => {
  const s = createProfile({
    name: 'Catchup Student',
    handle: 'catchup-student'
  });
  s.tasks = [{
    id: 'missed',
    kind: 'course',
    resourceId: 'sql',
    lesson: 0,
    title: 'Think in tables',
    date: '2026-10-19',
    status: 'pending',
    minutes: 15
  }];
  captureMissedWork(s, '2026-10-20');
  captureMissedWork(s, '2026-10-20');
  assert.equal(s.revisionQueue.length, 1);
  assert.equal(s.tasks[0].status, 'pending');
  s.journey = buildPlan(s.profile, '2026-10-20', {
    days: 150
  });
  ensureDailyPlan(s, '2026-10-20');
  assert.ok(s.tasks.some(t => t.date === '2026-10-20' && t.resourceId === 'sql' && t.lesson === 0));
});
