import { randomUUID } from 'node:crypto';
import { quizzes } from '../shared/catalog.js';
import { getPath } from '../shared/paths.js';
function bankFor(skill) {
  return quizzes.filter(q => q.topic === skill).flatMap(q => q.questions.map((question, index) => ({
    quizId: q.id,
    index,
    skill,
    question
  })));
}
export function diagnosticAction(state, type, p = {}) {
  state.diagnosticSessions ||= [];
  if (type === 'start') {
    const old = state.diagnosticSessions.find(s => !s.submitted && s.startedAt + 3600000 > Date.now());
    if (old) return {
      session: publicSession(old)
    };
    const recent = state.diagnosticSessions.find(s => s.submitted && s.finishedAt + 7 * 86400000 > Date.now());
    if (recent) throw new Error('Your baseline was checked this week. Follow your review plan before taking another diagnostic.');
    const focus = getPath(state.profile.track).focus,
      skills = [...new Set([focus, 'DSA', 'Frontend', 'Backend', 'Databases', 'DevOps'])].slice(0, 5);
    const questions = skills.flatMap(skill => {
      const bank = bankFor(skill);
      return bank.slice(0, Math.min(3, bank.length)).map(({
        quizId,
        index,
        skill,
        question
      }) => ({
        id: randomUUID(),
        quizId,
        index,
        skill,
        text: question.text,
        options: question.options,
        correct: question.correct,
        explanation: question.explanation
      }));
    });
    const session = {
      id: randomUUID(),
      startedAt: Date.now(),
      questions,
      submitted: false,
      answers: Array(questions.length).fill(null)
    };
    state.diagnosticSessions.push(session);
    state.version++;
    return {
      session: publicSession(session)
    };
  }
  const session = state.diagnosticSessions.find(s => s.id === p.sessionId && !s.submitted);
  if (!session || session.startedAt + 3600000 < Date.now()) throw new Error('Start a new diagnostic attempt.');
  if (!Array.isArray(p.answers) || p.answers.length !== session.questions.length || p.answers.some((a, i) => a !== null && (!Number.isInteger(a) || a < 0 || a >= session.questions[i].options.length))) throw new Error('Choose valid diagnostic answers.');
  if (type === 'draft') {
    session.answers = p.answers;
    state.version++;
    return {
      session: publicSession(session)
    };
  }
  if (type !== 'submit' || p.answers.some(a => a === null)) throw new Error('Answer every diagnostic question.');
  session.answers = p.answers;
  session.submitted = true;
  session.finishedAt = Date.now();
  const skills = [...new Set(session.questions.map(q => q.skill))],
    scores = Object.fromEntries(skills.map(skill => {
      const selected = session.questions.map((q, i) => ({
        ...q,
        answer: p.answers[i]
      })).filter(q => q.skill === skill);
      return [skill, Math.round(selected.filter(q => q.answer === q.correct).length / selected.length * 100)];
    }));
  const overall = Math.round(Object.values(scores).reduce((n, v) => n + v, 0) / Object.keys(scores).length);
  const result = {
    sessionId: session.id,
    date: new Date().toISOString().slice(0, 10),
    scores,
    overall,
    verification: 'baseline-diagnostic',
    strengths: skills.filter(s => scores[s] >= 67),
    gaps: skills.filter(s => scores[s] < 67),
    explanation: 'A short starting-point check guides your plan. It is not a hiring assessment or a certificate of proficiency.'
  };
  state.profile.diagnostic = result;
  state.journey.baseline = overall;
  session.result = result;
  state.version++;
  return {
    result,
    review: session.questions.map((q, i) => ({
      question: q.text,
      passed: p.answers[i] === q.correct,
      explanation: q.explanation
    }))
  };
}
export function publicSession(session) {
  const {
    questions,
    ...meta
  } = session;
  return {
    ...meta,
    questions: questions.map(({
      correct,
      explanation,
      ...question
    }) => question)
  };
}
