import { randomUUID } from 'node:crypto';
import { aiConfigured, complete } from './quid.mjs';
import { boundedText, enumValue } from '../shared/validation.js';
import { applyAction } from './model.mjs';
import { catalog } from '../shared/catalog.js';
import { practiceRoles } from '../shared/practice-roles.js';
const technical = {
  'Full-stack development': [['Design an event-registration API. How do you prevent the same student registering twice?', 'Backend', ['Define a resource and status codes.', 'Consider a unique constraint and concurrent requests.']], ['Your page shows results from an old search after a new search finishes. Diagnose and fix the race.', 'Frontend', ['Describe request cancellation or request IDs.', 'Include loading, empty and error states.']], ['A payment webhook is delivered twice. Explain how you would keep the ledger correct.', 'Backend', ['Use idempotency keys and transactions.', 'Describe a regression test.']], ['A query becomes slow as the orders table grows. How would you investigate before adding an index?', 'Databases', ['Inspect the query plan and selectivity.', 'Measure and discuss write costs.']]],
  'Data science': [['Your fraud model has 99% accuracy but misses nearly every fraud case. What would you measure and change?', 'Databases', ['Discuss imbalance, recall and precision.', 'Choose evaluation data without leakage.']], ['A feature contains missing values. How would you decide between dropping rows and imputing?', 'Backend', ['Investigate the missingness mechanism.', 'Fit transformations only on training data.']], ['A model performs well offline and poorly after deployment. Describe your investigation.', 'DevOps', ['Check input distributions and preprocessing.', 'Separate drift, leakage and serving bugs.']], ['How would you explain uncertainty in a model prediction to a nontechnical stakeholder?', 'Communication', ['Use a concrete example.', 'Explain limitations and possible decisions.']]],
  'Data analytics': [['Revenue rose 20% this month. How would you determine whether business performance actually improved?', 'Databases', ['Break down price, volume and seasonality.', 'Check refunds, missing data and comparable periods.']], ['Joining orders to refunds doubled the revenue total. Explain the cause and a reliable query structure.', 'Databases', ['Reason about one-to-many joins.', 'Aggregate at the correct grain first.']], ['A stakeholder asks for a dashboard. How do you decide its metrics, filters and update frequency?', 'Communication', ['Start with the decision the dashboard supports.', 'Define metric ownership and source quality.']], ['Two teams report different active-user numbers. How would you reconcile them?', 'Databases', ['Compare definitions, time zones and deduplication.', 'Write a shared metric contract.']]],
  DevOps: [['A deployment returns intermittent 502 errors. Describe your first ten minutes of investigation.', 'DevOps', ['Check health, logs, upstreams and recent changes.', 'Define when to roll back.']], ['How do you rotate an application secret without downtime or committing it to Git?', 'DevOps', ['Separate configuration and secrets.', 'Describe overlap, revocation and auditing.']], ['A release passes tests but breaks production. How would you improve the delivery pipeline?', 'DevOps', ['Discuss staging parity and smoke checks.', 'Use gradual rollout and recovery checks.']], ['What would you monitor for a payment API, and how would you keep alerts actionable?', 'Backend', ['Consider latency, errors and saturation.', 'Distinguish symptoms from root causes.']]],
  'Explore my interests': [['Pick a small app you use. Explain its inputs, stored data, outputs and one possible failure.', 'Communication', ['Choose a concrete user action.', 'Explain the happy path and an error case.']], ['How would you find duplicate values in a list? Compare two approaches.', 'DSA', ['Use a small example.', 'Explain time and space costs.']], ['Describe how a browser gets information from a server.', 'Backend', ['Explain request, response and status.', 'Consider a failed request.']], ['What project would help you explore a technical interest, and how would you keep its scope manageable?', 'Frontend', ['Choose one user problem.', 'Define a small deliverable and a test.']]]
};
const behavioral = [['Tell me about a project you actually built. What did you personally contribute?', 'Communication', ['State the problem, your decision and the result.', 'Use facts you can explain and demonstrate.']], ['Describe a time you disagreed with a teammate. How did you reach a decision?', 'Communication', ['Explain the context without blaming.', 'Describe evidence, tradeoffs and the outcome.']], ['Tell me about a difficult bug. How did you narrow down the cause?', 'Communication', ['Give a concrete example.', 'Explain what you tested and learned.']], ['What would you improve in that project now, and how would you prioritize it?', 'Communication', ['Connect the change to a user need.', 'Include an implementation and validation plan.']]];
const question = ([text, skill, tips]) => ({
  id: randomUUID(),
  text,
  skill,
  tips
});
function localFeedback(answer) {
  const words = answer.trim().split(/\s+/).length;
  const dimensions = {
    specificity: /example|built|implemented|measured|tested|project|query|api/i.test(answer),
    reasoning: /because|tradeoff|trade-off|instead|therefore|constraint|choose|chose/i.test(answer),
    validation: /test|monitor|measure|verify|result|metric|assert/i.test(answer),
    clarity: words >= 35
  };
  const suggestions = [];
  if (!dimensions.specificity) suggestions.push('Add a specific example from your own work.');
  if (!dimensions.reasoning) suggestions.push('Explain why you chose this approach and one alternative.');
  if (!dimensions.validation) suggestions.push('Describe how you would test or measure the result.');
  if (!dimensions.clarity) suggestions.push('Develop your answer with context, a decision, and an outcome.');
  return {
    mode: 'structured-practice',
    score: null,
    summary: 'Saved for review. These writing prompts are local guidance, not an AI assessment.',
    strengths: Object.entries(dimensions).filter(([, ok]) => ok).map(([name]) => name),
    suggestions
  };
}
async function feedbackFor(session, current, answer, profile) {
  if (!aiConfigured()) return localFeedback(answer);
  const raw = await complete([{
    role: 'system',
    content: 'You are a constructive technical interviewer for a college student. Evaluate the answer to the supplied question, not the student as a person. Return JSON {score:0-100,summary:string,strengths:string[],suggestions:string[],followUp:string}. Use a follow-up only if it helps clarify a specific omission. Do not invent project facts or claim hiring eligibility. Keep feedback actionable and concise.'
  }, {
    role: 'user',
    content: JSON.stringify({
      role: session.role,
      round: session.round,
      year: profile.year,
      context: session.context || null,
      question: current.text,
      answer,
      previous: session.responses.slice(-2).map(r => ({
        question: r.question,
        answer: r.answer
      }))
    })
  }], true);
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('The AI returned an invalid review. Your draft remains saved; try again.');
  }
  if (!Number.isFinite(parsed.score) || parsed.score < 0 || parsed.score > 100 || typeof parsed.summary !== 'string' || !Array.isArray(parsed.suggestions) || !Array.isArray(parsed.strengths)) throw new Error('The AI review was incomplete. Your answer remains saved.');
  return {
    mode: 'ai-reviewed',
    score: Math.round(parsed.score),
    summary: parsed.summary.slice(0, 2000),
    strengths: parsed.strengths.slice(0, 5).map(v => String(v).slice(0, 500)),
    suggestions: parsed.suggestions.slice(0, 5).map(v => String(v).slice(0, 500)),
    followUp: typeof parsed.followUp === 'string' ? parsed.followUp.slice(0, 500) : ''
  };
}
export function createInterviewService({
  read,
  save,
  broadcast
}) {
  const locks = new Set();
  async function action(profileId, type, p = {}) {
    if (locks.has(profileId)) throw new Error('Your interview response is still being reviewed.');
    locks.add(profileId);
    try {
      const state = read(profileId);
      if (state.profile.role !== 'student') throw new Error('Open a student account for interview practice.');
      state.interviewSessions ||= [];
      if (type === 'start') {
        const role = enumValue(p.role || state.profile.track, [...Object.keys(technical), ...practiceRoles.map(r => r.name)], 'interview role'),
          round = enumValue(p.round || 'Technical + introduction', ['Technical + introduction', 'Project conversation', 'Behavioural warm-up'], 'interview round');
        const job = p.jobId ? catalog.jobs.find(j => j.id === p.jobId) : null;
        if (p.jobId && !job) throw new Error('Choose a sourced role.');
        const existing = state.interviewSessions.find(s => s.status === 'active' && s.role === role && s.round === round && s.jobId === (p.jobId || null));
        if (existing) return {
          session: existing
        };
        const roleProfile = practiceRoles.find(r => r.name === role);
        const rolePool = roleProfile ? [[roleProfile.interview, roleProfile.skills[0], ['State your assumptions and walk through a concrete example.', 'Explain a tradeoff and how you would validate the outcome.']], ...technical[roleProfile.track].slice(0, 2)] : technical[role];
        const pool = round === 'Behavioural warm-up' ? behavioral : round === 'Project conversation' ? [behavioral[0], rolePool[0], behavioral[2], behavioral[3]] : [behavioral[0], ...rolePool];
        const session = {
          id: randomUUID(),
          role,
          round,
          mode: aiConfigured() ? 'ai' : 'guided',
          jobId: p.jobId || null,
          context: {
            job: job ? {
              title: job.title,
              company: job.company,
              skills: job.skills,
              description: job.description
            } : null,
            resume: p.includeResume ? {
              ...state.resume,
              projectEvidence: state.projectEvidence || {}
            } : null
          },
          status: 'active',
          questions: pool.map(question),
          responses: [],
          draft: '',
          createdAt: new Date().toISOString(),
          followUps: 0
        };
        if (job) session.questions.unshift(question(['Describe how your demonstrated skills match ' + job.title + ' at ' + job.company + '. Name a gap and your next preparation step.', 'Communication', ['Use the supplied role description.', 'Describe only work you have actually completed.']]));
        if (p.includeResume && Object.keys(state.projectEvidence || {}).length) session.questions.splice(1, 0, question(['Choose a project from your resume. Explain your individual contribution, one tradeoff, and a test that supports your claims.', 'Communication', ['Use the evidence you saved with your project.', 'Explain what you would improve next.']]));
        state.interviewSessions.push(session);
        state.version++;
        save(state);
        broadcast(profileId);
        return {
          session
        };
      }
      const session = state.interviewSessions.find(s => s.id === p.sessionId);
      if (!session) throw new Error('Interview session not found.');
      if (type === 'draft') {
        if (session.status !== 'active') throw new Error('This interview is already complete.');
        session.draft = String(p.answer || '').slice(0, 6000);
        state.version++;
        save(state);
        return {
          session
        };
      }
      if (type === 'abandon') {
        session.status = 'archived';
        state.version++;
        save(state);
        return {
          session
        };
      }
      if (type !== 'answer' || session.status !== 'active') throw new Error('Choose an active interview.');
      const answer = boundedText(p.answer, 40, 6000, 'Interview answer'),
        current = session.questions[session.responses.length];
      if (!current || p.questionId !== current.id) throw new Error('This question has already been answered. Refresh the interview.');
      session.draft = answer;
      state.version++;
      save(state);
      const feedback = await feedbackFor(session, current, answer, state.profile);
      const fresh = read(profileId),
        saved = fresh.interviewSessions.find(s => s.id === session.id);
      if (saved.status !== 'active' || saved.responses.length !== session.responses.length) throw new Error('This interview changed. Refresh before continuing.');
      saved.responses.push({
        id: randomUUID(),
        questionId: current.id,
        question: current.text,
        skill: current.skill,
        answer,
        feedback,
        time: new Date().toISOString()
      });
      saved.draft = '';
      if (feedback.followUp && saved.followUps < 2 && saved.responses.length < saved.questions.length) {
        saved.questions.splice(saved.responses.length, 0, question([feedback.followUp, current.skill, ['Clarify the point raised by the interviewer.', 'Use your own example or explain the limitation.']]));
        saved.followUps++;
      }
      if (saved.responses.length === saved.questions.length) {
        saved.status = 'completed';
        saved.time = new Date().toISOString();
        const scores = saved.responses.map(r => r.feedback.score).filter(v => v !== null);
        saved.score = scores.length ? Math.round(scores.reduce((n, v) => n + v, 0) / scores.length) : null;
        saved.verification = scores.length ? 'ai-reviewed' : 'guided-practice';
        applyAction(fresh, 'interview.complete', {
          sessionId: saved.id
        });
      } else fresh.version++;
      save(fresh);
      broadcast(profileId);
      return {
        session: saved
      };
    } finally {
      locks.delete(profileId);
    }
  }
  return {
    action
  };
}
