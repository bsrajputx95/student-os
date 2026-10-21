import React, { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Badge } from './ui.jsx';
import { recommendedLearning } from '../../shared/certificates.js';
import ProviderMark from './ProviderMark.jsx';
export default function CertificateRecommendations() {
  const {
      state
    } = useStore(),
    [mine, setMine] = useState(true),
    [level, setLevel] = useState('All'),
    [cost, setCost] = useState('All');
  const rows = recommendedLearning.filter(r => (!mine || r.tracks.includes(state.profile.track)) && (level === 'All' || r.level === level) && (cost === 'All' || r.cost.startsWith('Free'))).toSorted((a, b) => (state.metrics.readinessDetails.skillScores[a.skill] || 0) - (state.metrics.readinessDetails.skillScores[b.skill] || 0));
  return <section><div className="section-head"><div><h2>Choose learning with a purpose.</h2><p>Official provider resources, ordered by your preparation gaps. Confirm current enrollment and credential terms at the source.</p></div></div><div className="row-actions"><label><input type="checkbox" checked={mine} onChange={e => setMine(e.target.checked)} />For my track</label><label>Level<select value={level} onChange={e => setLevel(e.target.value)}>{['All', 'Beginner', 'Intermediate'].map(v => <option key={v}>{v}</option>)}</select></label><label>Cost<select value={cost} onChange={e => setCost(e.target.value)}><option>All</option><option>Free learning</option></select></label></div><div className="certificate-grid">{rows.map(r => <article className="card" key={r.id}><div className="certificate-provider-heading"><ProviderMark provider={r.provider} /><Badge>{r.skill} · {r.level}</Badge></div><h3>{r.title}</h3><p>{r.provider} · {r.cost}</p><p>{r.prerequisite}</p><p>{r.credential}</p><a className="btn btn-secondary" href={r.sourceUrl} target="_blank" rel="noreferrer">Explore provider ↗</a></article>)}</div></section>;
}
