import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile } from '../server/profiles.mjs';
import { metrics, applyAction, recordAssessment } from '../server/model.mjs';
import { getLesson } from '../shared/curriculum.js';
import { catalog } from '../shared/catalog.js';
test('self-reported effort cannot manufacture evidence-based readiness', () => {
  const s = createProfile({
    name: 'Evidence Student',
    handle: 'evidence-student'
  });
  s.skills = Object.fromEntries(Object.keys(s.skills).map(k => [k, 100]));
  assert.equal(metrics(s).readiness, 0);
  for (const problem of catalog.problems.filter(p => p.external).slice(0, 3)) applyAction(s, 'practice.track', {
    id: problem.id
  });
  applyAction(s, 'coding.submit', {
    id: 'two-sum'
  });
  assert.ok(s.journey.xp > 0);
  assert.equal(metrics(s).readiness, 0);
  assert.equal(metrics(s).evidence.verifiedActivities, 0);
});
test('scored concept checks contribute bounded readiness with an explainable evidence breakdown', () => {
  const s = createProfile({
      name: 'Scored Student',
      handle: 'scored-student'
    }),
    lesson = getLesson('react', 0);
  applyAction(s, 'course.complete', {
    id: 'react',
    lesson: 0,
    answer: lesson.correct,
    reflection: 'I checked how a shared data owner coordinates a filtered list.'
  });
  const m = metrics(s);
  assert.ok(m.readiness > 0 && m.readiness < 20);
  assert.equal(m.evidence.verifiedActivities, 1);
  assert.equal(m.readinessDetails.illustrative, false);
  assert.equal(m.readinessDetails.dimensions.find(d => d.skill === 'Frontend').checks, 1);
});
test('one SQL run is counted once even when its normalized event and attempt are both present', () => {
  const s = createProfile({
      name: 'SQL Evidence',
      handle: 'sql-evidence'
    }),
    {
      session
    } = applyAction(s, 'assessment.start', {
      id: 'unpaid-orders',
      mode: 'practice'
    });
  recordAssessment(s, 'unpaid-orders', session.id, {
    score: 100,
    verification: 'Server SQL checks',
    explanation: 'A NOT EXISTS query includes orders with no payment and those with only failed payments.'
  }, 'SELECT 1;');
  assert.equal(metrics(s).readinessDetails.dimensions.find(d => d.skill === 'Databases').checks, 1);
});
