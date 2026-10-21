import React, { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Button, Modal, Badge, Empty } from './ui.jsx';
import { can } from '../../shared/permissions.js';
import { calendarEvent } from '../../shared/calendar.js';
export function MemberSafety({
  id
}) {
  const {
    state,
    act
  } = useStore();
  return <><Button variant="ghost" onClick={() => act('community.mute', {
      id
    }).catch(() => {})}>{state.communityMutes?.includes(id) ? 'Unmute' : 'Mute'}</Button><Button variant="ghost" onClick={() => act('community.block', {
      id
    }).catch(() => {})}>{state.communityBlocks?.includes(id) ? 'Unblock' : 'Block'}</Button></>;
}
export function ReportPost({
  post
}) {
  const {
      state,
      act
    } = useStore(),
    [open, setOpen] = useState(false),
    [reason, setReason] = useState('');
  return <>{post.author === state.profile.id ? <Button variant="ghost" onClick={() => act('community.post.delete', {
      id: post.id
    }).catch(() => {})}>Remove</Button> : <Button variant="ghost" onClick={() => setOpen(true)}>Report</Button>}{open && <Modal title="Report this post" onClose={() => setOpen(false)}><form onSubmit={async e => {
        e.preventDefault();
        try {
          await act('community.report', {
            id: post.id,
            reason
          }, 'Report sent to your college moderation team.');
          setOpen(false);
        } catch {}
      }}><label>What should the college review?<textarea required minLength={5} value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} /></label><Button type="submit">Submit report</Button></form></Modal>}</>;
}
export function Moderation() {
  const {
      state,
      act
    } = useStore(),
    [notes, setNotes] = useState({});
  if (!can(state.profile, 'community.moderate')) return null;
  const reports = state.communityReports || [];
  return <section className="card"><h2>Community reports</h2>{reports.length ? reports.map(r => <article className="card" key={r.id}><Badge>{r.status}</Badge><p>{r.post?.text}</p><p>Report: {r.reason}</p><label>Review note<input value={notes[r.id] || ''} onChange={e => setNotes(n => ({
          ...n,
          [r.id]: e.target.value
        }))} /></label><div className="row-actions">{['hide', 'dismiss', 'restore'].map(decision => <Button variant="secondary" key={decision} disabled={!notes[r.id]?.trim()} onClick={() => act('community.moderate', {
          id: r.id,
          decision,
          note: notes[r.id]
        }).catch(() => {})}>{decision}</Button>)}</div></article>) : <Empty title="No community reports." />}</section>;
}
export function EventTools({
  event
}) {
  const {
      state,
      act
    } = useStore(),
    [open, setOpen] = useState(false),
    [name, setName] = useState(''),
    [reason, setReason] = useState('');
  const registered = event.attendees.includes(state.profile.id),
    team = event.teams?.find(t => t.members.includes(state.profile.id));
  function download() {
    const url = URL.createObjectURL(new Blob([calendarEvent(event)], {
        type: 'text/calendar'
      })),
      a = document.createElement('a');
    a.href = url;
    a.download = 'studentos-event.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <><div className="row-actions"><Button variant="ghost" onClick={download}>Calendar</Button>{registered && <Button variant="ghost" onClick={() => act('community.event.unregister', {
        id: event.id
      }).catch(() => {})}>Leave event</Button>}<Button variant="ghost" onClick={() => setOpen(true)}>Teams & details</Button></div>{event.cancelled && <p>Cancelled · {event.cancellation}</p>}{open && <Modal title={event.name} onClose={() => setOpen(false)}><p>{event.description}</p>{event.date >= new Date().toISOString().slice(0, 10) && registered && !event.cancelled && <><h3>Your team</h3>{team ? <><p>{team.name} · {team.members.length}/4</p><Button onClick={() => act('community.event.team', {
            id: event.id,
            leave: true
          }).catch(() => {})}>Leave team</Button></> : <><label>New team name<input value={name} onChange={e => setName(e.target.value)} /></label><Button disabled={!name.trim()} onClick={() => act('community.event.team', {
            id: event.id,
            name
          }).catch(() => {})}>Create team</Button>{event.teams?.map(t => <div key={t.id}><strong>{t.name} · {t.members.length}/4</strong><Button variant="ghost" disabled={t.members.length >= 4} onClick={() => act('community.event.team', {
              id: event.id,
              teamId: t.id
            }).catch(() => {})}>Join team</Button></div>)}</>}</>}{can(state.profile, 'content.publish') && <><label>Cancellation reason<input value={reason} onChange={e => setReason(e.target.value)} /></label><Button disabled={!reason.trim() || event.cancelled} onClick={() => act('community.event.cancel', {
          id: event.id,
          reason
        }).catch(() => {})}>Cancel event</Button>{event.date <= new Date().toISOString().slice(0, 10) && <><h3>Confirm attendance</h3>{event.attendees.map(id => <div key={id}>{state.communityPeople.find(p => p.id === id)?.name}<Button variant="ghost" disabled={event.attendance?.includes(id)} onClick={() => act('community.event.attendance', {
              id: event.id,
              studentId: id
            }).catch(() => {})}>{event.attendance?.includes(id) ? 'Confirmed' : 'Mark attended'}</Button></div>)}</>}</>}</Modal>}</>;
}
