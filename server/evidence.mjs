import { randomUUID } from 'node:crypto';
import { quizzes } from '../shared/catalog.js';
export function addEvidence(state, {
  key,
  kind,
  resourceId,
  skill,
  score = 100,
  verification = 'self-reported',
  xp = 0,
  improvement = 0,
  detail = ''
}) {
  state.progressEvents ||= [];
  if (state.progressEvents.some(event => event.key === key)) return false;
  const now = new Date().toISOString();
  state.progressEvents.push({
    id: randomUUID(),
    key,
    kind,
    resourceId,
    skill,
    score,
    verification,
    xp,
    improvement,
    detail,
    time: now
  });
  return true;
}
export function evidenceSummary(state) {
  const events = state.progressEvents || [];
  const trusted = events.filter(e => ['server-checked', 'mentor-reviewed'].includes(e.verification));
  const assessments = [...(state.quizAttempts || []), ...(state.assessmentAttempts || [])];
  const scored = assessments.filter(a => !a.sample);
  return {
    activity: events.length,
    verifiedActivities: trusted.length,
    selfReportedActivities: events.filter(e => e.verification === 'self-reported').length,
    assessmentAverage: scored.length ? Math.round(scored.reduce((sum, a) => sum + a.score, 0) / scored.length) : null,
    assessmentCount: scored.length,
    explanation: 'XP records effort. Skill confidence records learning progress. Verified evidence comes from server checks or a staff review; external practice and project checklists remain self-reported.',
    skills: Object.keys(state.skills).map(skill => {
      const checks = trusted.filter(e => e.skill === skill);
      return {
        skill,
        confidence: state.skills[skill],
        verifiedChecks: checks.length,
        verifiedScore: checks.length ? Math.round(checks.reduce((n, e) => n + e.score, 0) / checks.length) : null,
        lastVerifiedAt: checks.at(-1)?.time || null
      };
    })
  };
}
export function readinessDetails(state) {
  const names = Object.keys(state.skills);
  if (state.profile.isDemo || !state.profile.id) {
    const skillScores = {
      ...state.skills
    };
    return {
      score: Math.round(names.reduce((n, s) => n + state.skills[s], 0) / names.length),
      skillScores,
      illustrative: true,
      explanation: 'Historical demonstration scores illustrate a prepared student. They are not verified employer assessments.'
    };
  }
  const candidates = [];
  for (const e of state.progressEvents || []) if (['server-checked', 'mentor-reviewed', 'ai-reviewed'].includes(e.verification)) candidates.push({
    key: e.resourceId,
    kind: e.kind,
    skill: e.skill,
    score: e.score,
    time: e.time
  });
  for (const a of state.assessmentAttempts || []) if (a.verification === 'Server SQL checks') candidates.push({
    key: a.labId,
    kind: 'assessment',
    skill: a.skill,
    score: a.score,
    time: a.time
  });
  for (const a of state.quizAttempts || []) {
    const quiz = quizzes.find(q => q.id === a.quizId);
    if (quiz && a.verification === 'server-checked') candidates.push({
      key: a.quizId,
      kind: 'quiz',
      skill: quiz.topic,
      score: a.score,
      time: a.time
    });
  }
  for (const a of state.assignments || []) if (a.status === 'graded' && Number.isFinite(a.grade) && a.maxPoints > 0) candidates.push({
    key: 'assignment:' + a.id,
    kind: 'mentor-review',
    skill: a.skill || (a.kind === 'Project' ? 'Backend' : 'Databases'),
    score: a.grade / a.maxPoints * 100,
    time: a.reviewedAt || a.submittedAt
  });
  for (const s of state.interviewSessions || []) if (s.status === 'completed' && s.verification === 'ai-reviewed' && Number.isFinite(s.score)) candidates.push({
    key: 'interview:' + s.id,
    kind: 'interview',
    skill: 'Communication',
    score: s.score,
    time: s.time
  });
  const latest = new Map();
  for (const c of candidates) {
    const key = c.skill + ':' + c.kind + ':' + c.key;
    const old = latest.get(key);
    if (!old || String(c.time) > String(old.time)) latest.set(key, c);
  }
  const checks = [...latest.values()],
    weights = {
      lesson: .2,
      quiz: .4,
      assessment: .4,
      challenge: .4,
      'mentor-review': .6,
      interview: .4
    };
  const dimensions = names.map(skill => {
    const records = checks.filter(e => e.skill === skill),
      quality = Math.min(1, [...new Set(records.map(r => r.kind))].reduce((n, k) => n + (weights[k] || .1), 0)),
      coverage = Math.min(1, records.length / 6);
    const performance = records.length ? records.reduce((n, r) => {
      const days = Math.max(0, (Date.now() - Date.parse(r.time || '')) / 86400000);
      const recency = Number.isFinite(days) ? Math.max(.5, 1 - days / 180) : .5;
      return n + Math.max(0, Math.min(100, r.score)) * recency;
    }, 0) / records.length : 0;
    return {
      skill,
      score: Math.round(performance * quality * (.35 + .65 * coverage)),
      checks: records.length,
      coverage: Math.round(coverage * 100),
      evidenceBreadth: Math.round(quality * 100),
      lastCheckedAt: records.map(r => r.time).filter(Boolean).sort().at(-1) || null
    };
  });
  const trackWeights = {
    'Full-stack development': {
      DSA: 2,
      Frontend: 2,
      Backend: 2,
      Databases: 1,
      DevOps: 1,
      Communication: 1
    },
    'Data science': {
      DSA: 1,
      Frontend: 0,
      Backend: 2,
      Databases: 3,
      DevOps: 1,
      Communication: 1
    },
    'Data analytics': {
      DSA: 1,
      Frontend: 0,
      Backend: 1,
      Databases: 4,
      DevOps: 0,
      Communication: 2
    },
    DevOps: {
      DSA: 1,
      Frontend: 0,
      Backend: 2,
      Databases: 1,
      DevOps: 4,
      Communication: 1
    }
  };
  const weighted = trackWeights[state.profile.track] || Object.fromEntries(names.map(s => [s, 1])),
    denominator = names.reduce((n, s) => n + (weighted[s] || 0), 0) || 1;
  return {
    score: Math.round(dimensions.reduce((n, d) => n + d.score * (weighted[d.skill] || 0), 0) / denominator),
    skillScores: Object.fromEntries(dimensions.map(d => [d.skill, d.score])),
    dimensions,
    illustrative: false,
    explanation: 'Preparation readiness combines scored evidence, breadth, coverage and recency for your selected track. Self-reported practice adds effort history, not verified readiness. This estimate is not a hiring guarantee.'
  };
}
