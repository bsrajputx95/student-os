import { can } from '../../shared/permissions.js';
import { useStore } from '../lib/store.jsx';
import CollegeChallenges from '../components/CollegeChallenges.jsx';
import QuestionBanks from './QuestionBanks.jsx';
import React, { useState } from 'react';
import { useCampus } from './context.jsx';
import { useRoute, niceDate, today } from '../lib/store.jsx';
import { Button, Icon, Badge, Tabs, Progress, Empty } from '../components/ui.jsx';
export default function Assignments() {
  const {
    data,
    setDialog
  } = useCampus();
  const {
    state
  } = useStore();
  const [route] = useRoute();
  const [tab, setTab] = useState(route.includes('review') ? 'review' : 'published'),
    [query, setQuery] = useState(''),
    [kind, setKind] = useState('All types');
  const work = data.items.filter(i => ['Assignment', 'Quiz', 'Project'].includes(i.kind));
  const items = work.filter(i => (tab === 'review' ? i.deliveries.some(d => d.status === 'submitted') : i.status === tab) && (kind === 'All types' || i.kind === kind) && i.title.toLowerCase().includes(query.toLowerCase()));
  const reviews = items.flatMap(i => i.deliveries.filter(d => d.status === 'submitted').map(d => ({
    ...d,
    item: i
  })));
  return <><div className="staff-page-head"><div><span className="staff-eyebrow">MEANINGFUL WORK. USEFUL FEEDBACK.</span><h1>Set the challenge. See them grow.</h1><p>Assignments, quizzes, and projects — from the first instruction to the next improvement.</p></div>{can(state.profile, 'content.publish') && <Button icon="Plus" onClick={() => setDialog({
        type: 'compose',
        kind: 'Assignment'
      })}>Create new work</Button>}</div><div className="staff-assignment-metrics">{[['Published', work.filter(i => i.status === 'published').length, 'Send'], ['Ready for review', data.summary.toReview, 'NotebookPen'], ['Reviewed submissions', work.reduce((n, i) => n + i.reviewed, 0), 'CheckCheck'], ['Student deadlines missed', data.summary.overdue, 'Clock3']].map(([label, n, icon]) => <section className="card" key={label}><Icon name={icon} size={18} /><strong>{n}</strong><small>{label}</small></section>)}</div><Tabs items={[{
      id: 'published',
      label: 'Published',
      count: work.filter(i => i.status === 'published').length
    }, {
      id: 'review',
      label: 'Review queue',
      count: data.summary.toReview
    }, {
      id: 'draft',
      label: 'Drafts',
      count: work.filter(i => i.status === 'draft').length
    }, {
      id: 'archived',
      label: 'Archived'
    }, {
      id: 'challenges',
      label: 'College challenges'
    }, {
      id: 'banks',
      label: 'Question banks'
    }]} value={tab} onChange={setTab} /><div className="staff-work-filters"><label className="staff-search"><Icon name="Search" size={16} /><input aria-label="Find staff assignments" placeholder="Find an assignment, quiz, or project…" value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label="Assignment type" value={kind} onChange={e => setKind(e.target.value)}>{['All types', 'Assignment', 'Quiz', 'Project'].map(t => <option key={t}>{t}</option>)}</select></div>{tab === 'challenges' ? <CollegeChallenges /> : tab === 'banks' ? <QuestionBanks /> : tab === 'review' ? <div className="staff-review-list">{reviews.map(d => <article className="card staff-review-card" key={d.item.id + d.studentId}><span className="staff-work-icon"><Icon name="FileUser" size={24} /></span><div><Badge color="blue">{d.item.kind}</Badge><h3>{d.item.title}</h3><p>{d.name} · Year {d.year} · {d.submittedAt ? new Date(d.submittedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short'
            }) : 'Submitted'}</p><small>{d.submission.slice(0, 150)}{d.submission.length > 150 ? '…' : ''}</small></div><Button variant="secondary" icon="ArrowUpRight" onClick={() => setDialog({
          type: can(state.profile, 'submission.review') ? 'review' : 'item',
          id: d.item.id,
          itemId: d.item.id,
          studentId: d.studentId
        })}>{can(state.profile, 'submission.review') ? 'Review work' : 'View work'}</Button></article>)}{!reviews.length && <div className="card"><Empty icon="CheckCheck" title="Your review queue is clear." description="Submitted assignments will arrive here, ready for your feedback." /></div>}</div> : <div className="staff-work-grid">{items.map(item => <article className="card staff-work-card" key={item.id}><div className="staff-work-card-top"><span className={`staff-work-icon ${item.kind.toLowerCase()}`}><Icon name={item.kind === 'Quiz' ? 'Brain' : item.kind === 'Project' ? 'Blocks' : 'NotebookPen'} size={23} /></span><Badge color={item.status === 'published' ? 'mint' : item.status === 'draft' ? 'peach' : 'gray'}>{item.status}</Badge></div><small className="staff-section-label">{item.subject} · {item.kind}</small><h2>{item.title}</h2><p>{item.description.slice(0, 155)}{item.description.length > 155 ? '…' : ''}</p><div className="staff-work-meta"><span><Icon name="Users" size={14} />{item.targetIds.length} students</span><span><Icon name="CalendarDays" size={14} />{item.deadline ? niceDate(item.deadline) : 'No deadline'}</span><span>{item.maxPoints} points</span></div><div className="staff-work-progress"><div><span>{item.submitted}/{item.targetIds.length} submitted</span><strong>{item.reviewed} reviewed</strong></div><Progress value={item.targetIds.length ? item.submitted / item.targetIds.length * 100 : 0} color="mint" /></div><footer><small>By {item.author}</small><Button variant="secondary" icon="ArrowUpRight" onClick={() => setDialog(item.status === 'draft' ? {
            type: 'compose',
            item
          } : {
            type: 'item',
            id: item.id
          })}>{item.status === 'draft' ? 'Continue draft' : 'View submissions'}</Button></footer></article>)}{!items.length && <div className="card staff-full-span"><Empty icon="NotebookPen" title={tab === 'draft' ? 'A little space for your next idea.' : tab === 'archived' ? 'No archived work.' : 'Your next assignment starts here.'} description="Create work, choose an individual or group, and review the audience before publishing." action={can(state.profile, 'content.publish') ? 'Create new work' : undefined} onAction={() => setDialog({
          type: 'compose',
          kind: 'Assignment'
        })} /></div>}</div>}</>;
}
