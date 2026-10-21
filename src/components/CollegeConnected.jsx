export { default as CollegeAssignment } from './AssignmentWorkspace.jsx';
import React, { useState } from 'react';
import { useStore, navigate, niceDate, today } from '../lib/store.jsx';
import { Icon, Button, Badge, Empty, Modal, PageHead } from './ui.jsx';
export function CollegeAssignments() {
  const {
    state,
    setModal
  } = useStore();
  const [filter, setFilter] = useState('All work');
  const assignments = state.assignments.filter(a => filter === 'All work' || filter === 'To do' && ['pending', 'revision requested'].includes(a.status) || filter === 'Submitted' && a.status === 'submitted' || filter === 'Reviewed' && a.status === 'graded');
  return <><div className="section-head"><div><h2>From your classroom, with a purpose.</h2><p>Your teacher’s assignments, projects, and quizzes — with feedback that helps you improve.</p></div><Badge color="mint">{state.profile.college}</Badge></div><div className="filter-pills college-assignment-filters">{['All work', 'To do', 'Submitted', 'Reviewed'].map(f => <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>{f}</button>)}</div><div className="college-assignment-grid">{assignments.map(a => <article className="card college-assignment-card" key={a.id}><div><span className="assignment-icon tone-purple"><Icon name={a.kind === 'Quiz' ? 'Brain' : a.kind === 'Project' ? 'Blocks' : 'NotebookPen'} size={23} /></span><Badge color={a.status === 'graded' ? 'mint' : a.status === 'submitted' ? 'blue' : a.status === 'revision requested' ? 'peach' : 'purple'}>{a.status === 'graded' ? 'Reviewed' : a.status === 'submitted' ? 'Submitted' : a.status === 'revision requested' ? 'Revision requested' : 'To do'}</Badge></div><small>{a.kind || 'Assignment'} · {a.subject}</small><h3>{a.title}</h3><p>{a.teacher}</p><div className="college-assignment-deadline"><Icon name="CalendarDays" size={14} />{a.deadline ? 'Due ' + niceDate(a.deadline) : 'No deadline'}{a.deadline && a.deadline < today() && ['pending', 'revision requested'].includes(a.status) && <Badge color="peach">Overdue</Badge>}</div>{a.grade !== null && a.grade !== undefined && <strong className="college-assignment-grade">{a.grade}<small> / {a.maxPoints} points</small></strong>}{a.feedback && <p className="college-feedback-preview">{a.feedback}</p>}<Button variant="secondary" icon="ArrowUpRight" onClick={() => setModal({
          type: 'college-assignment',
          id: a.id
        })}>{a.status === 'graded' ? 'See feedback' : a.status === 'revision requested' ? 'Improve & resubmit' : a.kind === 'Quiz' ? 'Open quiz' : a.status === 'submitted' ? 'View my submission' : 'Open assignment'}</Button></article>)}</div>{!assignments.length && <div className="card"><Empty icon="NotebookPen" title="A little space for your next challenge." description="Your teacher’s published assignments, quizzes, and projects will appear here." /></div>}</>;
}
export function CollegeUpdates({
  kind = 'Announcement'
}) {
  const {
    state,
    act
  } = useStore();
  const updates = (state.campusUpdates || []).filter(u => u.kind === kind).toSorted((a, b) => b.date.localeCompare(a.date));
  if (!updates.length) return kind === 'Announcement' ? <Empty icon="Megaphone" title="Your college’s noticeboard." description="Official announcements from your teachers and placement team will appear here." /> : null;
  return <div className="college-updates">{updates.map(u => <article className="college-update" key={u.id}><div><span className="campus-icon"><Icon name={kind === 'Event' ? 'CalendarDays' : 'Megaphone'} size={21} /></span><div><strong>{u.sender}</strong><small>College {kind === 'Event' ? 'event update' : 'announcement'} · {new Date(u.date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short'
            })}</small></div><Badge color="mint">College published</Badge></div><h2>{u.title}</h2><p>{u.description}</p>{u.eventDate && <p className="college-update-date"><Icon name="CalendarDays" size={14} />{kind === 'Event' ? 'Event / registration date: ' : 'Follow up: '}{niceDate(u.eventDate)}</p>}<footer>{u.sourceUrl && <a href={u.sourceUrl} target="_blank" rel="noreferrer">Open details<Icon name="ArrowUpRight" size={13} /></a>}<button onClick={() => act('campus-update.read', {
          id: u.id
        }, 'Update acknowledged.').catch(() => {})} disabled={u.read}><Icon name={u.read ? 'CheckCheck' : 'Check'} size={14} />{u.read ? 'Acknowledged' : 'Got it'}</button></footer></article>)}</div>;
}
export function StaffGuidance() {
  const {
    state
  } = useStore();
  return <><PageHead eyebrow="A LITTLE GUIDANCE CAN GO A LONG WAY." title="Good advice. Your next step." description="Messages and improvement suggestions from your teachers and placement team."><Button variant="secondary" icon="MessageCircle" onClick={() => navigate('/messages?tab=global')}>Student conversations</Button></PageHead><div className="college-guidance-list">{[...(state.staffMessages || [])].reverse().map(m => <GuidanceThread key={m.id} message={m} />)}{!state.staffMessages?.length && <div className="card"><Empty icon="Lightbulb" title="Your support team is one step away." description="Guidance from your teachers and placement team will appear here, with room for your reply." /></div>}</div></>;
}
function GuidanceThread({
  message: m
}) {
  const {
    act
  } = useStore();
  const [reply, setReply] = useState(''),
    [busy, setBusy] = useState(false);
  async function send(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await act('staff-message.reply', {
        id: m.id,
        text: reply
      }, 'Your reply is visible to your college support team.');
      setReply('');
    } finally {
      setBusy(false);
    }
  }
  return <article className="card college-guidance-card"><header><span className="college-guidance-icon"><Icon name={m.kind === 'Feedback' ? 'Lightbulb' : 'MessageCircle'} size={22} /></span><div><strong>{m.sender}</strong><small>{m.role === 'placement' ? 'Placement team' : 'Faculty mentor'} · {new Date(m.date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short'
          })}</small></div><Badge color={m.kind === 'Feedback' ? 'purple' : 'blue'}>{m.kind === 'Feedback' ? 'Improvement guidance' : 'Message'}</Badge></header><h2>{m.title}</h2><p>{m.text}</p>{m.followUp && <small>Follow-up by {niceDate(m.followUp)}</small>}<div className="college-guidance-ack"><button disabled={m.read} onClick={() => act('staff-message.read', {
        id: m.id
      }, 'Guidance acknowledged.').catch(() => {})}><Icon name="CheckCheck" size={14} />{m.read ? 'Acknowledged' : 'Acknowledge'}</button></div>{m.replies.map(r => <blockquote key={r.id}><strong>You replied</strong><p>{r.text}</p></blockquote>)}<form onSubmit={send}><label className="sr-only" htmlFor={'reply-' + m.id}>Reply to {m.title}</label><input id={'reply-' + m.id} value={reply} onChange={e => setReply(e.target.value)} placeholder="Ask a question or share your next step…" maxLength={3000} /><Button type="submit" icon="Send" disabled={busy || !reply.trim()}>Reply</Button></form></article>;
}
export function CampusInboxBanner() {
  const {
    state
  } = useStore();
  const assignments = state.assignments.filter(a => ['pending', 'revision requested'].includes(a.status)).length,
    messages = (state.staffMessages || []).filter(m => !m.read).length;
  if (!assignments && !messages) return null;
  return <div className="college-inbox-banner"><span><Icon name="GraduationCap" size={21} /></span><div><strong>Your college has a next step for you.</strong><p>{assignments ? `${assignments} assignment${assignments === 1 ? '' : 's'} to work on` : ''}{assignments && messages ? ' · ' : ''}{messages ? `${messages} new message${messages === 1 ? '' : 's'} from your support team` : ''}</p></div><Button variant="secondary" icon="ArrowUpRight" onClick={() => navigate(assignments ? '/learn?tab=assignments' : '/messages?tab=staff')}>{assignments ? 'Open assignments' : 'Read guidance'}</Button></div>;
}
export function StudentCampusDrives() {
  const {
    state,
    act
  } = useStore();
  return <div className="college-student-drives">{(state.campusDrives || []).map(d => <article className="card" key={d.id}><div><Badge color="mint">College drive</Badge><Badge color="purple">{d.status}</Badge></div><h2>{d.company}</h2><h3>{d.title}</h3><p>{d.description}</p><div className="college-drive-dates"><span>Drive: {d.date ? niceDate(d.date) : 'To be confirmed'}</span><span>Register by: {d.deadline ? niceDate(d.deadline) : 'Check details'}</span></div><div className="row-actions">{d.sourceUrl && <a className="btn btn-primary" href={d.sourceUrl} target="_blank" rel="noreferrer">Open official details<Icon name="ArrowUpRight" size={14} /></a>}<Button variant="secondary" icon="Check" disabled={d.status !== 'Invited' || d.driveStatus && d.driveStatus !== 'Open'} onClick={() => act('campus-drive.applied', {
          id: d.id
        }, 'Your college placement tracker is updated.').catch(() => {})}>{d.status === 'Invited' ? 'I have applied' : 'In my placement tracker'}</Button></div>{d.rounds?.map(r => <p key={r.id}><strong>{r.name}</strong> · {new Date(r.at).toLocaleString()} · {r.location} {r.url && <a href={r.url} target="_blank" rel="noreferrer">Details ↗</a>}</p>)}<small>Complete any external application on the official website before updating your tracker.</small></article>)}{!state.campusDrives?.length && <div className="card"><Empty icon="Briefcase" title="Your next college drive will appear here." description="Your placement department can invite you and keep your application stages in sync." /></div>}</div>;
}
export function RecommendedOpportunities() {
  const {
    state
  } = useStore();
  const recommendations = (state.recommendedJobs || []).slice(-3).reverse();
  if (!recommendations.length) return null;
  return <section className="college-recommended-jobs"><h3><Icon name="GraduationCap" size={18} />Recommended by your college team</h3><div>{recommendations.map(r => {
        const j = state.catalog.jobs.find(j => j.id === r.jobId);
        return j && <article key={r.sourceId || r.id}><Badge color="mint">{r.sender}</Badge><h3>{j.company} · {j.title}</h3><p>{r.message}</p><a href={j.sourceUrl} target="_blank" rel="noreferrer">Explore the source listing<Icon name="ArrowUpRight" size={13} /></a></article>;
      })}</div></section>;
}
