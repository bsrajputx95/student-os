import ReadinessEvidence from '../components/ReadinessEvidence.jsx';
import React, { useState } from 'react';
import { useStore, navigate } from '../lib/store.jsx';
import { PageHead, Button, Icon, Badge, Ring, Progress, Heatmap } from '../components/ui.jsx';
export default function ProgressPage() {
  const {
    state
  } = useStore();
  const [skill, setSkill] = useState('Frontend'),
    [period, setPeriod] = useState('6 weeks');
  const value = state.metrics.readinessDetails.skillScores[skill],
    color = state.catalog.skillColors[skill];
  const span = period === '6 weeks' ? 35 : 90;
  const anchors = Array.from({
    length: 6
  }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - Math.round(span * (5 - i) / 5));
    return d.toISOString().slice(0, 10);
  });
  const history = (state.skillHistory || []).toSorted((a, b) => a.date.localeCompare(b.date));
  const points = anchors.map((date, i) => i === 5 ? value : history.filter(h => h.date <= date).at(-1)?.verifiedSkills?.[skill] ?? (state.profile.isDemo ? history.filter(h => h.date <= date).at(-1)?.skills[skill] || 0 : 0));
  const y = v => 190 - v / 100 * 155;
  const line = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${50 + i * 103} ${y(v)}`).join(' ');
  return <><PageHead eyebrow="LOOK HOW FAR YOU'VE COME." title="Small steps leave a big trail." description="Your effort, your growing skills, and a little proof that showing up works."><Badge color="mint"><Icon name="TrendingUp" size={14} />Growing at your own pace</Badge></PageHead><div className="progress-top-grid"><section className="card progress-readiness"><Ring value={state.metrics.readiness} size={150} /><div><span className="eyebrow">YOUR GENERAL READINESS</span><h2>A little more ready.<br />A little more you.</h2><p>Based on your current skill profile, practice, and completed work.</p><button className="text-link" onClick={() => navigate('/career')}>See readiness for a job<Icon name="ArrowUpRight" size={14} /></button></div></section><section className="card progress-streak"><span className="flame-icon"><Icon name="Flame" size={28} /></span><div><strong>{state.metrics.streak}</strong><span>days of showing up</span></div><p>Consistency is built one ordinary day at a time.</p><Badge color="peach">Keep your little rhythm going.</Badge></section><section className="card progress-xp"><span className="xp-star">✦</span><strong>{state.journey.xp.toLocaleString()}</strong><span>little moments of progress, in XP</span><Progress value={state.journey.xp % 250 / 250 * 100} /><small>{250 - state.journey.xp % 250} XP to your next level</small></section></div><ReadinessEvidence /><div className="progress-main-grid"><section className="card growth-chart"><div className="section-head"><div><h2>Growing, one week at a time.</h2><p>A view of your learning momentum.</p></div><select aria-label="Chart period" value={period} onChange={e => setPeriod(e.target.value)}><option>6 weeks</option><option>3 months</option></select></div><div className="chart-skill-tabs">{Object.keys(state.skills).slice(0, 4).map(s => <button className={skill === s ? 'active' : ''} key={s} onClick={() => setSkill(s)}><i style={{
              background: state.catalog.skillColors[s]
            }} />{s}</button>)}</div><div className="chart-current"><strong>{value}<small>/100</small></strong><span><Icon name="TrendingUp" size={14} />{skill} confidence</span></div><svg className="growth-svg" viewBox="0 0 620 235" role="img" aria-label={`${skill} progress from ${points[0]} to ${value}`}><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".18" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>{[0, 25, 50, 75, 100].map(n => <g key={n}><line x1="45" y1={y(n)} x2="585" y2={y(n)} stroke="#efedf4" strokeDasharray="3 5" /><text x="10" y={y(n) + 4} fill="#a09baa" fontSize="10">{n}</text></g>)}<path d={`${line} L565 190 L50 190Z`} fill="url(#chartFill)" /><path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{points.map((v, i) => <g key={i}><circle cx={50 + i * 103} cy={y(v)} r={i === 5 ? 5 : 3} fill={i === 5 ? color : 'white'} stroke={color} strokeWidth="2" /><text x={50 + i * 103} y="221" fill="#96919f" fontSize="10" textAnchor="middle">{new Date(anchors[i] + 'T12:00:00').toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short'
              })}</text></g>)}</svg><p className="quiet-note">{state.profile.isDemo ? 'Learning history for this profile. Current scores update as you practise.' : 'Based on saved skill snapshots. Your history grows when you complete work.'}</p></section><section className="card skill-breakdown"><div className="section-head"><div><h2>A little stronger in…</h2><p>Your topics, in focus.</p></div><Icon name="SlidersHorizontal" size={17} /></div>{Object.entries(state.metrics.readinessDetails.skillScores).map(([s, n]) => <button className={`skill-breakdown-row ${skill === s ? 'selected-skill' : ''}`} key={s} onClick={() => setSkill(s)}><div><span><i style={{
                background: state.catalog.skillColors[s]
              }} />{s}</span><strong>{n}<small>/100</small></strong></div><Progress value={n} color={s === 'Frontend' ? 'blue' : s === 'Databases' ? 'mint' : s === 'Backend' ? 'peach' : 'purple'} /><small>{n >= 75 ? 'Finding your confidence' : n >= 50 ? 'Building a good foundation' : 'A little room to explore'}</small></button>)}</section></div><section className="card activity-card"><div className="section-head"><div><h2>Your effort has a pattern.</h2><p>Learning, practising, building. A little of it, often.</p></div><Badge color="purple"><Icon name="CalendarDays" size={12} />{state.activity.filter(a => a.count > 0).length} active days</Badge></div><Heatmap /></section><div className="achievement-grid">{[{
        icon: 'Flame',
        title: 'A little consistency',
        text: `A ${state.metrics.streak}-day streak. One day at a time.`,
        tone: 'peach'
      }, {
        icon: 'Blocks',
        title: 'A builder in the making',
        text: `${Object.values(state.projectProgress).reduce((a, b) => a + b.length, 0)} project milestones completed.`,
        tone: 'purple'
      }, {
        icon: 'Brain',
        title: 'Curiosity, tested',
        text: `${state.quizAttempts.length} quizzes completed in this workspace.`,
        tone: 'mint'
      }].map(a => <section className="card achievement-card" key={a.title}><span className={`achievement-icon tone-${a.tone}`}><Icon name={a.icon} size={23} /></span><div><h3>{a.title}</h3><p>{a.text}</p></div><span>✧</span></section>)}</div></>;
}
