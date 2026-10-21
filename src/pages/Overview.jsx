import React from 'react';
import { useStore, navigate, today } from '../lib/store.jsx';
import { Icon, Button, Badge, SectionHead, Progress, Ring, TaskRow, taskDestination, CourseArt, Heatmap, WeekStreak } from '../components/ui.jsx';
import { CountUp, OrbitScene, PointerSurface, Sparkline } from '../components/DesignEffects.jsx';
import { CampusInboxBanner } from '../components/CollegeConnected.jsx';
import { getPath } from '../../shared/paths.js';
export default function Overview() {
  const {
    state,
    setModal,
    setAssistant
  } = useStore();
  const {
    metrics,
    profile,
    journey
  } = state;
  const path = getPath(profile.track),
    scores = metrics.readinessDetails.skillScores;
  const tasks = state.tasks.filter(t => t.date === today()),
    next = tasks.find(t => t.status !== 'completed');
  const minutes = tasks.reduce((n, t) => n + t.minutes, 0),
    complete = tasks.filter(t => t.status === 'completed').length;
  const courses = state.catalog.courses.filter(c => c.tags.includes(profile.track) && (state.courseProgress[c.id] || 0) < c.lessons).sort((a, b) => (state.courseProgress[b.id] || 0) / b.lessons - (state.courseProgress[a.id] || 0) / a.lessons).slice(0, 2);
  const projectTask = tasks.find(t => state.catalog.projects.some(p => p.id === t.resourceId));
  const project = state.catalog.projects.find(p => p.id === projectTask?.resourceId) || state.catalog.projects.find(p => p.id === path.project) || state.catalog.projects[0];
  const done = (state.projectProgress[project.id] || []).length;
  const hour = Number(new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    hourCycle: 'h23',
    timeZone: 'Asia/Kolkata'
  }).format(new Date()));
  const growth = state.skillHistory?.slice(-8).map(h => Math.round(Object.values(h.skills).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(h.skills).length))) || [];
  const activity = state.activity.slice(-14).map(a => a.count);
  return <div className="so-dashboard">
    <div className="so-dashboard-heading so-section"><div><span className="so-overline"><i />YOUR PERSONAL LAUNCHPAD</span><h1>Good {hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'}, {profile.name.split(' ')[0]}<span className="so-heading-star" aria-hidden="true">✳</span></h1><p>Big ambitions. A clear next step. Let’s make it happen.</p></div><button className="so-track-switch" onClick={() => setModal({
        type: 'onboarding'
      })}><span className="so-track-icon"><Icon name="Compass" size={19} /></span><span><small>YOUR DIRECTION</small><strong>{profile.track}</strong></span><Icon name="SlidersHorizontal" size={15} /></button></div>
    <div className="so-hero-grid so-section"><PointerSurface className="so-focus-hero"><div className="so-hero-noise" /><div className="so-hero-copy"><span className="so-hero-kicker"><span className="so-live-dot" />THE FUTURE IS A WORK IN PROGRESS</span><h2>Make your<br /><span>next move.</span><i aria-hidden="true">↗</i></h2><p>Your path from curious learner to confident builder. One meaningful step at a time.</p><div className="so-hero-actions"><Button onClick={() => next ? taskDestination(next, setModal) : navigate('/journey')} icon="ArrowUpRight">{next ? 'Continue today’s plan' : 'Explore my journey'}</Button><button onClick={() => navigate('/journey')}>View the whole journey<Icon name="ArrowRight" size={15} /></button></div><div className="so-hero-foot"><span>DAY <strong>{journey.day.toLocaleString()}</strong> / {journey.totalDays.toLocaleString()}</span><div><i style={{
                width: Math.min(100, journey.day / journey.totalDays * 100) + '%'
              }} /></div><span>{Math.round(journey.day / journey.totalDays * 100)}% of the journey</span></div></div><div className="so-hero-world"><OrbitScene scores={Object.fromEntries(path.skills.slice(0, 2).map(s => [s, scores[s]]))} /><button className="so-next-stop" onClick={() => navigate('/journey')}><span className="so-stop-icon"><Icon name="Flag" size={15} /></span><span><small>NEXT DESTINATION</small><strong>{path.destination}</strong></span><Icon name="ArrowUpRight" size={16} /></button></div></PointerSurface>
      <section className="so-streak-card card"><div className="so-card-eyebrow">CONSISTENCY CLUB<Icon name="Flame" size={19} /></div><div className="so-streak-value"><CountUp value={metrics.streak} /><span>day<br />streak</span><div className="so-streak-flame"><Icon name="Flame" size={44} /></div></div><p>Small efforts. Serious momentum.</p><WeekStreak /><div className="so-today-progress"><span>Today’s progress<strong>{complete}<small> / {tasks.length}</small></strong></span><Progress value={complete / Math.max(1, tasks.length) * 100} color="mint" /><small>{tasks.length ? tasks.length - complete + ' activities left to make today count' : 'A little room to recharge today'}</small></div></section>
    </div>
    <div className="so-metrics-grid so-section"><Metric icon="Target" color="violet" title="Career readiness" value={metrics.readiness} unit="/100" description="See your preparation signals" chart={growth} onClick={() => navigate('/progress')} /><Metric icon="Code2" color="blue" title="Problems practiced" value={metrics.solved} description="Keep sharpening your patterns" onClick={() => navigate('/practice')} /><Metric icon="ChartNoAxesCombined" color="green" title="Practice accuracy" value={metrics.accuracy} unit="%" description="Turn feedback into understanding" onClick={() => navigate('/progress')} /><Metric icon="Sparkles" color="orange" title="Experience earned" value={journey.xp} unit="XP" description="Every useful action adds up" chart={activity} onClick={() => navigate('/journey')} /></div>
    <CampusInboxBanner />
    <div className="so-dashboard-columns"><section className="so-today-card card"><div className="so-panel-head"><div><span className="so-overline">FOCUS, NOT FRICTION</span><h2>Your focus for today<span className="so-heading-dot" /></h2><p>{tasks.length} activities · {minutes} minutes of focused preparation</p></div><button className="so-square-button" aria-label="Open my preparation plan" onClick={() => navigate('/journey')}><Icon name="ArrowUpRight" size={20} /></button></div><div className="so-task-list">{tasks.length ? tasks.map((task, i) => <div className="so-task-wrap" key={task.id}><span className="so-task-number">{String(i + 1).padStart(2, '0')}</span><TaskRow task={task} onOpen={t => taskDestination(t, setModal)} /></div>) : <div className="so-rest-day"><Icon name="Coffee" size={30} /><h3>Rest is part of the plan.</h3><p>Recharge today. Your next step will be here.</p></div>}</div><div className="so-plan-footer"><span><Icon name="CalendarHeart" size={17} />A plan with room for real life.</span><button onClick={() => setModal({
            type: 'rest'
          })}>Adjust my week<Icon name="ArrowUpRight" size={14} /></button></div></section>
      <section className="so-skills-card card"><div className="so-panel-head"><div><span className="so-overline">A LITTLE MORE READY</span><h2>Your skill spectrum</h2></div><Icon name="ChartNoAxesCombined" size={20} /></div><div className="so-readiness"><Ring value={metrics.readiness} size={116} /><div><Badge color="mint">Preparation estimate</Badge><strong>Progress you<br />can build on.</strong><button onClick={() => navigate('/progress')}>View the evidence<Icon name="ArrowUpRight" size={13} /></button></div></div><div className="so-spectrum">{Object.entries(scores).map(([skill, score], i) => <div key={skill}><span><i style={{
                background: ['#8b67ff', '#4386ff', '#f89858', '#2ca882', '#de6db5', '#76a448'][i]
              }} />{skill}</span><div><i style={{
                width: score + '%',
                background: ['#8b67ff', '#4386ff', '#f89858', '#2ca882', '#de6db5', '#76a448'][i]
              }} /></div><strong>{score}<small>/100</small></strong></div>)}</div><button className="so-quid-tip" onClick={() => setAssistant({
          topic: ''
        })}><span>q<sup>✦</sup></span><span>Make sense of your progress<small>Ask Quid what to focus on next</small></span><Icon name="ArrowUpRight" size={17} /></button></section></div>
    <div className="so-dashboard-lower"><section className="so-continue-card card"><div className="so-panel-head"><div><span className="so-overline">STAY CURIOUS</span><h2>Pick up where you left off</h2></div><button className="text-link" onClick={() => navigate('/learn')}>All learning<Icon name="ArrowUpRight" size={15} /></button></div><div className="so-course-rows">{courses.map(c => <button key={c.id} onClick={() => setModal({
            type: 'course',
            id: c.id
          })}><CourseArt type={c.id} small /><span><small>{c.category} · {c.level}</small><strong>{c.title}</strong><span><Progress value={(state.courseProgress[c.id] || 0) / c.lessons * 100} /><small>{state.courseProgress[c.id] || 0}/{c.lessons}</small></span></span><span className="so-course-play"><Icon name="Play" size={15} /></span></button>)}{!courses.length && <div className="so-rest-day"><Icon name="BadgeCheck" size={30} /><h3>You’ve finished the current courses in your track.</h3><Button variant="secondary" onClick={() => navigate('/learn')}>Find your next subject</Button></div>}</div></section><PointerSurface className="so-build-card"><div className="so-build-art" aria-hidden="true"><span className="so-build-window"><i /><i /><i /><b>{'{ }'}</b><span /><span /><span /></span><span className="so-build-block block-a">↗</span><span className="so-build-block block-b">✦</span><span className="so-build-orbit" /></div><span className="so-overline">LESS THEORY. MORE “I BUILT THIS.”</span><h2>Turn your skills<br />into something real.</h2><p>{project.title}</p><div className="so-build-footer"><span>{done} / {project.steps.length} milestones</span><button aria-label={'Open project ' + project.title} onClick={() => setModal({
            type: 'project',
            id: project.id
          })}><Icon name="ArrowUpRight" size={21} /></button></div></PointerSurface></div>
    <section className="so-activity-card card"><SectionHead title="A year of showing up." subtitle="Your learning, practice and building, one square at a time." action="Explore activity" onAction={() => navigate('/progress')} /><Heatmap /></section>
  </div>;
}
function Metric({
  icon,
  color,
  title,
  value,
  unit,
  description,
  chart,
  onClick
}) {
  return <button className={'so-metric so-metric-' + color + ' card'} onClick={onClick}><div className="so-metric-label"><span><Icon name={icon} size={17} /></span>{title}<Icon name="ArrowUpRight" size={14} /></div><div className="so-metric-value"><strong><CountUp value={value} /></strong>{unit && <span>{unit}</span>}{chart && <Sparkline values={chart} />}</div><p>{description}</p></button>;
}
