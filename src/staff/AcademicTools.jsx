import React, { useState } from 'react';
import { useCampus } from './context.jsx';
import { useStore, today } from '../lib/store.jsx';
import { can } from '../../shared/permissions.js';
import { Button, Modal, Badge } from '../components/ui.jsx';
export function Extensions({
  item
}) {
  const {
      mutate
    } = useCampus(),
    {
      state
    } = useStore(),
    [open, setOpen] = useState(false),
    [error, setError] = useState('');
  if (!can(state.profile, 'content.publish') || !['Assignment', 'Quiz', 'Project'].includes(item.kind)) return null;
  return <><Button variant="secondary" onClick={() => setOpen(true)}>Extend deadline</Button>{open && <Modal title="Grant an extension" onClose={() => setOpen(false)}><form className="form-stack" onSubmit={async e => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        try {
          await mutate('item.extend', {
            id: item.id,
            deadline: f.get('deadline'),
            studentIds: f.getAll('student')
          }, 'Extensions shared with the selected students.');
          setOpen(false);
        } catch (e) {
          setError(e.message);
        }
      }}><label>New deadline<input name="deadline" type="date" min={today()} required /></label><fieldset><legend>Recipients</legend>{item.deliveries.map(d => <label key={d.studentId}><input type="checkbox" name="student" value={d.studentId} defaultChecked />{d.name}</label>)}</fieldset>{error && <p role="alert">{error}</p>}<Button type="submit">Apply extension</Button></form></Modal>}</>;
}
export function ProjectReviews({
  detail
}) {
  const {
      mutate
    } = useCampus(),
    {
      state
    } = useStore(),
    [edit, setEdit] = useState(null),
    [error, setError] = useState('');
  return <section><h3>Submitted project evidence</h3>{Object.entries(detail.projectEvidence || {}).map(([id, e]) => <article className="card" key={id}><Badge>{e.status}</Badge><h4>{state.catalog.projects.find(p => p.id === id)?.title}</h4><p>{e.contribution}</p><p>{e.tests}</p>{e.repository && <a href={e.repository} target="_blank" rel="noreferrer">Repository ↗</a>}{e.demo && <p><a href={e.demo} target="_blank" rel="noreferrer">Live demo ↗</a></p>}{e.review && <p>{e.review.score}% · {e.review.feedback}</p>}{can(state.profile, 'submission.review') && <Button variant="secondary" onClick={() => setEdit({
        projectId: id,
        score: e.review?.score || 0,
        feedback: e.review?.feedback || '',
        requestRevision: false
      })}>Review evidence</Button>}</article>)}{edit && <Modal title="Review project evidence" onClose={() => setEdit(null)}><form className="form-stack" onSubmit={async e => {
        e.preventDefault();
        try {
          await mutate('project.review', {
            ...edit,
            studentId: detail.profile.id
          }, 'Project review saved to the student’s evidence.');
          setEdit(null);
        } catch (e) {
          setError(e.message);
        }
      }}><label>Evidence score<input type="number" min={0} max={100} value={edit.score} onChange={e => setEdit(f => ({
            ...f,
            score: Number(e.target.value)
          }))} /></label><label>Review feedback<textarea required value={edit.feedback} onChange={e => setEdit(f => ({
            ...f,
            feedback: e.target.value
          }))} /></label><label><input type="checkbox" checked={edit.requestRevision} onChange={e => setEdit(f => ({
            ...f,
            requestRevision: e.target.checked
          }))} />Request more evidence</label>{error && <p role="alert">{error}</p>}<Button type="submit">Save review</Button></form></Modal>}</section>;
}
