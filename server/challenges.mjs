import { randomUUID, createHash } from 'node:crypto';
import { quizzes } from '../shared/catalog.js';
import { sqlLabs } from '../shared/assessments.js';
import { can, requirePermission } from '../shared/permissions.js';
import { addEvidence } from './evidence.mjs';
import { runSqlLab } from './assessment-service.mjs';
const fail = message => {
  throw new Error(message);
};
export function createChallenges({
  db,
  readProfile,
  saveProfile,
  readCampus,
  enqueue,
  broadcast = () => {},
  clock = Date.now,
  runSql = runSqlLab
}) {
  const read = id => {
    const row = db.prepare('SELECT document FROM challenges WHERE id=?').get(id);
    return row && JSON.parse(row.document);
  };
  const session = id => {
    const row = db.prepare('SELECT document FROM challenge_sessions WHERE id=?').get(id);
    return row && JSON.parse(row.document);
  };
  function store(s) {
    db.prepare('INSERT INTO challenge_sessions VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,submitted_at=excluded.submitted_at,score=excluded.score,document=excluded.document').run(s.id, s.challengeId, s.profileId, s.attempt, s.status, s.startedAt, s.deadline, s.submittedAt || null, s.score ?? null, JSON.stringify(s));
  }
  function save(c) {
    db.prepare('INSERT INTO challenges VALUES(?,?,?,?,?,?)').run(c.id, c.collegeId, JSON.stringify(c), c.startsAt, c.endsAt, c.createdBy);
  }
  function eligible(actor, c) {
    if (!c || actor.profile.collegeId !== c.collegeId) fail('Challenge not found.');
    if (actor.profile.role === 'student' && (!c.years.includes(Number(actor.profile.year)) || actor.profile.enrollmentStatus === 'pending')) fail('This challenge is for another cohort.');
  }
  function publicSession(s, c) {
    const released = clock() > c.endsAt;
    return {
      ...s,
      questions: s.questions.map(({
        correct,
        explanation,
        ...q
      }) => ({
        ...q,
        ...(released ? {
          correct,
          explanation
        } : {})
      })),
      feedback: released ? s.feedback : undefined
    };
  }
  function ensureDaily(actor) {
    if (actor.profile.role !== 'student') return;
    const date = new Date(clock() + 19800000).toISOString().slice(0, 10),
      id = 'daily-' + actor.profile.collegeId + '-' + date;
    if (read(id)) return;
    const questions = quizzes.filter(q => !q.id.startsWith('checkpoint-')).flatMap(q => q.questions.map(item => ({
      ...item,
      skill: q.topic
    }))).slice(0, 44);
    const offset = Number(date.replaceAll('-', '')) % questions.length;
    save({
      id,
      collegeId: actor.profile.collegeId,
      title: 'Campus daily challenge · ' + date,
      description: 'Ten foundation questions. One college scoreboard. Answers are released after the challenge closes.',
      years: [1, 2, 3, 4],
      startsAt: Date.parse(date + 'T00:00:00+05:30'),
      endsAt: Date.parse(date + 'T23:59:59+05:30'),
      duration: 30,
      maxAttempts: 1,
      questions: Array.from({
        length: 10
      }, (_, i) => questions[(offset + i * 3) % questions.length]),
      sqlIds: [],
      createdBy: 'system'
    });
  }
  function list(actor) {
    ensureDaily(actor);
    return db.prepare('SELECT document FROM challenges WHERE college_id=? ORDER BY ends_at DESC LIMIT 120').all(actor.profile.collegeId).map(r => JSON.parse(r.document)).filter(c => actor.profile.role !== 'student' || c.years.includes(Number(actor.profile.year))).map(({
      questions,
      sqlIds,
      ...c
    }) => ({
      ...c,
      questionCount: questions.length,
      sqlCount: sqlIds.length,
      attempts: db.prepare('SELECT id,status,score,attempt_number,deadline FROM challenge_sessions WHERE challenge_id=? AND profile_id=? ORDER BY attempt_number').all(c.id, actor.profile.id)
    }));
  }
  function create(actor, p) {
    requirePermission(actor.profile, 'content.publish');
    const startsAt = Date.parse(p.startsAt),
      endsAt = Date.parse(p.endsAt);
    if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt || endsAt < clock()) fail('Choose a valid future closing time.');
    if (!Number.isInteger(p.duration) || p.duration < 5 || p.duration > 180) fail('Duration must be 5–180 minutes.');
    if (!Number.isInteger(p.maxAttempts) || p.maxAttempts < 1 || p.maxAttempts > 3) fail('Allow one to three attempts.');
    const years = [...new Set(p.years || [])];
    if (!years.length || years.some(y => ![1, 2, 3, 4].includes(y))) fail('Select student years.');
    const banks = [...(readCampus(actor.profile.collegeId).questionBanks || []), ...quizzes],
      selected = (p.quizIds || []).map(id => banks.find(q => q.id === id) || fail('Question bank not found.'));
    const questions = selected.flatMap(q => q.questions.map(item => ({
      ...item,
      skill: q.topic
    }))).slice(0, 100);
    const sqlIds = [...new Set(p.sqlIds || [])];
    if (sqlIds.some(id => !sqlLabs.some(l => l.id === id)) || !questions.length && !sqlIds.length) fail('Choose at least one question bank or SQL lab.');
    const c = {
      id: randomUUID(),
      collegeId: actor.profile.collegeId,
      title: String(p.title || '').trim().slice(0, 140),
      description: String(p.description || '').slice(0, 3000),
      startsAt,
      endsAt,
      duration: p.duration,
      maxAttempts: p.maxAttempts,
      years,
      questions,
      roleIds: [...new Set(selected.map(q => q.roleId).filter(Boolean))],
      sqlIds,
      createdBy: actor.profile.id
    };
    if (c.title.length < 4) fail('Give the challenge a title.');
    save(c);
    return {
      id: c.id
    };
  }
  function get(actor, id) {
    const c = read(id);
    eligible(actor, c);
    const s = session(id);
    return s ? publicSession(s, c) : null;
  }
  function validateAnswers(s, p) {
    if (!Array.isArray(p.answers) || p.answers.length > s.questions.length || p.answers.some((a, i) => a !== null && (!Number.isInteger(a) || a < 0 || a >= s.questions[i].options.length))) fail('Choose valid answers.');
    if (p.sql && (!Array.isArray(p.sql) || p.sql.length > s.sqlIds.length || p.sql.some(code => typeof code !== 'string' || code.length > 12000))) fail('Invalid SQL solution.');
    s.answers = p.answers;
    s.sql = p.sql || [];
  }
  function action(actor, type, p = {}) {
    if (type === 'create') return create(actor, p);
    if (type === 'start') {
      const c = read(p.id);
      eligible(actor, c);
      if (actor.profile.role !== 'student') fail('Open a student account to participate.');
      const now = clock();
      if (now < c.startsAt || now >= c.endsAt) fail('The challenge is outside its participation window.');
      const old = db.prepare('SELECT document FROM challenge_sessions WHERE challenge_id=? AND profile_id=? ORDER BY attempt_number DESC').all(c.id, actor.profile.id).map(r => JSON.parse(r.document));
      if (old[0]?.status === 'active' && old[0].deadline > now) return {
        session: publicSession(old[0], c)
      };
      if (old.length >= c.maxAttempts) fail('Your attempt allowance is complete.');
      const seed = createHash('sha256').update(actor.profile.id + c.id + old.length).digest();
      const questions = c.questions.map((q, i) => {
        const options = q.options.map((text, index) => ({
          text,
          index
        }));
        options.sort((a, b) => seed[(i + a.index) % 32] - seed[(i + b.index) % 32] || a.index - b.index);
        return {
          ...q,
          options: options.map(o => o.text),
          correct: options.findIndex(o => o.index === q.correct)
        };
      });
      const s = {
        id: randomUUID(),
        challengeId: c.id,
        profileId: actor.profile.id,
        attempt: old.length + 1,
        status: 'active',
        startedAt: now,
        deadline: Math.min(c.endsAt, now + c.duration * 60000),
        questions,
        sqlIds: c.sqlIds,
        sql: [],
        answers: [],
        score: null
      };
      store(s);
      return {
        session: publicSession(s, c)
      };
    }
    const s = session(p.sessionId);
    if (!s || s.profileId !== actor.profile.id) fail('Attempt not found.');
    const c = read(s.challengeId);
    eligible(actor, c);
    if (type === 'view') return {
      session: publicSession(s, c),
      labs: s.sqlIds.map(id => {
        const l = sqlLabs.find(x => x.id === id);
        const {
          tests,
          ...safe
        } = l;
        return safe;
      })
    };
    if (s.status !== 'active') return {
      session: publicSession(s, c)
    };
    if (type !== 'draft' && type !== 'submit') fail('Unsupported challenge action.');
    if (clock() > s.deadline + 2000) {
      s.status = 'expired';
      store(s);
      fail('Your attempt time has expired.');
    }
    validateAnswers(s, p);
    if (type === 'submit') {
      s.status = 'queued';
      s.submittedAt = clock();
      db.exec('BEGIN IMMEDIATE');
      try {
        store(s);
        enqueue({
          key: 'challenge-grade:' + s.id,
          profileId: s.profileId,
          kind: 'challenge-grade',
          payload: {
            sessionId: s.id
          }
        });
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    } else store(s);
    return {
      session: publicSession(s, c)
    };
  }
  async function grade(id) {
    const s = session(id);
    if (!s || s.status !== 'queued') return;
    const feedback = s.questions.map((q, i) => ({
      skill: q.skill || 'DSA',
      score: s.answers[i] === q.correct ? 100 : 0,
      text: q.text
    }));
    for (const [i, labId] of s.sqlIds.entries()) {
      try {
        const r = await runSql(labId, s.sql[i] || 'SELECT NULL;');
        feedback.push({
          skill: 'Databases',
          score: r.score,
          text: labId
        });
      } catch (e) {
        if (/busy|stopped|spawn|ENOENT/i.test(e.message)) throw e;
        feedback.push({
          skill: 'Databases',
          score: 0,
          text: labId,
          error: e.message
        });
      }
    }
    const current = session(id);
    if (current.status !== 'queued') return;
    s.score = Math.round(feedback.reduce((n, q) => n + q.score, 0) / feedback.length);
    s.feedback = feedback;
    s.status = 'submitted';
    db.exec('BEGIN IMMEDIATE');
    try {
      const state = readProfile(s.profileId);
      for (const skill of new Set(feedback.map(q => q.skill))) {
        const records = feedback.filter(q => q.skill === skill);
        addEvidence(state, {
          key: 'challenge:' + s.challengeId + ':' + skill,
          kind: 'challenge',
          resourceId: s.challengeId,
          skill,
          score: Math.round(records.reduce((n, q) => n + q.score, 0) / records.length),
          verification: 'server-checked',
          xp: 0
        });
      }
      state.challengeAttempts ||= [];
      if (!state.challengeAttempts.some(a => a.challengeId === s.challengeId)) {
        state.challengeAttempts.push({
          id: s.id,
          challengeId: s.challengeId,
          score: s.score,
          time: new Date(clock()).toISOString()
        });
        state.journey.xp += 50;
        const day = new Date(clock() + 19800000).toISOString().slice(0, 10);
        const activity = state.activity?.find(a => a.date === day);
        if (activity) activity.count++;else state.activity.push({
          date: day,
          count: 1
        });
        for (const t of state.tasks || []) if (t.kind === 'challenge' && t.date === day) t.status = 'completed';
      }
      state.version++;
      store(s);
      saveProfile(state);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    broadcast(s.profileId);
  }
  function leaderboard(actor, id) {
    const c = read(id);
    eligible(actor, c);
    const records = db.prepare("SELECT document FROM challenge_sessions WHERE challenge_id=? AND status='submitted' ORDER BY score DESC,(submitted_at-started_at),id").all(id),
      seen = new Set();
    return records.map(r => JSON.parse(r.document)).filter(s => {
      if (seen.has(s.profileId)) return false;
      seen.add(s.profileId);
      return true;
    }).map((s, i) => {
      const p = readProfile(s.profileId)?.profile;
      return {
        rank: i + 1,
        name: p?.name || 'Former student',
        handle: p?.handle,
        year: p?.year,
        score: s.score,
        seconds: Math.round((s.submittedAt - s.startedAt) / 1000)
      };
    });
  }
  return {
    list,
    action,
    grade,
    leaderboard,
    get
  };
}
