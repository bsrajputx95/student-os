import { can } from '../../shared/permissions.js';
import { Extensions, ProjectReviews } from './AcademicTools.jsx';
import Attachments from '../components/Attachments.jsx';
import React, { useEffect, useState } from 'react';
import { useCampus } from './context.jsx';
import { useStore, niceDate, today, navigate } from '../lib/store.jsx';
import { Modal, Icon, Button, Badge, Tabs, Progress, Empty } from '../components/ui.jsx';
import { StudentAvatar, ReadinessBadge } from './Students.jsx';
import Compose from './Compose.jsx';
export function StaffDialogs() {
  const {
    state
  } = useStore();
  const {
    dialog,
    setDialog
  } = useCampus();
  if (!dialog) return null;
  const close = () => setDialog(null);
  const permission = {
    compose: 'content.publish',
    review: 'submission.review',
    drive: 'placement.manage'
  }[dialog.type];
  if (permission && !can(state.profile, permission)) return <Modal title="College role access" onClose={close}><p>Your college role can view academic progress. Publishing, grading and drive management require the corresponding staff permission.</p><Button onClick={close}>Return to workspace</Button></Modal>;
  switch (dialog.type) {
    case 'compose':
      return <Compose {...dialog} close={close} />;
    case 'student':
      return <StudentDetail id={dialog.id} close={close} />;
    case 'review':
      return <Review {...dialog} close={close} />;
    case 'item':
      return <ItemDetail id={dialog.id} close={close} />;
    case 'drive':
      return <CreateDrive close={close} />;
    default:
      return null;
  }
}
function StudentDetail({
  id,
  close
}) {
  const {
    state,
    setAssistant
  } = useStore();
  const {
    data,
    setDialog,
    mutate
  } = useCampus();
  const [detail, setDetail] = useState(null),
    [error, setError] = useState(''),
    [tab, setTab] = useState('progress'),
    [note, setNote] = useState(''),
    [followUp, setFollowUp] = useState(''),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/staff/student?id=' + encodeURIComponent(id), {
      signal: controller.signal
    }).then(async r => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      return d;
    }).then(setDetail).catch(e => {
      if (e.name !== 'AbortError') setError(e.message);
    });
    return () => controller.abort();
  }, [id, data]);
  async function addNote(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await mutate('note.add', {
        studentId: id,
        text: note,
        followUp
      }, 'Mentor note saved. This note is visible to college staff.');
      setNote('');
    } finally {
      setSaving(false);
    }
  }
  if (!detail) return <Modal title="Student profile" onClose={close}><div className="staff-small-empty">{error || 'Opening their learning story…'}</div></Modal>;
  const {
    profile,
    summary
  } = detail;
  const history = detail.skillHistory.toSorted((a, b) => a.date.localeCompare(b.date)).slice(-6),
    averages = history.map(h => profile.isDemo ? Math.round(Object.values(h.skills).reduce((n, v) => n + v, 0) / Object.keys(h.skills).length) : h.readiness ?? 0);
  return <Modal wide title={`${profile.name} · Student profile`} subtitle="Learning, preparation, and career progress — from the connected student workspace." onClose={close} className="staff-student-modal"><div className="staff-student-detail-head"><StudentAvatar student={summary} large /><div><div><h2>{profile.name}</h2><Badge color="purple">Year {profile.year}</Badge></div><p>@{profile.handle} · {profile.studentId}</p><small>{summary.department} · Section {summary.section} · {profile.track}</small></div><div className="staff-student-detail-actions"><ReadinessBadge value={summary.readiness} /><Button variant="secondary" icon="Sparkles" onClick={() => {
          close();
          setAssistant({
            studentId: id,
            topic: ''
          });
        }}>Ask Quid about this student</Button><Button variant="secondary" icon="MessageCircle" onClick={() => can(state.profile, 'content.publish') ? setDialog({
          type: 'compose',
          kind: 'Feedback',
          studentIds: [id]
        }) : navigate('/staff/messages?tab=' + id)}>Suggest improvements</Button></div></div><div className="staff-student-detail-stats">{[[summary.solved, 'problems practiced'], [summary.quizScore + '%', 'quiz accuracy'], [summary.completedProjects, 'completed projects'], [summary.active7 + '/7', 'active days'], [summary.cgpa ?? '—', 'CGPA record']].map(([n, label]) => <span key={label}><strong>{n}</strong><small>{label}</small></span>)}</div><Tabs items={[{
      id: 'progress',
      label: 'Skills & progress'
    }, {
      id: 'work',
      label: 'Assignments & quizzes',
      count: detail.assignments.length
    }, {
      id: 'career',
      label: 'Career & resume'
    }, {
      id: 'guidance',
      label: 'Guidance & notes'
    }]} value={tab} onChange={setTab} />{tab === 'progress' ? <div className="staff-detail-progress"><section><h3>Skills, in focus</h3>{Object.entries(detail.skills).map(([s, n]) => <div className="staff-skill-bar" key={s}><span>{s}</span><Progress value={n} color={n >= 70 ? 'mint' : 'purple'} /><strong>{n}%</strong></div>)}<div className="staff-detail-path"><Icon name="Route" size={21} /><div><strong>Day {detail.journey.day} of {detail.journey.totalDays}</strong><small>{profile.track} · {detail.journey.xp.toLocaleString()} XP</small><Progress value={detail.journey.day / detail.journey.totalDays * 100} /></div></div></section><section className="staff-detail-learning"><h3>Learning progress</h3>{state.catalog.courses.map(c => <div key={c.id}><span>{c.title}</span><small>{detail.courseProgress[c.id] || 0}/{c.lessons}</small><Progress value={(detail.courseProgress[c.id] || 0) / c.lessons * 100} /></div>)}{history.length > 1 && <><h4>Saved learning history</h4><svg className="staff-detail-chart" viewBox="0 0 440 130" role="img" aria-label={`Readiness history from ${averages[0]} to ${averages.at(-1)}`}><path d={averages.map((v, i) => `${i ? 'L' : 'M'}${20 + i * (400 / Math.max(1, averages.length - 1))} ${110 - v}`).join(' ')} fill="none" stroke="#8d73c6" strokeWidth="3" />{averages.map((v, i) => <g key={i}><circle cx={20 + i * 400 / Math.max(1, averages.length - 1)} cy={110 - v} r="4" fill="#8d73c6" /><text x={20 + i * 400 / Math.max(1, averages.length - 1)} y="126" textAnchor="middle" fontSize="8" fill="#8d839a">{history[i].date.slice(5)}</text></g>)}</svg></>}</section></div> : tab === 'work' ? <div className="staff-detail-work">{detail.assignments.map(a => <article key={a.id}><div><Badge color={a.status === 'graded' ? 'mint' : a.status === 'submitted' ? 'blue' : 'peach'}>{a.status}</Badge><Badge color="gray">{a.kind || 'Assignment'}</Badge></div><h3>{a.title}</h3><p>{a.subject} · {a.deadline ? 'Due ' + niceDate(a.deadline) : 'No deadline'} · {a.teacher}</p>{a.grade !== undefined && a.grade !== null && <strong>{a.grade}/{a.maxPoints} points</strong>}{a.feedback && <p className="staff-review-feedback">{a.feedback}</p>}<div className="row-actions">{a.submissionUrl && <a href={a.submissionUrl} target="_blank" rel="noreferrer">Open submission ↗</a>}{a.sourceId && a.submission && can(state.profile, 'submission.review') && <Button variant="secondary" icon="NotebookPen" onClick={() => setDialog({
            type: 'review',
            itemId: a.sourceId,
            studentId: id
          })}>Review submission</Button>}</div></article>)}{!detail.assignments.length && <Empty icon="NotebookPen" title="A clear slate for new work." description="Assignments you share will appear in this student’s workspace and here." action={can(state.profile, 'content.publish') ? 'Assign work' : undefined} onAction={() => setDialog({
        type: 'compose',
        kind: 'Assignment',
        studentIds: [id]
      })} />}<h3>Assessment lab attempts</h3>{(detail.assessmentAttempts || []).map(a => <div className="staff-detail-application" key={a.id}><span><strong>{a.title}</strong><small>{a.verification} · {a.mode} · {a.date}</small><p>{a.explanation}</p></span><Badge color={a.passed ? 'mint' : 'peach'}>{a.score}%</Badge></div>)}{!detail.assessmentAttempts?.length && <p className="staff-muted">No hands-on assessment attempts recorded yet.</p>}<h3>Quiz attempts</h3><div className="staff-detail-quizzes">{detail.quizAttempts.map((q, i) => <div key={q.id || i}><Icon name="Brain" size={19} /><span>{state.catalog.quizzes.find(c => c.id === q.quizId)?.title || 'Topic quiz'}<small>{q.date}</small></span><Badge color={q.score >= 70 ? 'mint' : 'peach'}>{q.score}%</Badge></div>)}{!detail.quizAttempts.length && <p className="staff-muted">No quiz attempts have been recorded yet.</p>}</div></div> : tab === 'career' ? <div className="staff-detail-career"><section><h3>{detail.resume.headline || 'Resume in progress'}</h3><p>{detail.resume.summary || 'This student has not written a summary yet.'}</p><div className="staff-resume-contact">{detail.resume.email && <span>{detail.resume.email}</span>}{detail.resume.location && <span>{detail.resume.location}</span>}{detail.resume.github && <span>{detail.resume.github}</span>}</div><h4>Education</h4><p>{detail.resume.education || 'No education details added.'}</p><ProjectReviews detail={detail} /><h4>Completed portfolio projects</h4>{detail.resumeProjects.map(id => {
          const p = state.catalog.projects.find(p => p.id === id);
          return p && <div className="staff-detail-project" key={id}><Icon name="Blocks" size={19} /><span><strong>{p.title}</strong><small>{p.skills.join(' · ')}</small></span></div>;
        })}{!detail.resumeProjects.length && <p className="staff-muted">No completed projects added to the resume yet.</p>}{detail.targetCompanies?.length > 0 && <><h4>Company preparation interests</h4><div className="staff-cohort-pills">{detail.targetCompanies.map(c => <Badge key={c} color="blue">{c}</Badge>)}</div></>}<h4>Applications</h4>{detail.applications.map(a => <div className="staff-detail-application" key={a.id}><span><strong>{a.company}</strong><small>{a.title}</small></span><Badge color={a.status === 'Selected' ? 'mint' : 'purple'}>{a.status}</Badge></div>)}{!detail.applications.length && <p className="staff-muted">No applications recorded.</p>}</section><aside><h3>Role matches to explore</h3><p className="staff-muted">Preparation signals and year alignment. Confirm employer eligibility at the source.</p>{detail.jobMatches.slice(0, 5).map(j => <div className="staff-detail-job" key={j.id}><div><strong>{j.company}</strong><ReadinessBadge value={j.score} /></div><p>{j.title}</p><small>{j.yearMatch ? 'College-year aligned' : 'Check year eligibility'} · {j.country}</small><button className="staff-inline-link" onClick={() => setDialog({
            type: 'compose',
            kind: 'Opportunity',
            jobId: j.id,
            studentIds: [id]
          })}>Recommend this role<Icon name="Send" size={13} /></button></div>)}</aside></div> : <div className="staff-detail-guidance"><section><h3>Guidance shared with the student</h3>{detail.staffMessages.map(m => <article className="staff-guidance-thread" key={m.id}><div><Badge color={m.kind === 'Feedback' ? 'purple' : 'blue'}>{m.kind}</Badge><small>{m.read ? 'Acknowledged' : 'Delivered'} · {m.sender}</small></div><h4>{m.title}</h4><p>{m.text}</p>{m.replies.map(r => <blockquote key={r.id}><strong>{profile.name} replied</strong><p>{r.text}</p></blockquote>)}</article>)}{!detail.staffMessages.length && <p className="staff-muted">A useful check-in can be the start of better progress.</p>}<Button variant="secondary" icon="Send" onClick={() => can(state.profile, 'content.publish') ? setDialog({
          type: 'compose',
          kind: 'Feedback',
          studentIds: [id]
        }) : navigate('/staff/messages?tab=' + id)}>Send guidance to this student</Button></section><aside><h3>Private mentor notes</h3><p className="staff-muted">Shared with college staff. These notes do not appear in the student’s feed.</p>{detail.notes.map(n => <article className={`staff-mentor-note ${n.resolved ? 'resolved' : ''}`} key={n.id}><p>{n.text}</p><small>{n.author}{n.followUp ? ' · Follow up ' + niceDate(n.followUp) : ''}</small><button onClick={() => mutate('note.resolve', {
            id: n.id
          }, n.resolved ? 'Follow-up reopened.' : 'Follow-up marked complete.').catch(() => {})}><Icon name={n.resolved ? 'RotateCcw' : 'Check'} size={13} />{n.resolved ? 'Reopen' : 'Mark complete'}</button></article>)}<form className="form-stack" onSubmit={addNote}><label>Add a note<textarea value={note} onChange={e => setNote(e.target.value)} rows={3} required placeholder="A useful observation or next step…" maxLength={2000} /></label><label>Follow-up date (optional)<input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)} /></label><Button type="submit" disabled={saving || !note.trim()} icon="Plus">Save mentor note</Button></form></aside></div>}</Modal>;
}
function Review({
  itemId,
  studentId,
  close
}) {
  const {
    data,
    mutate
  } = useCampus();
  const item = data.items.find(i => i.id === itemId),
    delivery = item?.deliveries.find(d => d.studentId === studentId);
  const [rubricEnabled, setRubricEnabled] = useState(false),
    [rubric, setRubric] = useState({
      correctness: 0,
      implementation: 0,
      explanation: 0,
      presentation: 0
    });
  const [grade, setGrade] = useState(delivery?.grade ?? ''),
    [feedback, setFeedback] = useState(delivery?.feedback || ''),
    [revision, setRevision] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  if (!delivery) return <Modal title="Submission unavailable" onClose={close}><p>The submission is no longer available in this college.</p></Modal>;
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await mutate('submission.review', {
        itemId,
        studentId,
        grade: rubricEnabled ? Object.values(rubric).reduce((n, v) => n + v, 0) / 100 * item.maxPoints : Number(grade),
        rubricScores: rubricEnabled ? rubric : null,
        feedback,
        requestRevision: revision
      }, revision ? 'Revision requested. The student can update and resubmit.' : 'Review saved and shared with the student.');
      close();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <Modal wide title="A review that helps them improve" subtitle={`${delivery.name} · ${item.title}`} onClose={close}><div className="staff-review-layout"><section><Badge color="blue">STUDENT SUBMISSION</Badge><h2>{item.title}</h2><p className="staff-muted">{delivery.name} · Year {delivery.year}{delivery.submittedAt ? ' · Submitted ' + new Date(delivery.submittedAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short'
          }) : ''}</p><div className="staff-submission-text">{delivery.submission}</div>{delivery.submissionUrl && <a className="btn btn-secondary" href={delivery.submissionUrl} target="_blank" rel="noreferrer">Open submitted work<Icon name="ArrowUpRight" size={15} /></a>}<Attachments readOnly value={delivery.files || []} />{delivery.labAttempt && <p>Linked lab: {delivery.labAttempt.title} · {delivery.labAttempt.score}% · {delivery.labAttempt.verification}</p>}<details className="submission-history"><summary>Submission versions</summary>{(delivery.versions || []).map(version => <article key={version.id}><strong>Version {version.version}</strong><p>{version.text}</p><Attachments readOnly value={version.files || []} />{version.review && <p>{version.review.grade}/{item.maxPoints} · {version.review.feedback}</p>}</article>)}</details><details className="staff-review-brief"><summary>Assignment brief & criteria</summary><p>{item.description}</p><strong>{item.rubric}</strong></details></section><form className="form-stack" onSubmit={save}><h3>Your feedback is the next step.</h3><label><input type="checkbox" checked={rubricEnabled} onChange={e => setRubricEnabled(e.target.checked)} />Use the standard four-criterion rubric</label>{rubricEnabled && <fieldset><legend>Score each criterion</legend>{Object.entries({
            correctness: 40,
            implementation: 30,
            explanation: 20,
            presentation: 10
          }).map(([key, max]) => <label key={key}>{key} / {max}<input type="number" min={0} max={max} value={rubric[key]} onChange={e => setRubric(r => ({
              ...r,
              [key]: Number(e.target.value)
            }))} /></label>)}<strong>{Object.values(rubric).reduce((n, v) => n + v, 0)}% · {Object.values(rubric).reduce((n, v) => n + v, 0) / 100 * item.maxPoints} points</strong></fieldset>}<label>Score out of {item.maxPoints}<input aria-label="Submission score" required={!rubricEnabled} disabled={rubricEnabled} type="number" min={0} max={item.maxPoints} value={grade} onChange={e => setGrade(e.target.value)} /></label><label>What went well? What should improve?<textarea aria-label="Submission feedback" required rows={7} value={feedback} onChange={e => setFeedback(e.target.value)} maxLength={3000} placeholder="Be specific. Point to something that worked and one useful next improvement." /></label><label className="staff-revision-toggle"><input type="checkbox" checked={revision} onChange={e => setRevision(e.target.checked)} /><span>Request a revision<small>The student can improve the work and resubmit.</small></span></label>{error && <p className="error-text" role="alert">{error}</p>}<Button disabled={busy} icon="Check" type="submit">{busy ? 'Sharing review…' : revision ? 'Share feedback & request revision' : 'Save & share review'}</Button></form></div></Modal>;
}
function ItemDetail({
  id,
  close
}) {
  const {
    state
  } = useStore();
  const {
    data,
    setDialog,
    mutate
  } = useCampus();
  const item = data.items.find(i => i.id === id);
  if (!item) return null;
  return <Modal wide title={item.title} subtitle={`${item.kind} · ${item.status} · ${item.targetIds.length} recipients`} onClose={close}><div className="staff-item-brief"><Badge>{item.subject}</Badge><p>{item.description}</p><div><span>By {item.author}</span>{item.deadline && <span>Due / follow-up {niceDate(item.deadline)}</span>}{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer">Resource link ↗</a>}</div></div><div className="staff-section-head"><div><h3>Delivery & response</h3><Extensions item={item} /><p>Connected to the student’s assignments and guidance.</p></div>{item.status === 'published' && can(state.profile, 'content.publish') && <Button variant="ghost" icon="Bookmark" onClick={() => mutate('item.archive', {
        id
      }, 'Archived in the staff workspace. Student records are retained.').then(close).catch(() => {})}>Archive record</Button>}</div><div className="staff-table-scroll"><table className="staff-delivery-table"><thead><tr><th>Student</th><th>Year</th><th>Status</th><th>Score / response</th><th /></tr></thead><tbody>{item.deliveries.map(d => <tr key={d.studentId}><td><button onClick={() => setDialog({
                type: 'student',
                id: d.studentId
              })}>{d.name}</button></td><td>Year {d.year}</td><td><Badge color={d.status === 'graded' ? 'mint' : d.status === 'submitted' ? 'blue' : 'gray'}>{d.status}</Badge></td><td>{d.grade !== null ? `${d.grade}/${d.maxPoints}` : d.replies.length ? `${d.replies.length} student repl${d.replies.length === 1 ? 'y' : 'ies'}` : '—'}</td><td>{d.submission && can(state.profile, 'submission.review') && <Button variant="secondary" icon="NotebookPen" onClick={() => setDialog({
                type: 'review',
                itemId: id,
                studentId: d.studentId
              })}>Review</Button>}</td></tr>)}</tbody></table></div>{item.deliveries.some(d => d.replies.length > 0) && <section className="staff-delivery-replies"><h3>Student replies</h3>{item.deliveries.filter(d => d.replies.length).map(d => <article key={d.studentId}><strong>{d.name}</strong>{d.replies.map(r => <p key={r.id}>{r.text}</p>)}<Button variant="ghost" icon="MessageCircle" onClick={() => setDialog({
          type: 'compose',
          kind: 'Message',
          studentIds: [d.studentId]
        })}>Reply with a message</Button></article>)}</section>}</Modal>;
}
function CreateDrive({
  close
}) {
  const {
    state
  } = useStore();
  const {
    data,
    mutate
  } = useCampus();
  const future = n => {
    const d = new Date(today() + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return d.toLocaleDateString('en-CA');
  };
  const [eligibility, setEligibility] = useState({
    minCgpa: 0,
    maxBacklogs: '',
    graduationYear: ''
  });
  const [form, setForm] = useState({
      company: '',
      title: '',
      description: '',
      date: future(14),
      deadline: future(10),
      sourceUrl: '',
      jobId: ''
    }),
    [selected, setSelected] = useState(data.students.filter(s => s.year === 4).map(s => s.id)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  function field(key, value) {
    setForm(f => ({
      ...f,
      [key]: value
    }));
  }
  async function publish(e) {
    e.preventDefault();
    setError('');
    if (!selected.length) {
      setError('Select at least one student.');
      return;
    }
    setBusy(true);
    try {
      await mutate('drive.create', {
        ...form,
        eligibility,
        audience: {
          scope: 'selected',
          ids: selected
        }
      }, `College drive published to ${selected.length} students. The pipeline is ready.`);
      close();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <Modal wide title="Bring your next college drive together" subtitle="Publish drive details, choose students, and track their progress through each round." onClose={close}><form className="staff-drive-form" onSubmit={publish}><section className="form-stack"><label>Start from a sourced role (optional)<select value={form.jobId} onChange={e => {
            const j = state.catalog.jobs.find(j => j.id === e.target.value);
            if (j) setForm(f => ({
              ...f,
              jobId: j.id,
              company: j.company,
              title: j.title,
              description: j.description + '\n\nCollege process: add the campus-specific schedule, eligibility, and next steps before publishing.',
              sourceUrl: j.sourceUrl
            }));else field('jobId', '');
          }}><option value="">Create a custom college drive</option>{state.catalog.jobs.map(j => <option key={j.id} value={j.id}>{j.company} · {j.title}</option>)}</select></label><div className="staff-form-two"><label>Company<input required value={form.company} onChange={e => field('company', e.target.value)} maxLength={100} placeholder="Company name" /></label><label>Role / drive title<input required value={form.title} onChange={e => field('title', e.target.value)} maxLength={140} placeholder="e.g. Graduate software engineering drive" /></label></div><label>Drive brief & eligibility<textarea required value={form.description} onChange={e => field('description', e.target.value)} rows={6} maxLength={5000} placeholder="Explain the role, requirements, rounds, campus arrangements, and what students need to do." /></label><div className="staff-form-two"><label>Drive date<input required type="date" value={form.date} onChange={e => field('date', e.target.value)} /></label><label>Student registration deadline<input required type="date" value={form.deadline} onChange={e => field('deadline', e.target.value)} /></label></div><div className="staff-form-two">{[['minCgpa', 'Minimum CGPA'], ['maxBacklogs', 'Maximum active backlogs'], ['graduationYear', 'Graduation year']].map(([key, label]) => <label key={key}>{label}<input type="number" min={key === 'graduationYear' ? 2020 : 0} max={key === 'minCgpa' ? 10 : key === 'graduationYear' ? 2100 : 50} step={key === 'minCgpa' ? '.1' : '1'} value={eligibility[key]} onChange={e => setEligibility(v => ({
              ...v,
              [key]: e.target.value
            }))} /></label>)}</div><label>Official application / information link<input type="url" value={form.sourceUrl} onChange={e => field('sourceUrl', e.target.value)} placeholder="https://…" /></label><div className="staff-publish-note"><Icon name="Info" size={17} /><span>This creates a college-published drive record. Confirm the employer relationship and actual campus arrangements before using it with a real college.</span></div></section><aside><div className="staff-section-head"><div><h3>Who’s invited?</h3><p>{selected.length} students selected · final-year students preselected</p></div></div><div className="staff-drive-audience-tools"><button type="button" onClick={() => setSelected(data.students.filter(s => s.year === 4).map(s => s.id))}>Final year</button><button type="button" onClick={() => setSelected(data.students.map(s => s.id))}>Whole college</button><button type="button" onClick={() => setSelected([])}>Clear</button></div><div className="staff-recipient-options">{data.students.map(s => <label key={s.id}><input type="checkbox" checked={selected.includes(s.id)} onChange={() => setSelected(ids => ids.includes(s.id) ? ids.filter(id => id !== s.id) : [...ids, s.id])} /><StudentAvatar student={s} /><span><strong>{s.name}</strong><small>Year {s.year} · {s.readiness}% ready</small></span></label>)}</div></aside><footer>{error && <p className="error-text" role="alert">{error}</p>}<Button type="button" variant="ghost" onClick={close}>Cancel</Button><Button type="submit" icon="Send" disabled={busy || !selected.length}>{busy ? 'Publishing…' : `Publish drive & invite ${selected.length}`}</Button></footer></form></Modal>;
}
