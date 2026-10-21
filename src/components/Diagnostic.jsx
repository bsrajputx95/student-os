import React, { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Modal, Button, Badge, Progress } from './ui.jsx';
export default function Diagnostic({
  close
}) {
  const {
    state,
    request,
    refresh
  } = useStore();
  const [session, setSession] = useState(null),
    [answers, setAnswers] = useState([]),
    [index, setIndex] = useState(0),
    [result, setResult] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function start() {
    setBusy(true);
    try {
      const next = await request('/api/diagnostic/start', {});
      setSession(next.session);
      setAnswers(next.session.answers);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    setBusy(true);
    try {
      const next = await request('/api/diagnostic/submit', {
        sessionId: session.id,
        answers
      });
      setResult(next);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function select(answer) {
    const next = answers.map((v, i) => i === index ? answer : v);
    setAnswers(next);
    request('/api/diagnostic/draft', {
      sessionId: session.id,
      answers: next
    }).catch(e => setError(e.message));
  }
  const previous = state.profile.diagnostic;
  return <Modal wide title="Find your starting point" subtitle="A short baseline check makes your plan more useful. No XP farming or hiring claims." onClose={close}>{error && <p className="error-text" role="alert">{error}</p>}{result ? <><Badge color="mint">BASELINE SAVED</Badge><h2>{result.result.overall}% on this starting-point check</h2><div className="diagnostic-scores">{Object.entries(result.result.scores).map(([skill, score]) => <div key={skill}><strong>{skill}</strong><Progress value={score} /><span>{score}%</span></div>)}</div><p>Focus next on: {result.result.gaps.join(', ') || 'progressively harder practice'}.</p><p>{result.result.explanation}</p><details><summary>Review your answers</summary>{result.review.map((r, i) => <div key={i}><strong>{r.passed ? 'Correct' : 'Review'} · {r.question}</strong><p>{r.explanation}</p></div>)}</details><Button onClick={close}>Return to my plan</Button></> : !session ? <><h2>A plan should start with evidence.</h2><p>Answer up to 15 foundation questions across the skills used by your selected track. Your responses save as you go. The result adjusts your starting difficulty and highlights revision areas.</p>{previous && <p>Last baseline: {previous.overall}% on {previous.date}. Retakes are available after seven days.</p>}<Button disabled={busy} onClick={start}>{busy ? 'Preparing…' : 'Start or resume diagnostic'}</Button></> : <><Badge>{session.questions[index].skill}</Badge><p>Question {index + 1} of {session.questions.length}</p><Progress value={(index + 1) / session.questions.length * 100} /><h2 style={{
        whiteSpace: 'pre-wrap'
      }}>{session.questions[index].text}</h2><div className="answer-options">{session.questions[index].options.map((option, n) => <button key={n} className={answers[index] === n ? 'selected' : ''} onClick={() => select(n)}>{option}</button>)}</div><div className="quiz-bottom"><Button variant="ghost" disabled={index === 0} onClick={() => setIndex(i => i - 1)}>Previous</Button>{index < session.questions.length - 1 ? <Button onClick={() => setIndex(i => i + 1)}>Next</Button> : <Button disabled={busy || answers.some(a => a === null)} onClick={submit}>{busy ? 'Checking…' : 'Build my baseline'}</Button>}</div></>}</Modal>;
}
