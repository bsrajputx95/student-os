import React, { useEffect, useState } from 'react';
import { useStore, navigate } from '../lib/store.jsx';
import { Button, Badge, PageHead } from '../components/ui.jsx';
const help = [['Where do I start?', 'Finish setup and the baseline diagnostic. Your overview puts the next useful activity first.', '/overview'], ['What updates my streak and score?', 'Activity and XP record effort. Scored checks and staff reviews contribute to evidence-based readiness. External practice and milestone checklists stay self-reported.', '/progress'], ['How do I recover missed work?', 'The journey carries a catch-up queue and spaces review after completed lessons. Set an exam or recovery break in Settings; old work is never silently completed.', '/journey'], ['How do assignments work?', 'Open Learn → Assignments. Written work saves drafts and submission versions. Quiz attempts belong to their exact assignment. A final grade needs a staff revision request before resubmission.', '/learn?tab=assignments'], ['Why is AI or coding unavailable?', 'Quid navigation, saved interviews, SQL and browser practice work locally. AI review and the trusted multi-language runner need their server connections.', '/practice?tab=assessments'], ['Who can see my work?', 'College staff can inspect academic progress. DMs are visible to their participants. Private uploads are shared through the submitted or published activity. Report a post or block a member from Community.', '/community'], ['How do I request a data correction?', 'Create a privacy or data request below. Your institution can review academic records and the applicable retention rules before making a change.', '/help']];
export default function Help() {
  const {
      state,
      request
    } = useStore(),
    [query, setQuery] = useState(''),
    [tickets, setTickets] = useState([]),
    [error, setError] = useState(''),
    [replies, setReplies] = useState({});
  const load = () => fetch('/api/help').then(r => r.json()).then(d => {
    if (d.error) throw new Error(d.error);
    setTickets(d.tickets);
  }).catch(e => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  return <><PageHead title="Help, without the maze." description="Find a workflow or ask your college support team." /><section className="card form-stack"><label>Search product help<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Assignments, scores, AI…" /></label>{help.filter(h => h.join(' ').toLowerCase().includes(query.toLowerCase())).map(([title, text, route]) => <details key={title}><summary>{title}</summary><p>{text}</p><Button variant="ghost" onClick={() => navigate(state.profile.role === 'student' ? route : '/staff/overview')}>Open workspace</Button></details>)}</section><section className="card form-stack"><h2>Contact college support</h2><form className="form-stack" onSubmit={async e => {
        e.preventDefault();
        const ticketForm = e.currentTarget;
        try {
          await request('/api/help', {
            operation: 'create',
            ...Object.fromEntries(new FormData(e.currentTarget))
          });
          ticketForm.reset();
          await load();
        } catch (e) {
          setError(e.message);
        }
      }}><label>Category<select name="category">{['App problem', 'Academic support', 'Privacy / data request'].map(c => <option key={c}>{c}</option>)}</select></label><label>Subject<input name="subject" required minLength={4} /></label><label>What happened, and what did you expect?<textarea name="text" required minLength={20} /></label><Button type="submit">Create support request</Button></form>{error && <p role="alert">{error}</p>}</section><section className="card"><h2>Support conversations</h2>{tickets.map(t => <article className="card" key={t.id}><Badge>{t.status}</Badge><h3>{t.subject}</h3><p>{t.author} · {t.category}</p><p>{t.text}</p>{t.responses.map(r => <p key={r.id}><strong>{r.author}:</strong> {r.text}</p>)}<label>Reply<input value={replies[t.id] || ''} onChange={e => setReplies(r => ({
            ...r,
            [t.id]: e.target.value
          }))} /></label><Button variant="secondary" disabled={(replies[t.id] || '').trim().length < 5} onClick={async () => {
          try {
            await request('/api/help', {
              operation: 'reply',
              id: t.id,
              text: replies[t.id]
            });
            setReplies(r => ({
              ...r,
              [t.id]: ''
            }));
            await load();
          } catch (e) {
            setError(e.message);
          }
        }}>Save reply</Button>{['admin', 'support'].includes(state.profile.role) && <label>Support status<select value={t.status} onChange={async e => {
            await request('/api/help', {
              operation: 'status',
              id: t.id,
              status: e.target.value
            });
            await load();
          }}>{['open', 'in progress', 'resolved'].map(s => <option key={s}>{s}</option>)}</select></label>}</article>)}</section></>;
}
