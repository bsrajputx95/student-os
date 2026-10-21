import test from 'node:test';
import assert from 'node:assert/strict';
import { practiceRoles, practiceScope, matchesPracticeProblem, matchesPracticeQuiz, matchesPracticeLab } from '../shared/practice-roles.js';
import { catalog, quizzes } from '../shared/catalog.js';
import { assessmentLabs } from '../shared/assessments.js';
import { createProfile } from '../server/profiles.mjs';
import { applyAction, metrics, dateKey } from '../server/model.mjs';
import { studentKnowledge, staffKnowledge } from '../server/quid-context.mjs';
import { createQuidHistory } from '../server/quid-history.mjs';
import { createInterviewService } from '../server/interview.mjs';
import { complete, aiConfigured } from '../server/ai-provider.mjs';
const learner = (name, handle, college = 'test') => {
  const s = createProfile({
    name,
    handle
  });
  s.profile.collegeId = college;
  s.profile.year = 4;
  s.metrics = metrics(s);
  return s;
};
test('all 15 practice roles have resolvable resources, a dedicated scored bank and different recommendations', () => {
  assert.equal(practiceRoles.length, 15);
  for (const role of practiceRoles) {
    assert.ok(role.courses.every(id => catalog.courses.some(c => c.id === id)));
    assert.ok(role.labs.every(id => assessmentLabs.some(l => l.id === id)));
    const bank = quizzes.find(q => q.id === role.quizId);
    assert.equal(bank.questions.length, 3);
    assert.ok(bank.questions.every(q => q.options[q.correct] && q.explanation.length > 30));
    const s = learner('Role Student', 'role-student');
    const scope = practiceScope(s, {
      roleId: role.id,
      level: 'All levels'
    });
    assert.equal(catalog.quizzes.filter(q => q.roleId && matchesPracticeQuiz(q, scope)).length, 1);
    assert.ok(catalog.quizzes.filter(q => q.roleId && matchesPracticeQuiz(q, scope)).every(q => !('correct' in q.questions[0])));
  }
  const s = learner('Analyst Student', 'analyst-student');
  const analyst = practiceScope(s, {
      roleId: 'data-analyst',
      level: 'All levels'
    }),
    frontend = practiceScope(s, {
      roleId: 'frontend-developer',
      level: 'All levels'
    });
  assert.equal(matchesPracticeProblem({
    topics: ['Database'],
    difficulty: 'Easy'
  }, analyst), true);
  assert.equal(matchesPracticeProblem({
    topics: ['Database'],
    difficulty: 'Easy'
  }, frontend), false);
  assert.equal(matchesPracticeLab(assessmentLabs.find(l => l.id === 'net-revenue'), analyst), true);
  assert.equal(matchesPracticeLab(assessmentLabs.find(l => l.id === 'net-revenue'), frontend), false);
});
test('practice preferences persist without changing the main journey and reject unknown role values', () => {
  const s = learner('Practice Student', 'practice-student'),
    day = s.journey.day,
    xp = s.journey.xp,
    track = s.profile.track;
  applyAction(s, 'practice.preferences', {
    roleId: 'cybersecurity-analyst',
    level: 'Foundation',
    focus: 'gaps'
  });
  assert.equal(s.profile.practiceRole, 'cybersecurity-analyst');
  assert.equal(s.profile.track, track);
  assert.equal(s.journey.day, day);
  assert.equal(s.journey.xp, xp);
  const saved = structuredClone(s.practicePreferences);
  assert.throws(() => applyAction(s, 'practice.preferences', {
    roleId: 'untrusted',
    level: 'Foundation',
    focus: 'gaps'
  }), /valid practice/);
  assert.deepEqual(s.practicePreferences, saved);
});
test('student knowledge covers recorded preparation but excludes private chats, contact secrets and answer keys', () => {
  const s = learner('Knowledge Student', 'knowledge-student');
  s.profile.email = 'private-contact-secret@example.test';
  s.privateMessages = [{
    text: 'private-dm-secret'
  }];
  s.credentials = {
    password: 'credential-secret'
  };
  s.activity = [{
    date: '2020-01-01',
    count: 99
  }, {
    date: dateKey(),
    count: 2
  }];
  const knowledge = studentKnowledge(s),
    text = JSON.stringify(knowledge);
  assert.equal(knowledge.activity.activeDays30, 1);
  assert.equal(knowledge.activity.contributions30, 2);
  assert.ok(knowledge.learning.length === 12 && knowledge.preparation.skills);
  for (const secret of ['private-dm-secret', 'credential-secret', 'private-contact-secret', 'correct']) assert.ok(!text.includes(secret));
});
test('faculty Quid resolves names and explicit selections only inside the authorized college', () => {
  const a = learner('Bhavani Singh', 'bhavani'),
    b = learner('Bhavani Rao', 'bhavani-rao'),
    outside = learner('Outside Student', 'outside', 'other');
  const teacher = learner('Faculty User', 'faculty');
  teacher.profile.role = 'teacher';
  const dependencies = {
    students: () => [a, b, outside],
    readCampus: () => ({
      notes: [],
      items: [],
      drives: []
    })
  };
  const exact = staffKnowledge(teacher, {
    message: 'How is Bhavani Singh progressing?'
  }, dependencies);
  assert.equal(exact.studentId, a.profile.id);
  assert.equal(exact.facts.profile.name, 'Bhavani Singh');
  assert.equal(staffKnowledge(teacher, {
    message: 'How is Bhavani doing?'
  }, dependencies).kind, 'selection');
  assert.throws(() => staffKnowledge(teacher, {
    message: 'Read this student',
    studentId: outside.profile.id
  }, dependencies), /college scope/);
  assert.throws(() => staffKnowledge(a, {
    message: 'How is another student doing?'
  }, dependencies), /role/);
  const cohort = staffKnowledge(teacher, {
    message: 'Who needs support?'
  }, dependencies);
  assert.equal(cohort.facts.students, 2);
  a.profile.targetCompanies = ['Amazon'];
  const matched = staffKnowledge(teacher, {
    message: 'Which students are preparing for Amazon?'
  }, dependencies);
  assert.equal(matched.facts.matchedStudents, 1);
  assert.equal(matched.facts.studentsToReview[0].id, a.profile.id);
  assert.ok(matched.facts.skillSummary.length > 0);
  assert.equal(matched.facts.coursework.pending, 0);
  a.activity.push({
    date: dateKey(),
    count: 3
  });
  assert.equal(staffKnowledge(teacher, {
    message: 'Review',
    studentId: a.profile.id
  }, dependencies).facts.activity.contributions30, 3);
});
test('Quid builds staff grounding on the server and keeps conversations scoped to the selected student', async () => {
  const a = learner('Selected Student', 'selected'),
    b = learner('Another Student', 'another'),
    teacher = learner('Faculty User', 'faculty-user');
  teacher.profile.role = 'teacher';
  const records = new Map([a, b, teacher].map(s => [s.profile.id, s]));
  let captured;
  const service = createQuidHistory({
    read: id => structuredClone(records.get(id)),
    save: s => records.set(s.profile.id, structuredClone(s)),
    staffContext: (actor, p) => staffKnowledge(actor, p, {
      students: () => [a, b],
      readCampus: () => ({
        notes: [],
        items: [],
        drives: []
      })
    }),
    reply: async input => {
      captured = input;
      return {
        text: 'Saved academic summary',
        actions: []
      };
    }
  });
  await service.action(teacher.profile.id, {
    message: 'Review the selected student',
    studentId: a.profile.id,
    grounding: {
      facts: {
        privateMessages: 'must-ignore'
      }
    }
  });
  assert.equal(captured.grounding.studentId, a.profile.id);
  assert.ok(!JSON.stringify(captured).includes('must-ignore'));
  await service.action(teacher.profile.id, {
    message: 'Review another student',
    studentId: b.profile.id
  });
  assert.equal(captured.history.length, 0);
});
test('Gemini transport uses native system instructions, server-only key headers and JSON output when requested', async () => {
  const env = {
    AI_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'server-only-secret',
    GEMINI_MODEL: 'fixture-model'
  };
  assert.equal(aiConfigured(env), true);
  let seen;
  const result = await complete([{
    role: 'system',
    content: 'Use only recorded facts.'
  }, {
    role: 'user',
    content: 'My first question'
  }, {
    role: 'assistant',
    content: 'A factual reply'
  }, {
    role: 'user',
    content: 'Please expand'
  }], true, {
    env,
    fetcher: async (url, options) => {
      seen = {
        url,
        options,
        body: JSON.parse(options.body)
      };
      return new Response(JSON.stringify({
        candidates: [{
          content: {
            parts: [{
              thought: true,
              text: 'private reasoning'
            }, {
              text: '{"score":75}'
            }]
          }
        }]
      }));
    }
  });
  assert.equal(result, '{"score":75}');
  assert.ok(!seen.url.includes(env.GEMINI_API_KEY));
  assert.equal(seen.options.headers['x-goog-api-key'], env.GEMINI_API_KEY);
  assert.equal(seen.body.systemInstruction.parts[0].text, 'Use only recorded facts.');
  assert.equal(seen.body.contents[1].role, 'model');
  assert.equal(seen.body.generationConfig.responseMimeType, 'application/json');
  await assert.rejects(complete([{
    role: 'user',
    content: 'Question'
  }], false, {
    env,
    fetcher: async () => new Response('secret-provider-detail', {
      status: 429
    })
  }), /429/);
});
test('all specialist interview roles start with a role-specific technical prompt and retain the same transcript model', async () => {
  const s = learner('Interview Student', 'role-interview'),
    records = new Map([[s.profile.id, s]]);
  const service = createInterviewService({
    read: id => structuredClone(records.get(id)),
    save: next => records.set(next.profile.id, structuredClone(next)),
    broadcast: () => {}
  });
  for (const role of practiceRoles) {
    const {
      session
    } = await service.action(s.profile.id, 'start', {
      role: role.name,
      round: 'Technical + introduction'
    });
    assert.equal(session.questions[1].text, role.interview);
  }
  assert.equal(records.get(s.profile.id).interviewSessions.length, 15);
});
