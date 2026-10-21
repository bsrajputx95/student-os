import React, { useEffect, useRef, useState } from 'react';
import { useStore, niceDate } from '../lib/store.jsx';
import { Button, Badge, Icon, Progress, Empty } from './ui.jsx';
import { practiceRoles, recommendedRole } from '../../shared/practice-roles.js';
export default function InterviewStudio({
  initialRole
} = {}) {
  const {
    state,
    request,
    refresh,
    act
  } = useStore();
  const [jobId, setJobId] = useState(''),
    [includeResume, setIncludeResume] = useState(false);
  const [role, setRole] = useState(initialRole || recommendedRole(state.profile).name),
    [round, setRound] = useState('Technical + introduction');
  const [session, setSession] = useState(null),
    [answer, setAnswer] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const saved = useRef('');
  useEffect(() => {
    if (initialRole) setRole(initialRole);
  }, [initialRole]);
  const history = [...(state.interviewSessions || [])].reverse();
  const current = session?.questions[session.responses.length];
  async function action(type, payload) {
    setBusy(true);
    setError('');
    try {
      const result = await request('/api/interview/' + type, payload);
      setSession(result.session);
      setAnswer(result.session.draft || '');
      saved.current = result.session.draft || '';
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function open(item) {
    setSession(item);
    setAnswer(item.draft || '');
    saved.current = item.draft || '';
    setError('');
  }
  useEffect(() => {
    if (!session || session.status !== 'active' || answer === saved.current || busy) return;
    const timer = setTimeout(() => {
      request('/api/interview/draft', {
        sessionId: session.id,
        answer
      }).then(() => {
        saved.current = answer;
      }).catch(e => setError(e.message));
    }, 600);
    return () => clearTimeout(timer);
  }, [answer, session?.id, session?.status, busy, request]);
  return <div className="interview-layout"><section className="card interview-room">
    <div className="interview-room-top"><Badge color="purple"><Icon name="AudioLines" size={14} />Interview studio</Badge><Badge color={state.aiConfigured ? 'mint' : 'gray'}>{state.aiConfigured ? 'AI interviewer connected' : 'Guided practice · AI not connected'}</Badge></div>
    {error && <p className="error-text" role="alert">{error}</p>}
    {!session ? <><div className="interviewer-orb"><div className="orb-ring ring-one" /><div className="orb-center"><Icon name="AudioLines" size={47} /></div></div><h2>Practise a real conversation.</h2><p>Choose your role and round. Your questions, answers, feedback and drafts stay saved.</p><div className="interview-config"><label>Target role<select value={role} onChange={e => setRole(e.target.value)}>{[...practiceRoles.map(r => r.name), ...state.catalog.tracks].map(t => <option key={t}>{t}</option>)}</select></label><label>Round<select value={round} onChange={e => setRound(e.target.value)}>{['Technical + introduction', 'Project conversation', 'Behavioural warm-up'].map(t => <option key={t}>{t}</option>)}</select></label><label>Practise for an opportunity<select value={jobId} onChange={e => setJobId(e.target.value)}><option value="">General preparation</option>{state.catalog.jobs.map(j => <option key={j.id} value={j.id}>{j.company} · {j.title}</option>)}</select></label><label><input type="checkbox" checked={includeResume} onChange={e => setIncludeResume(e.target.checked)} /> Include my current resume and project evidence in this interview</label></div><Button disabled={busy} onClick={() => action('start', {
          role,
          round,
          jobId,
          includeResume
        })}>{busy ? 'Opening…' : 'Start or resume interview'}</Button><p className="quiet-note">{state.aiConfigured ? 'AI reviews each answer and can ask a follow-up. You review feedback before using it to plan your next step.' : 'Role-specific prompts and transcript saving work now. Connect your AI provider for evaluated answers and adaptive follow-ups.'}</p></> : <>
      <div className="section-head"><div><h2>{session.round}</h2><p>{session.role} · {session.status}</p></div><Button variant="ghost" onClick={() => setSession(null)}>All interviews</Button></div>
      <Progress value={session.responses.length / session.questions.length * 100} />
      {session.status === 'active' && current ? <div className="interview-question"><span>QUESTION {session.responses.length + 1} OF {session.questions.length}</span><h2>{current.text}</h2><ul>{current.tips.map(t => <li key={t}>{t}</li>)}</ul><label htmlFor="interview-answer">Your answer<textarea id="interview-answer" rows={7} value={answer} maxLength={6000} onChange={e => setAnswer(e.target.value)} placeholder="Use a concrete example, explain your reasoning, and describe how you would check the result." /></label><div className="answer-footer"><small>{answer.length} / 6000 · Draft saves automatically</small><Button disabled={busy || answer.trim().length < 40} onClick={() => action('answer', {
              sessionId: session.id,
              questionId: current.id,
              answer
            })}>{busy ? 'Reviewing…' : 'Submit answer & continue'}</Button></div></div> : <div className="interview-finished"><Badge color="mint">{session.status === 'completed' ? 'INTERVIEW SAVED' : 'ARCHIVED'}</Badge><h2>{session.score === null || session.score === undefined ? 'Your practice transcript.' : `${session.score}% · AI feedback`}</h2><p>{session.responses.length} answers saved. Review the feedback and choose one improvement for your next session.</p></div>}
      <div className="interview-transcript">{session.responses.map((response, i) => <details key={response.id} open={i === session.responses.length - 1}><summary>Question {i + 1} · {response.question}</summary><p className="interview-saved-answer">{response.answer}</p><Badge color={response.feedback.mode === 'ai-reviewed' ? 'mint' : 'gray'}>{response.feedback.mode === 'ai-reviewed' ? `AI review · ${response.feedback.score}%` : 'Local writing guidance'}</Badge><p>{response.feedback.summary}</p>{response.feedback.strengths.length > 0 && <p>Strengths: {response.feedback.strengths.join(' · ')}</p>}<ul>{response.feedback.suggestions.map((s, index) => <li key={s}>{s}<Button variant="ghost" onClick={() => act('interview.plan', {
                  sessionId: session.id,
                  responseId: response.id,
                  index
                }, 'Feedback added to your plan.').catch(() => {})}>Add to plan</Button></li>)}</ul></details>)}</div>
    </>}
  </section><aside className="interview-side"><section className="card"><h3>Your interview history</h3>{history.length ? history.map(item => <button className="mission-open-step" key={item.id} onClick={() => open(item)}><Icon name={item.status === 'completed' ? 'CircleCheck' : 'MessagesSquare'} size={18} /><div><strong>{item.role}</strong><small>{item.round} · {niceDate(item.createdAt.slice(0, 10))} · {item.responses.length}/{item.questions.length} answers</small></div></button>) : <Empty title="Your first conversation starts here." description="Return to a saved interview whenever you need to." />}</section><section className="soft-tip"><h3>Make the answer yours.</h3><p>Explain what you know. Be honest about a gap. Use your own project evidence and discuss one test or tradeoff.</p></section></aside></div>;
}
