import React, { useEffect, useRef, useState } from 'react';
import { useStore, niceDate, navigate } from '../lib/store.jsx';
import { Modal, Button, Badge, Icon } from './ui.jsx';
import Attachments from './Attachments.jsx';
export default function AssignmentWorkspace({
  id,
  close
}) {
  const {
      state,
      act,
      setModal
    } = useStore(),
    assignment = state.assignments.find(a => a.id === id),
    draft = state.assignmentDrafts?.[id];
  const [text, setText] = useState(draft?.text ?? assignment?.submission ?? ''),
    [url, setUrl] = useState(draft?.url ?? assignment?.submissionUrl ?? ''),
    [files, setFiles] = useState(draft?.files ?? assignment?.files ?? []),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [labAttemptId, setLabAttemptId] = useState(assignment?.labAttempt?.id || '');
  const saved = useRef(JSON.stringify([text, url, files.map(f => f.id)])),
    requestId = useRef(crypto.randomUUID());
  const readOnly = assignment?.status === 'graded';
  useEffect(() => {
    if (!assignment || readOnly || assignment.kind === 'Quiz') return;
    const value = JSON.stringify([text, url, files.map(f => f.id)]);
    if (value === saved.current) return;
    requestId.current = crypto.randomUUID();
    const timer = setTimeout(() => {
      act('assignment.draft', {
        id,
        text,
        url,
        files,
        fileIds: files.map(f => f.id)
      }).then(() => {
        saved.current = value;
      }).catch(e => setError(e.message));
    }, 600);
    return () => clearTimeout(timer);
  }, [text, url, files, readOnly, act, id]);
  if (!assignment) return <Modal title="Assignment unavailable" onClose={close}><p>Open an activity assigned to your account.</p></Modal>;
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await act('assignment.submit', {
        id,
        text,
        url,
        labAttemptId,
        fileIds: files.map(f => f.id),
        requestId: requestId.current
      }, 'Submission saved for your teacher to review.');
      close();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <Modal wide title={assignment.title} subtitle={`${assignment.teacher} · ${assignment.subject}${assignment.deadline ? ' · Due ' + niceDate(assignment.deadline) : ''}`} onClose={close}><div className="college-assignment-detail"><section><div className="inline-badges"><Badge>{assignment.kind || 'Assignment'}</Badge><Badge color={readOnly ? 'mint' : 'blue'}>{assignment.status}</Badge><Badge color="gray">{assignment.maxPoints || 100} points</Badge></div><h3>Brief and expected outcome</h3><p className="college-task-brief">{assignment.description}</p>{assignment.sourceUrl && <a className="btn btn-secondary" href={assignment.sourceUrl} target="_blank" rel="noreferrer">Open resource<Icon name="ArrowUpRight" size={14} /></a>}{assignment.resourceFiles?.length > 0 && <Attachments readOnly value={assignment.resourceFiles} />}<div className="college-review-criteria"><h4>Review criteria</h4><p>{assignment.rubric || 'Your teacher will review correctness and your explanation.'}</p><p>{assignment.latePolicy === 'closed' ? 'Submissions close after the deadline. Ask your teacher for an extension.' : 'Late work is accepted and marked late.'}</p></div>{assignment.projectId && <Button variant="secondary" onClick={() => setModal({
          type: 'project',
          id: assignment.projectId
        })}>Open project milestones</Button>}{assignment.feedback && <div className="college-teacher-feedback"><Badge color="mint">TEACHER FEEDBACK</Badge><strong>{assignment.grade}/{assignment.maxPoints}</strong><p>{assignment.feedback}</p><small>{assignment.reviewedBy}</small></div>}<details className="submission-history"><summary>Submission history · {assignment.versions?.length || 0} versions</summary>{[...(assignment.versions || [])].reverse().map(version => <article key={version.id}><Badge color="gray">Version {version.version}{version.late ? ' · late' : ''}</Badge><p>{new Date(version.time).toLocaleString('en-IN')}</p><p style={{
              whiteSpace: 'pre-wrap'
            }}>{version.text}</p>{version.url && <a href={version.url} target="_blank" rel="noreferrer">Submitted link</a>}<Attachments readOnly value={version.files || []} />{version.review && <p><strong>Review: {version.review.grade}/{assignment.maxPoints}</strong><br />{version.review.feedback}</p>}</article>)}</details></section><section>{assignment.kind === 'Quiz' ? <div className="college-assigned-quiz"><Icon name="Brain" size={40} /><h2>{readOnly ? 'Your graded attempt is saved.' : 'Complete your assigned assessment.'}</h2><p>{assignment.timeLimit ? assignment.timeLimit + ' minute limit · ' : ''}{assignment.maxAttempts || 1} allowed attempt(s). A separate practice attempt does not change your assignment grade.</p><Button onClick={() => setModal({
            type: 'quiz',
            id: assignment.quizId,
            assignmentId: readOnly ? undefined : assignment.id
          })}>{readOnly ? 'Open separate practice' : 'Start or resume assigned quiz'}</Button></div> : readOnly ? <><h3>Your reviewed submission</h3><p style={{
            whiteSpace: 'pre-wrap'
          }}>{assignment.submission}</p><Attachments readOnly value={assignment.files || []} /><p className="quiet-note">Your final grade and version history remain saved. A teacher can request a revision when further work is needed.</p></> : <form className="form-stack" onSubmit={submit}>{assignment.labId && <section><Button variant="secondary" onClick={() => {
              close();
              navigate('/practice?tab=assessments&lab=' + assignment.labId);
            }}>Open assigned lab</Button><label>Saved lab attempt<select required value={labAttemptId} onChange={e => setLabAttemptId(e.target.value)}><option value="">Select a saved attempt</option>{(state.assessmentAttempts || []).filter(a => a.labId === assignment.labId && Date.parse(a.time) >= Date.parse(assignment.createdAt)).map(a => <option key={a.id} value={a.id}>{a.score}% · {a.verification} · {new Date(a.time).toLocaleString()}</option>)}</select></label></section>}<h3>{assignment.status === 'revision requested' ? 'Improve your next version' : 'Your submission'}</h3><label>Explain your work<textarea required rows={8} minLength={10} maxLength={6000} value={text} onChange={e => setText(e.target.value)} /></label><label>Repository or document link<input type="url" value={url} maxLength={2000} onChange={e => setUrl(e.target.value)} placeholder="https://…" /></label><Attachments assignmentId={assignment.id} value={files} onChange={setFiles} /><p className="quiet-note">Your draft saves automatically. Submitting creates a version for review.</p>{error && <p className="error-text" role="alert">{error}</p>}<Button type="submit" disabled={busy}>{busy ? 'Submitting…' : assignment.submission ? 'Submit new version' : 'Submit for review'}</Button></form>}</section></div></Modal>;
}
