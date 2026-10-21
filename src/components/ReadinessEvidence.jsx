import React from 'react';
import { useStore } from '../lib/store.jsx';
import { Badge, Icon } from './ui.jsx';
export default function ReadinessEvidence() {
  const {
      state
    } = useStore(),
    evidence = state.metrics.evidence;
  if (!evidence) return null;
  return <section className="card evidence-panel"><div className="section-head"><div><h2>What supports your progress?</h2><p>{evidence.explanation}</p></div><Badge color="mint"><Icon name="ShieldCheck" size={14} />Evidence matters</Badge></div><p>{state.metrics.readinessDetails?.explanation}</p><div className="evidence-stats"><div><strong>{evidence.verifiedActivities}</strong><span>server checks or mentor reviews</span></div><div><strong>{evidence.selfReportedActivities}</strong><span>self-reported activities</span></div><div><strong>{evidence.assessmentAverage === null ? '—' : evidence.assessmentAverage + '%'}</strong><span>average across {evidence.assessmentCount} saved assessments</span></div></div><div className="evidence-skill-list">{evidence.skills.map(s => <div key={s.skill}><strong>{s.skill}</strong><span>{s.confidence}/100 learning confidence</span><span>{s.verifiedChecks ? `${s.verifiedChecks} verified checks · ${s.verifiedScore}% average` : 'No verified checks yet'}</span></div>)}</div>{state.profile.isDemo && <p className="quiet-note">Historical demo scores are illustrative. New evidence appears here as you work.</p>}</section>;
}
