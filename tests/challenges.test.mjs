import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { migrateDatabase } from '../server/database.mjs';
import { createChallenges } from '../server/challenges.mjs';
import { createProfile } from '../server/profiles.mjs';
function fixture() {
  const db = new DatabaseSync(':memory:');
  migrateDatabase(db);
  let now = Date.parse('2026-10-20T06:00:00Z');
  const state = createProfile({
    handle: 'challenge-learner',
    name: 'Challenge Learner'
  });
  state.profile.collegeId = 'college';
  state.profile.year = 4;
  const teacher = {
      profile: {
        id: 'teacher',
        role: 'teacher',
        collegeId: 'college'
      }
    },
    jobs = [];
  const service = createChallenges({
    db,
    readProfile: () => structuredClone(state),
    saveProfile: s => Object.assign(state, s),
    readCampus: () => ({
      questionBanks: [{
        id: 'bank',
        topic: 'Databases',
        questions: [{
          text: 'Choose the atomic operation.',
          options: ['Transaction', 'Partial update'],
          correct: 0,
          explanation: 'Transactions commit all changes together.'
        }]
      }]
    }),
    enqueue: j => jobs.push(j),
    clock: () => now,
    runSql: async () => ({
      score: 100
    })
  });
  const create = (extra = {}) => service.action(teacher, 'create', {
    title: 'Campus transaction test',
    startsAt: new Date(now - 1000).toISOString(),
    endsAt: new Date(now + 3600000).toISOString(),
    duration: 30,
    maxAttempts: 1,
    years: [4],
    quizIds: ['bank'],
    sqlIds: [],
    ...extra
  });
  return {
    db,
    state,
    teacher,
    jobs,
    service,
    create,
    advance: n => now += n
  };
}
test('campus challenge hides answer keys, grades durably, and never duplicates rewards', async () => {
  const f = fixture();
  try {
    const c = f.create(),
      {
        session
      } = f.service.action(f.state, 'start', {
        id: c.id
      });
    assert.equal(session.questions[0].correct, undefined);
    const answer = session.questions[0].options.indexOf('Transaction');
    f.service.action(f.state, 'submit', {
      sessionId: session.id,
      answers: [answer]
    });
    assert.equal(f.jobs.length, 1);
    assert.equal(f.service.action(f.state, 'view', {
      sessionId: session.id
    }).session.status, 'queued');
    await f.service.grade(session.id);
    const xp = f.state.journey.xp;
    await f.service.grade(session.id);
    assert.equal(f.state.journey.xp, xp);
    assert.equal(f.state.challengeAttempts[0].score, 100);
    assert.equal(f.service.leaderboard(f.state, c.id)[0].score, 100);
    assert.equal(f.service.action(f.state, 'view', {
      sessionId: session.id
    }).session.feedback, undefined);
    f.advance(3600001);
    assert.equal(f.service.action(f.state, 'view', {
      sessionId: session.id
    }).session.questions[0].correct, answer);
  } finally {
    f.db.close();
  }
});
test('challenge tenant/cohort windows and answer ranges are enforced', () => {
  const f = fixture();
  try {
    const c = f.create(),
      other = structuredClone(f.state);
    other.profile.collegeId = 'elsewhere';
    assert.throws(() => f.service.action(other, 'start', {
      id: c.id
    }), /not found/);
    other.profile.collegeId = 'college';
    other.profile.year = 1;
    assert.throws(() => f.service.action(other, 'start', {
      id: c.id
    }), /another cohort/);
    const {
      session
    } = f.service.action(f.state, 'start', {
      id: c.id
    });
    assert.throws(() => f.service.action(f.state, 'draft', {
      sessionId: session.id,
      answers: [9]
    }), /valid answers/);
    f.advance(1803000);
    assert.throws(() => f.service.action(f.state, 'submit', {
      sessionId: session.id,
      answers: [0]
    }), /expired/);
    assert.throws(() => f.service.action(f.state, 'start', {
      id: c.id
    }), /allowance/);
  } finally {
    f.db.close();
  }
});
test('SQL and quiz components contribute to a single accepted submission', async () => {
  const f = fixture();
  try {
    const c = f.create({
        sqlIds: ['duplicate-events']
      }),
      {
        session
      } = f.service.action(f.state, 'start', {
        id: c.id
      });
    f.service.action(f.state, 'submit', {
      sessionId: session.id,
      answers: [session.questions[0].options.indexOf('Transaction')],
      sql: ['SELECT event_key, COUNT(*) FROM webhook_events GROUP BY event_key;']
    });
    f.advance(4000000);
    await f.service.grade(session.id);
    assert.equal(f.state.challengeAttempts[0].score, 100);
    assert.equal(f.state.progressEvents.filter(e => e.kind === 'challenge').length, 1);
  } finally {
    f.db.close();
  }
});
