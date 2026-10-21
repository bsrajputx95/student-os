import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../lib/store.jsx';
import { Modal, Button, Badge, Progress, Icon } from './ui.jsx';
export default function QuizWorkspace({
  id,
  assignmentId,
  close
}) {
  const {
    state,
    act
  } = useStore();
  const assignment = assignmentId && state.assignments.find(a => a.id === assignmentId);
  const quiz = assignment?.quiz || state.catalog.quizzes.find(q => q.id === id) || state.assignments.find(a => a.quizId === id && a.quiz)?.quiz;
  const [session, setSession] = useState(null),
    [answers, setAnswers] = useState([]);
  const [index, setIndex] = useState(0),
    [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [now, setNow] = useState(Date.now());
  const started = useRef(false),
    saved = useRef('');
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    act('quiz.start', {
      id,
      assignmentId
    }).then(({
      session: next
    }) => {
      setSession(next);
      setAnswers(next.answers);
      saved.current = JSON.stringify(next.answers);
    }).catch(e => setError(e.message));
  }, [id, assignmentId, act]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!session || result || !answers.length || JSON.stringify(answers) === saved.current) return;
    const timer = setTimeout(() => {
      act('quiz.draft', {
        sessionId: session.id,
        answers
      }).then(() => {
        saved.current = JSON.stringify(answers);
      }).catch(e => setError(e.message));
    }, 400);
    return () => clearTimeout(timer);
  }, [answers, session?.id, result, act]);
  if (!quiz) return <Modal title="Quiz unavailable" onClose={close}><p>This quiz is no longer available. Ask your teacher for an updated assignment.</p></Modal>;
  const remaining = session?.deadline ? Math.max(0, Math.ceil((session.deadline - now) / 1000)) : null;
  async function submit() {
    setBusy(true);
    setError('');
    try {
      setResult(await act('quiz.submit', {
        id,
        assignmentId,
        sessionId: session.id,
        answers
      }, 'Attempt saved. Your score and linked assignment are updated.'));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <Modal title={quiz.title} subtitle={`${quiz.topic} · ${assignmentId ? 'Assigned assessment' : 'Practice quiz'}`} onClose={close} className="quiz-modal">
    {error && <p className="error-text" role="alert">{error}</p>}
    {result ? <div className="quiz-result"><Badge color={result.score >= 67 ? 'mint' : 'peach'}>{result.correct} / {result.total} correct</Badge><h2>{result.score}%</h2><p>Repeat practice keeps your history. Rewards come from improving your best score.</p><div className="quiz-review">{quiz.questions.map((q, i) => <div key={i}><Icon name={result.review[i].passed ? 'CircleCheck' : 'CircleHelp'} size={20} /><div><strong>{q.text}</strong><p>{result.review[i].explanation}</p></div></div>)}</div><Button onClick={close}>Finish review</Button></div> : !session ? <p role="status">{error ? 'Close this quiz and try again after the issue is resolved.' : 'Restoring your saved attempt…'}</p> : <>
      <div className="quiz-step"><Badge>{assignmentId ? 'FOR YOUR TEACHER' : 'SAVED PRACTICE'}</Badge><span>{remaining === null ? 'Answers save automatically' : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')} remaining`}</span></div>
      <Progress value={(index + 1) / quiz.questions.length * 100} />
      <p>Question {index + 1} of {quiz.questions.length}</p><h2 className="quiz-question">{quiz.questions[index].text}</h2>
      <div className="answer-options">{quiz.questions[index].options.map((option, i) => <button key={i} disabled={remaining === 0} className={answers[index] === i ? 'selected' : ''} onClick={() => setAnswers(a => a.map((v, n) => n === index ? i : v))}><span>{String.fromCharCode(65 + i)}</span>{option}</button>)}</div>
      {remaining === 0 && <p role="alert">This attempt has ended. Your saved answers remain available to your teacher.</p>}
      <div className="quiz-bottom"><Button variant="ghost" disabled={index === 0} onClick={() => setIndex(i => i - 1)}>Previous</Button>{index < quiz.questions.length - 1 ? <Button onClick={() => setIndex(i => i + 1)}>Next question</Button> : <Button disabled={busy || remaining === 0 || answers.some(a => a === null)} onClick={submit}>{busy ? 'Checking…' : 'Submit this attempt'}</Button>}</div>
    </>}
  </Modal>;
}
