import React, { useState, useRef, useEffect } from 'react';
import { useStore, navigate } from '../lib/store.jsx';
import { Button, Icon, IconButton, Modal, Badge } from './ui.jsx';
import { AcademicReport, SupportPlan, AnswerText } from './QuidEvidence.jsx';
export default function Quid() {
  const {
    state,
    assistant,
    setAssistant,
    request
  } = useStore();
  const [text, setText] = useState(''),
    [messages, setMessages] = useState(state.quidMessages || []),
    [busy, setBusy] = useState(false);
  const bottom = useRef(null),
    latest = useRef(null);
  const staff = ['teacher', 'placement', 'support', 'admin'].includes(state.profile.role);
  const [studentId, setStudentId] = useState(assistant?.studentId || '');
  const students = (state.communityPeople || []).filter(p => p.role === 'student');
  useEffect(() => {
    if (assistant?.studentId) setStudentId(assistant.studentId);
  }, [assistant?.studentId]);
  useEffect(() => {
    (busy ? bottom : latest).current?.scrollIntoView({
      block: busy ? 'nearest' : 'start'
    });
  }, [messages, busy, assistant]);
  async function send(message, targetStudentId = studentId) {
    if (!message.trim() || busy) return;
    setText('');
    setMessages(m => [...m, {
      role: 'you',
      text: message
    }]);
    setBusy(true);
    try {
      const reply = await request('/api/quid', {
        message,
        page: window.location.pathname,
        topic: assistant?.topic,
        ...(staff ? {
          studentId: targetStudentId
        } : {})
      });
      setMessages(reply.messages || []);
      if (reply.context?.studentId) setStudentId(reply.context.studentId);else if (reply.context?.kind === 'college') setStudentId('');
    } catch (e) {
      setMessages(m => [...m, {
        role: 'quid',
        text: e.message
      }]);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (assistant?.topic) {
      setText('Explain ' + assistant.topic);
    }
  }, [assistant?.topic]);
  if (!assistant) return <button className="quid-launcher" onClick={() => setAssistant({
    topic: ''
  })}><span className="quid-symbol">q<sup>✦</sup></span><span>Ask Quid</span><Icon name="Sparkles" size={15} /></button>;
  return <section className="quid-panel" role="dialog" aria-label="Quid assistant" onKeyDown={e => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setAssistant(null);
    }
  }}><header><span className="quid-symbol">q<sup>✦</sup></span><div><strong>Quid</strong><small>{state.aiConfigured ? 'Your connected AI companion' : 'Saved records connected'}</small></div><Button variant="ghost" disabled={busy} onClick={() => request('/api/quid', {
        clear: true
      }).then(() => setMessages([])).catch(() => {})}>Clear</Button><IconButton name="X" label="Close Quid" onClick={() => setAssistant(null)} /></header>{staff && <div className="quid-context-picker"><label>Academic context<select aria-label="Student context for Quid" value={studentId} onChange={e => setStudentId(e.target.value)}><option value="">College overview · or name a student</option>{students.map(p => <option key={p.id} value={p.id}>{p.name} · Year {p.year} · @{p.handle}</option>)}</select></label><small>Uses your college’s authorized academic records.</small></div>}<div className="quid-messages"><div className="quid-intro"><span>✦</span><h3>A little help, wherever you are.</h3><p>{['teacher', 'placement', 'support', 'admin'].includes(state.profile.role) ? 'Ask about a student’s recorded progress, submissions, strengths and next steps. Choose a student or use their name in your question.' : 'Your plan, learning, scored practice, projects and career preparation help Quid guide your next step.'}</p><div className="quid-quick">{(['teacher', 'placement', 'support', 'admin'].includes(state.profile.role) ? ['Who needs help with DSA?', 'Show final year students below 50 in SQL', 'What support would help this student?', 'Open placements'] : ['What should I focus on today?', 'Where am I improving?', 'Help with my weak topics', 'Practise an interview']).map(q => <button key={q} onClick={() => send(q)}>{q}<Icon name="ArrowUpRight" size={13} /></button>)}</div></div>{messages.map((m, i) => <div key={i} ref={i === messages.length - 1 ? latest : null} className={`quid-message ${m.role}`}><small className="quid-message-meta"><span>{m.role === "you" ? "You" : "Quid"}</span>{m.mode && <span className="quid-mode-tag">{m.mode === "ai" ? "AI response" : m.mode === "records" ? "Saved records" : "App guide"}</span>}{m.time && <time dateTime={m.time}>{new Date(m.time).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit"
            })}</time>}</small><AnswerText text={m.text} />{m.providerNotice && <p className="quid-provider-notice" role="status">{m.providerNotice}</p>}{m.report && <AcademicReport report={m.report} onStudent={p => {
          setStudentId(p.id);
          send("What specific support can we give " + p.name + "? Review their gaps, evidence and next steps.", p.id);
        }} />}{m.supportPlan && <SupportPlan plan={m.supportPlan} />}{m.context && <div className="quid-source-tags"><strong>{m.context.name}</strong>{m.context.sources?.map(s => <span key={s}>{s}</span>)}</div>}{m.studentChoices && <div className="quid-links">{m.studentChoices.map(p => <button key={p.id} onClick={() => {
            setStudentId(p.id);
            send('Review ' + p.name + ' and suggest the next useful improvement.', p.id);
          }}>{p.name} · Year {p.year} · @{p.handle}</button>)}</div>}{m.actions && <div className="quid-links">{m.actions.map(a => <button key={a.route} onClick={() => {
            navigate(a.route);
            setAssistant(null);
          }}>{a.label}<Icon name="ArrowUpRight" size={12} /></button>)}</div>}</div>)}{busy && <p className="quid-thinking" role="status">Quid is thinking…</p>}<div ref={bottom} /></div><footer>{!state.aiConfigured && <small>Saved-record summaries work now · connect AI for open-ended coaching</small>}<form onSubmit={e => {
        e.preventDefault();
        send(text);
      }}><input autoFocus aria-label="Ask Quid" value={text} onChange={e => setText(e.target.value)} placeholder={staff ? "Ask about progress, work or support…" : "Ask about your next step…"} maxLength={2000} /><button className="quid-send" aria-label="Send to Quid" disabled={busy || !text.trim()}><Icon name="ArrowUp" size={19} /></button></form></footer></section>;
}
export function ResumeAI({
  close
}) {
  const {
    state,
    request,
    act
  } = useStore();
  const [instruction, setInstruction] = useState('Make my summary concise and relevant to the role. Keep only facts from my resume.'),
    [role, setRole] = useState(state.profile.track),
    [result, setResult] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function generate() {
    setBusy(true);
    setError('');
    try {
      setResult(await request('/api/resume/assist', {
        instruction,
        targetRole: role
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <Modal wide title="Edit your resume with Quid" subtitle="Review every change before it becomes part of your story." onClose={close}><div className="resume-ai-grid"><section className="form-stack"><Badge color={state.aiConfigured ? 'mint' : 'gray'}>{state.aiConfigured ? 'AI connected' : 'Local suggestions · AI not connected'}</Badge><label>Target role<input value={role} onChange={e => setRole(e.target.value)} /></label><label>How can Quid help?<textarea rows={5} value={instruction} onChange={e => setInstruction(e.target.value)} /></label><Button disabled={busy} icon="Sparkles" onClick={generate}>{busy ? 'Preparing draft…' : state.aiConfigured ? 'Generate AI edit' : 'Review local suggestions'}</Button><p className="quiet-note">Your original stays saved. Quid uses existing facts and keeps new claims out of the draft.</p>{error && <p role="alert" className="error-text">{error}</p>}{state.resumeHistory?.length > 0 && <Button variant="ghost" icon="RotateCcw" onClick={() => act('resume.undo-ai', {}, 'Previous resume restored.').then(close)}>Undo last Quid edit</Button>}</section><section>{result ? <><h3>Review your draft</h3>{result.message && <p className="body-copy">{result.message}</p>}<div className="resume-diff"><div><small>CURRENT HEADLINE</small><p>{state.resume.headline || 'No headline yet'}</p></div><div><small>PROPOSED HEADLINE</small><input aria-label="Proposed headline" value={result.draft.headline} onChange={e => setResult({
                ...result,
                draft: {
                  ...result.draft,
                  headline: e.target.value
                }
              })} /></div><div><small>CURRENT SUMMARY</small><p>{state.resume.summary || 'No summary yet'}</p></div><div><small>PROPOSED SUMMARY</small><textarea aria-label="Proposed summary" rows={5} value={result.draft.summary} onChange={e => setResult({
                ...result,
                draft: {
                  ...result.draft,
                  summary: e.target.value
                }
              })} /></div></div><ul className="clean-check-list">{(result.suggestions || []).map((s, i) => <li key={i}><Icon name="Lightbulb" size={14} />{String(s)}</li>)}</ul><Button icon="Check" onClick={() => act('resume.apply-ai', {
            draft: result.draft
          }, 'Your reviewed resume edit is saved.').then(close)}>Apply reviewed changes</Button></> : <div className="resume-ai-empty"><Icon name="FileUser" size={42} /><h3>Your voice. A clearer story.</h3><p>Polish your headline and summary, tailor them to a role, and review the result here.</p></div>}</section></div></Modal>;
}
