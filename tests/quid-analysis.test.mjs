import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile } from '../server/profiles.mjs';
import { staffKnowledge } from '../server/quid-context.mjs';
import { parseAcademicQuery, validateAcademicPlan, planAcademicQuery } from '../server/quid-analysis.mjs';
import { quidReply } from '../server/quid.mjs';
import { createQuidHistory } from '../server/quid-history.mjs';
import { complete } from '../server/ai-provider.mjs';
import { quizzes } from '../shared/catalog.js';
const student = (name, handle, dsa, sql, year = 4) => {
  const s = createProfile({
    name,
    handle
  });
  Object.assign(s.profile, {
    isDemo: true,
    collegeId: 'test-college',
    college: 'Test College',
    year,
    department: 'Computer Science'
  });
  Object.keys(s.skills).forEach(k => s.skills[k] = 70);
  s.skills.DSA = dsa;
  s.skills.Databases = sql;
  return s;
};
function fixture() {
  const a = student('Asha Menon', 'asha', 25, 88),
    b = student('Rohan Sharma', 'rohan', 85, 32),
    c = student('Mira Rao', 'mira', 38, 42, 2),
    fresh = createProfile({
      name: 'New Learner',
      handle: 'new-learner'
    }),
    teacher = student('Teacher Name', 'teacher', 0, 0);
  Object.assign(fresh.profile, {
    collegeId: 'test-college',
    year: 4
  });
  teacher.profile.role = 'teacher';
  const students = [a, b, c, fresh],
    dependencies = {
      students: () => students,
      readCampus: () => ({
        notes: [],
        items: [],
        drives: []
      })
    };
  return {
    a,
    b,
    c,
    fresh,
    teacher,
    students,
    dependencies
  };
}
test('DSA rankings use DSA, exact counts and year filters instead of general readiness; unassessed students stay separate', () => {
  const f = fixture();
  const result = staffKnowledge(f.teacher, {
    message: 'Who is weak at DSA?'
  }, f.dependencies);
  assert.equal(result.report.matched, 2);
  assert.equal(result.report.unassessed, 1);
  assert.deepEqual(result.report.rows.map(r => [r.name, r.score]), [['Asha Menon', 25], ['Mira Rao', 38]]);
  const final = staffKnowledge(f.teacher, {
    message: 'Show final year students below 50 in SQL'
  }, f.dependencies);
  assert.equal(final.report.population, 3);
  assert.equal(final.report.matched, 1);
  assert.equal(final.report.rows[0].name, 'Rohan Sharma');
  assert.equal(final.report.rows[0].score, 32);
  const strong = staffKnowledge(f.teacher, {
    message: 'Which students are strong in DSA?'
  }, f.dependencies);
  assert.deepEqual(strong.report.rows.map(r => r.name), ['Rohan Sharma']);
});
test('cohort questions escape a stale selected student while a new explicit name changes the selected context', () => {
  const f = fixture();
  const result = staffKnowledge(f.teacher, {
    message: 'Which students need help with DSA?',
    studentId: f.b.profile.id
  }, f.dependencies);
  assert.equal(result.kind, 'college');
  assert.equal(result.report.matched, 2);
  const selected = staffKnowledge(f.teacher, {
    message: 'What special support can we give Asha Menon?',
    studentId: f.b.profile.id
  }, f.dependencies);
  assert.equal(selected.studentId, f.a.profile.id);
  assert.equal(selected.supportPlan.gaps[0].skill, 'DSA');
  assert.ok(selected.supportPlan.steps.some(s => s.courseId === 'dsa'));
  assert.ok(selected.supportPlan.steps.some(s => s.when.includes('Day 7')));
});
test('short course names, unfinished courses and symbolic score comparisons resolve to the requested records', () => {
  const f = fixture();
  f.a.courseProgress.sql = 16;
  f.b.courseProgress.sql = 3;
  const completed = staffKnowledge(f.teacher, {
    message: 'Which students completed the SQL course?'
  }, f.dependencies);
  assert.deepEqual(completed.report.rows.map(r => r.name), ['Asha Menon']);
  const unfinished = staffKnowledge(f.teacher, {
    message: 'Which students have not finished the SQL course?'
  }, f.dependencies);
  assert.equal(unfinished.report.matched, 2);
  assert.ok(!unfinished.report.rows.some(r => r.name === 'Asha Menon'));
  const exact = staffKnowledge(f.teacher, {
    message: 'List students with DSA <= 25'
  }, f.dependencies);
  assert.deepEqual(exact.report.rows.map(r => r.name), ['Asha Menon']);
});
test('pending coursework includes revision requests and prioritizes the larger review backlog', () => {
  const f = fixture();
  f.a.assignments = [{
    id: 'one',
    title: 'First task',
    deadline: '2020-01-01',
    status: 'revision requested'
  }, {
    id: 'two',
    title: 'Second task',
    deadline: '2020-01-01',
    status: 'pending'
  }];
  f.b.assignments = [{
    id: 'three',
    title: 'Third task',
    deadline: '2020-01-01',
    status: 'pending'
  }];
  const report = staffKnowledge(f.teacher, {
    message: 'Which students have pending assignments?'
  }, f.dependencies).report;
  assert.equal(report.matched, 2);
  assert.deepEqual(report.rows.map(r => [r.name, r.overdue]), [['Asha Menon', 2], ['Rohan Sharma', 1]]);
});
test('support plans do not invent weaknesses for strong students or label a missing baseline as failure', () => {
  const f = fixture();
  Object.keys(f.b.skills).forEach(k => f.b.skills[k] = 92);
  const strong = staffKnowledge(f.teacher, {
    message: 'Review Rohan Sharma'
  }, f.dependencies);
  assert.equal(strong.supportPlan.gaps.length, 0);
  assert.match(strong.supportPlan.steps[0].task, /No low preparation score/);
  const unassessed = staffKnowledge(f.teacher, {
    message: 'Review',
    studentId: f.fresh.profile.id
  }, f.dependencies);
  assert.equal(unassessed.supportPlan.gaps.length, 0);
  assert.ok(unassessed.supportPlan.unassessed.length > 0);
  assert.match(unassessed.supportPlan.steps[0].task, /scored baseline/);
});
test('specific support cites lower-scored attempts in the requested skill rather than unrelated quiz results', () => {
  const f = fixture(),
    dsa = quizzes.find(q => q.topic === 'DSA'),
    frontend = quizzes.find(q => q.topic === 'Frontend');
  f.a.quizAttempts = [{
    quizId: dsa.id,
    score: 20,
    date: '2026-10-20',
    verification: 'server-checked'
  }, {
    quizId: frontend.id,
    score: 5,
    date: '2026-10-21',
    verification: 'server-checked'
  }];
  const result = staffKnowledge(f.teacher, {
    message: 'What support does Asha Menon need in DSA?'
  }, f.dependencies);
  assert.deepEqual(result.supportPlan.assessmentSignals.map(a => [a.title, a.score]), [[dsa.title, 20]]);
  assert.ok(!JSON.stringify(result.supportPlan).includes(frontend.title));
});
test('academic plans accept only typed allowlisted filters and ignore model code, private selectors and invalid scores', async () => {
  assert.deepEqual(validateAcademicPlan({
    scope: 'all-colleges',
    sql: 'DROP TABLE profiles',
    studentId: 'outside',
    skill: 'personality',
    year: 9,
    comparison: 'lt',
    score: -1
  }), {});
  const parsed = parseAcademicQuery('List 3rd year CSE students above 80 in DBMS');
  assert.equal(parsed.skill, 'Databases');
  assert.equal(parsed.year, 3);
  assert.equal(parsed.department, 'Computer Science');
  assert.equal(parsed.comparison, 'gt');
  const plan = await planAcademicQuery('Which second year learners need a fresh check-in?', {
    configured: true,
    generate: async () => JSON.stringify({
      activity: 'inactive7',
      year: 4,
      scope: 'college',
      sql: 'untrusted'
    })
  });
  assert.equal(plan.year, 2);
  assert.equal(plan.activity, 'inactive7');
  assert.ok(!('sql' in plan));
  assert.deepEqual(await planAcademicQuery('College overview', {
    configured: true,
    generate: async () => 'invalid'
  }), parseAcademicQuery('College overview'));
});
test('record-only Quid names the matching students and attaches an exact downloadable report', async () => {
  const f = fixture();
  const grounding = staffKnowledge(f.teacher, {
    message: 'Who is weak at DSA?'
  }, f.dependencies);
  const reply = await quidReply({
    message: 'Who is weak at DSA?',
    grounding
  }, f.teacher);
  assert.equal(reply.mode, 'records');
  assert.match(reply.text, /Asha Menon/);
  assert.match(reply.text, /2 of 4 students/);
  assert.equal(reply.report.rows.length, 2);
  assert.ok(!reply.text.includes('New Learner ·'));
});
test('server query planning ignores client filters and persists the resolved cohort scope', async () => {
  const f = fixture(),
    records = new Map([f.teacher, ...f.students].map(s => [s.profile.id, s]));
  const service = createQuidHistory({
    read: id => structuredClone(records.get(id)),
    save: s => records.set(s.profile.id, structuredClone(s)),
    plan: async message => parseAcademicQuery(message),
    staffContext: (actor, p) => staffKnowledge(actor, p, f.dependencies),
    reply: async input => ({
      text: 'Calculated report',
      report: input.grounding.report,
      context: {
        kind: input.grounding.kind
      },
      actions: []
    })
  });
  const result = await service.action(f.teacher.profile.id, {
    message: 'Who is weak at DSA?',
    studentId: f.b.profile.id,
    plan: {
      skill: 'Databases',
      scope: 'outside-campus'
    }
  });
  assert.equal(result.report.skill, 'DSA');
  assert.equal(result.messages.at(-1).contextId, 'college');
});
test('provider failures return the exact report and support guidance without losing the academic answer', async () => {
  const f = fixture(),
    grounding = staffKnowledge(f.teacher, {
      message: 'Who is weak at DSA?'
    }, f.dependencies);
  const reply = await quidReply({
    message: 'Who is weak at DSA?',
    grounding
  }, f.teacher, {
    configured: true,
    generate: async () => {
      throw new Error('upstream unavailable');
    }
  });
  assert.equal(reply.mode, 'records');
  assert.equal(reply.report.matched, 2);
  assert.match(reply.text, /Asha Menon/);
  assert.match(reply.providerNotice, /temporarily unavailable/);
  assert.ok(!JSON.stringify(reply).includes('upstream unavailable'));
});
test('Gemini retries unavailable models in configured order and never retries an authorization failure', async () => {
  const env = {
      AI_PROVIDER: 'gemini',
      GEMINI_API_KEY: 'private-test-key',
      GEMINI_MODEL: 'primary-model',
      GEMINI_FALLBACK_MODELS: 'available-model'
    },
    calls = [];
  const text = await complete([{
    role: 'user',
    content: 'Question'
  }], false, {
    env,
    fetcher: async (url, options) => {
      assert.ok(!url.includes(env.GEMINI_API_KEY));
      assert.equal(options.headers['x-goog-api-key'], env.GEMINI_API_KEY);
      calls.push(url);
      return calls.length === 1 ? new Response('{}', {
        status: 503
      }) : new Response(JSON.stringify({
        candidates: [{
          content: {
            parts: [{
              text: 'Grounded answer'
            }]
          }
        }]
      }));
    }
  });
  assert.equal(text, 'Grounded answer');
  assert.equal(calls.length, 2);
  assert.match(calls[1], /available-model:generateContent$/);
  let authorizationCalls = 0;
  await assert.rejects(complete([{
    role: 'user',
    content: 'Question'
  }], false, {
    env,
    fetcher: async () => {
      authorizationCalls++;
      return new Response('{}', {
        status: 403
      });
    }
  }), /403/);
  assert.equal(authorizationCalls, 1);
});
