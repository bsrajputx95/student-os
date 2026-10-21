import CompanyLogo from './CompanyLogo.jsx';
import React from 'react';
import { useStore } from '../lib/store.jsx';
import { Modal, Button, Icon, Badge } from './ui.jsx';
export function ExternalProblem({
  id,
  close
}) {
  const {
      state,
      act
    } = useStore(),
    p = state.catalog.problems.find(p => p.id === id);
  const done = state.practiceCompleted?.includes(id) || state.solved.includes(id);
  return <Modal title={`${p.number}. ${p.title}`} subtitle="LeetCode · External practice" onClose={close}><div className="inline-badges"><Badge color={p.difficulty === 'Easy' ? 'mint' : 'peach'}>{p.difficulty}</Badge>{p.topics.map(t => <Badge color="gray" key={t}>{t}</Badge>)}</div><p className="body-copy">Read the full problem, use your preferred programming language, and run the official tests on LeetCode. Return here to record your practice.</p><p className="quiet-note">Recording is self-reported. StudentOS does not verify your LeetCode submission or copy its problem statement.</p><div className="row-actions"><a className="btn btn-primary" href={p.sourceUrl} target="_blank" rel="noreferrer">Solve on LeetCode<Icon name="ArrowUpRight" size={16} /></a><Button variant="secondary" icon={done ? 'Check' : 'Plus'} disabled={done} onClick={() => act('practice.track', {
        id
      }, 'Practice recorded. Activity and DSA progress updated.').catch(() => {})}>{done ? 'Practice recorded' : 'Mark as practiced'}</Button></div></Modal>;
}
export function CompanyGuide({
  id,
  close
}) {
  const {
      state,
      setModal
    } = useStore(),
    c = state.catalog.companies.find(c => c.id === id);
  return <Modal title={`${c.name} preparation`} subtitle="Official resources + general practice recommendations" onClose={close}><CompanyLogo name={c.name} className="large-logo" /><p className="body-copy">{c.focus}</p><div className="row-actions"><a className="btn btn-primary" href={c.guideUrl} target="_blank" rel="noreferrer">{c.guideKind === 'careers' ? 'Official careers & early talent' : 'Official preparation'}<Icon name="ArrowUpRight" size={15} /></a><a className="btn btn-secondary" href={c.careersUrl} target="_blank" rel="noreferrer">Careers<Icon name="ArrowUpRight" size={15} /></a></div><h3>Strengthen the foundations</h3><p className="quiet-note">General practice suggestions selected by topic, not a verified list of questions asked by this company.</p>{state.catalog.problems.filter(p => c.topics.some(t => p.topics.includes(t))).slice(0, 8).map(p => <button className="mission-open-step" key={p.id} onClick={() => setModal({
      type: p.external ? 'external-problem' : 'coding',
      id: p.id
    })}><span>{p.number}</span><div><strong>{p.title}</strong><small>{p.topics.slice(0, 2).join(' · ')} · {p.difficulty}</small></div><Icon name="ArrowUpRight" size={15} /></button>)}</Modal>;
}
