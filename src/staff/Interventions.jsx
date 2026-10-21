import React, { useState } from 'react';
import { useCampus } from './context.jsx';
import { Button, Badge } from '../components/ui.jsx';
export default function Interventions() {
  const {
      data,
      mutate,
      setDialog
    } = useCampus(),
    [onlyOpen, setOnlyOpen] = useState(true),
    [outcomes, setOutcomes] = useState({});
  return <section className="card staff-panel"><div className="section-head"><div><h2>Mentor follow-ups</h2><p>College-staff notes, their recorded source, and the outcome of each intervention.</p></div><label><input type="checkbox" checked={onlyOpen} onChange={e => setOnlyOpen(e.target.checked)} />Open only</label></div>{data.notes.filter(n => !onlyOpen || !n.resolved).map(n => <article className="card" key={n.id}><Badge>{n.resolved ? 'Resolved' : 'Open'} · {n.source || 'Mentor note'}</Badge><h3>{data.students.find(s => s.id === n.studentId)?.name || 'Student record'}</h3><p>{n.text}</p><p>{n.author} · Follow-up {n.followUp || 'Not scheduled'}</p>{Number.isFinite(n.baselineReadiness) && <p>Readiness at opening: {n.baselineReadiness}% {Number.isFinite(n.latestReadiness) && '· Latest recorded: ' + n.latestReadiness + '%'}</p>}{n.outcome && <p>Outcome: {n.outcome}</p>}<label>Follow-up outcome<input value={outcomes[n.id] || ''} onChange={e => setOutcomes(o => ({
          ...o,
          [n.id]: e.target.value
        }))} /></label><div className="row-actions"><Button variant="secondary" onClick={() => setDialog({
          type: 'student',
          id: n.studentId
        })}>Open student</Button><Button variant="secondary" onClick={() => mutate('note.resolve', {
          id: n.id,
          outcome: outcomes[n.id] || n.outcome || 'Follow-up reviewed by the college mentor.'
        }, 'Intervention status saved.').catch(() => {})}>{n.resolved ? 'Reopen follow-up' : 'Save outcome & resolve'}</Button></div></article>)}</section>;
}
