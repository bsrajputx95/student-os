import React, { useState } from 'react';
import { useCampus } from './context.jsx';
import { Button, Modal } from '../components/ui.jsx';
import { pipelineStages } from '../../shared/staff.js';
export default function DriveOperations({
  drive
}) {
  const {
      mutate
    } = useCampus(),
    [open, setOpen] = useState(false),
    [rounds, setRounds] = useState(drive.rounds || []),
    [status, setStatus] = useState(drive.status),
    [selected, setSelected] = useState([]),
    [stage, setStage] = useState('Assessment'),
    [error, setError] = useState('');
  return <><Button variant="ghost" onClick={() => setOpen(true)}>Manage rounds & outcomes</Button>{open && <Modal wide title={drive.company + ' · recruitment operations'} onClose={() => setOpen(false)}><form className="form-stack" onSubmit={async e => {
        e.preventDefault();
        try {
          await mutate('drive.update', {
            id: drive.id,
            status,
            rounds: rounds.map(r => ({
              ...r,
              at: new Date(r.at).toISOString()
            }))
          }, 'Drive schedule updated for invited students.');
          setOpen(false);
        } catch (e) {
          setError(e.message);
        }
      }}><label>Drive status<select value={status} onChange={e => setStatus(e.target.value)}>{['Open', 'Closed', 'Cancelled'].map(s => <option key={s}>{s}</option>)}</select></label><h3>Recruitment rounds</h3>{rounds.map((r, i) => <fieldset key={i}><label>Round name<input required value={r.name} onChange={e => setRounds(a => a.map((v, n) => i === n ? {
              ...v,
              name: e.target.value
            } : v))} /></label><label>Time<input type="datetime-local" required value={r.at ? new Date(Date.parse(r.at) - new Date(r.at).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} onChange={e => setRounds(a => a.map((v, n) => i === n ? {
              ...v,
              at: e.target.value
            } : v))} /></label><label>Location<input value={r.location || ''} onChange={e => setRounds(a => a.map((v, n) => i === n ? {
              ...v,
              location: e.target.value
            } : v))} /></label><label>Meeting / resource URL<input type="url" value={r.url || ''} onChange={e => setRounds(a => a.map((v, n) => i === n ? {
              ...v,
              url: e.target.value
            } : v))} /></label><Button variant="ghost" onClick={() => setRounds(a => a.filter((_, n) => i !== n))}>Remove round</Button></fieldset>)}<Button variant="secondary" disabled={rounds.length >= 10} onClick={() => setRounds(a => [...a, {
          name: '',
          at: '',
          location: '',
          url: ''
        }])}>Add round</Button><Button type="submit">Save status & schedule</Button></form><h3>Bulk outcome update</h3><label>Stage<select value={stage} onChange={e => setStage(e.target.value)}>{pipelineStages.filter(s => s !== 'Invited').map(s => <option key={s}>{s}</option>)}</select></label><div className="staff-recipient-options">{drive.applications.map(a => <label key={a.studentId}><input type="checkbox" checked={selected.includes(a.studentId)} onChange={() => setSelected(ids => ids.includes(a.studentId) ? ids.filter(id => id !== a.studentId) : [...ids, a.studentId])} />{a.name} · {a.status}</label>)}</div><Button disabled={!selected.length} onClick={async () => {
        try {
          await mutate('drive.stage', {
            driveId: drive.id,
            studentIds: selected,
            stage
          }, 'Selected student outcomes updated.');
          setSelected([]);
        } catch (e) {
          setError(e.message);
        }
      }}>Update {selected.length} students</Button>{error && <p role="alert">{error}</p>}<h3>Eligibility exclusions</h3>{drive.excluded?.map(e => <p key={e.studentId}>{e.studentId} · {e.reasons.join(' ')}</p>)}</Modal>}</>;
}
