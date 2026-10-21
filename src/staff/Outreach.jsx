import { can } from '../../shared/permissions.js';
import { useStore } from '../lib/store.jsx';
import Interventions from './Interventions.jsx';
import React, { useState } from 'react';
import { useCampus } from './context.jsx';
import { Icon, Button, Badge, Tabs, Empty } from '../components/ui.jsx';
export default function Outreach() {
  const {
    state
  } = useStore();
  const publish = can(state.profile, 'content.publish');
  const {
    data,
    setDialog
  } = useCampus();
  const [tab, setTab] = useState('all');
  const kinds = ['Announcement', 'Message', 'Feedback', 'Event'];
  const items = data.items.filter(i => kinds.includes(i.kind) && (tab === 'all' || i.kind === tab));
  return <><div className="staff-page-head"><div><span className="staff-eyebrow">THE RIGHT NUDGE, AT THE RIGHT TIME</span><h1>Keep the campus in the loop.</h1><p>Share an announcement. Suggest an improvement. Invite someone to try something new.</p></div>{publish && <Button icon="Send" onClick={() => setDialog({
        type: 'compose',
        kind: 'Message'
      })}>Create an update</Button>}</div><Interventions />{publish && <div className="staff-outreach-quick">{[['Announcement', 'Megaphone', 'A college announcement', 'Important updates in the student’s College feed.'], ['Feedback', 'Lightbulb', 'A personal improvement plan', 'Specific, encouraging guidance with room to reply.'], ['Event', 'CalendarDays', 'A hackathon or event', 'A useful experience, shared with the right students.'], ['Message', 'MessageCircle', 'A direct check-in', 'One person, one cohort, or your whole college.']].map(([kind, icon, title, body]) => <button className="card" key={kind} onClick={() => setDialog({
        type: 'compose',
        kind
      })}><span><Icon name={icon} size={23} /></span><h3>{title}</h3><p>{body}</p><Icon name="ArrowUpRight" size={16} /></button>)}</div>}<Tabs items={[{
      id: 'all',
      label: 'All updates'
    }, ...kinds.map(id => ({
      id,
      label: id === 'Feedback' ? 'Improvement guidance' : id + 's'
    }))]} value={tab} onChange={setTab} /><div className="staff-outreach-list">{items.map(item => {
        const reads = item.deliveries.filter(d => d.read).length,
          replies = item.deliveries.reduce((n, d) => n + d.replies.length, 0);
        return <article className="card" key={item.id}><span className="staff-work-icon"><Icon name={item.kind === 'Event' ? 'CalendarDays' : item.kind === 'Feedback' ? 'Lightbulb' : item.kind === 'Message' ? 'MessageCircle' : 'Megaphone'} size={24} /></span><div><div><Badge color={item.status === 'draft' ? 'peach' : 'mint'}>{item.kind} · {item.status}</Badge><small>{item.author}</small></div><h2>{item.title}</h2><p>{item.description.slice(0, 180)}{item.description.length > 180 ? '…' : ''}</p><div className="staff-outreach-receipts"><span><Icon name="Users" size={13} />{item.targetIds.length} recipients</span><span><Icon name="CheckCheck" size={13} />{reads} acknowledged</span>{replies > 0 && <span><Icon name="MessageCircle" size={13} />{replies} replies</span>}</div></div><Button variant="secondary" icon="ArrowUpRight" onClick={() => setDialog(item.status === 'draft' && publish ? {
            type: 'compose',
            item
          } : {
            type: 'item',
            id: item.id
          })}>{item.status === 'draft' && publish ? 'Continue draft' : 'View delivery'}</Button></article>;
      })}{!items.length && <div className="card"><Empty icon="MessageSquarePlus" title="Your next conversation starts here." description="Send a useful update to an individual or group. Delivery and replies will appear in this view." /></div>}</div></>;
}
