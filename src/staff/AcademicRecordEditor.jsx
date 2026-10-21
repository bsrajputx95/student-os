import React, { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Modal, Button } from '../components/ui.jsx';
export default function AcademicRecordEditor({
  person,
  close,
  onSaved
}) {
  const {
      request
    } = useStore(),
    [form, setForm] = useState(person),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return <Modal title={'Academic record · ' + person.name} onClose={close}><p>Use institution-verified records. These values determine placement eligibility; student self-reports do not update them.</p><form className="form-stack" onSubmit={async e => {
      e.preventDefault();
      setBusy(true);
      try {
        const payload = {
          id: person.id,
          operation: 'academic'
        };
        for (const key of ['year', 'cgpa', 'backlogs', 'graduationYear']) if (form[key] !== '' && form[key] !== null && form[key] !== undefined) payload[key] = Number(form[key]);
        for (const key of ['department', 'section', 'studentId']) if (form[key]) payload[key] = form[key];
        await request('/api/admin/account', payload);
        await onSaved();
        close();
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    }}>{[['year', 'College year', 1, 4], ['cgpa', 'CGPA', 0, 10], ['backlogs', 'Active backlogs', 0, 50], ['graduationYear', 'Graduation year', 2020, 2100]].map(([key, label, min, max]) => <label key={key}>{label}<input type="number" min={min} max={max} step={key === 'cgpa' ? '.01' : '1'} value={form[key] ?? ''} onChange={e => setForm(f => ({
          ...f,
          [key]: e.target.value
        }))} /></label>)}{[['department', 'Department'], ['section', 'Section'], ['studentId', 'Student ID']].map(([key, label]) => <label key={key}>{label}<input value={form[key] || ''} onChange={e => setForm(f => ({
          ...f,
          [key]: e.target.value
        }))} /></label>)}{error && <p role="alert">{error}</p>}<Button type="submit" disabled={busy}>Save verified academic record</Button></form></Modal>;
}
