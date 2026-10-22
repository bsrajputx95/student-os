import React from 'react';
import { useStore, navigate, today } from '../lib/store.jsx';
import { Icon, Button, Badge, SectionHead, Progress, Ring, TaskRow, taskDestination, CourseArt, Heatmap, WeekStreak } from '../components/ui.jsx';
import { CountUp, PointerSurface, Sparkline } from '../components/DesignEffects.jsx';
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
    <div className="so-dashboard-heading so-section"><div><span className="so-overline"><i />YOUR DAY, WITH DIRECTION</span><h1>Good {hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'}, {profile.name.split(' ')[0]}<span className="so-heading-star" aria-hidden="true">✳</span></h1><p>A little learning, a little building. Here’s what’s next for you.</p></div><button className="so-track-switch" onClick={() => setModal({
        type: 'onboarding'
      })}><span className="so-track-icon"><Icon name="Compass" size={19} /></span><span><small>YOUR DIRECTION</small><strong>{profile.track}</strong></span><Icon name="SlidersHorizontal" size={15} /></button></div>
    <div className="so-hero-grid so-section"><section className="focus-studio">
      <div className="focus-studio-copy"><span className="focus-label"><span />YOUR PERSONAL GAME PLAN</span><h2>Small steps.<br /><em>Big possibilities.</em></h2><p>{next ? next.title : 'You’ve cleared today’s plan. Explore your next destination or take a well-earned break.'}</p><div className="focus-details"><span><Icon name="Clock3" size={15} />{next ? next.minutes + ' min next activity' : 'Today is complete'}</span><span><Icon name="Compass" size={15} />{profile.track}</span></div><Button onClick={() => next ? taskDestination(next, setModal) : navigate('/journey')} icon="ArrowUpRight">{next ? 'Continue today’s plan' : 'Explore my journey'}</Button></div>
      <button className="journey-preview" onClick={() => navigate('/journey')} aria-label="Explore my full preparation journey"><div className="journey-preview-head"><span><Icon name="Route" size={18} />YOUR JOURNEY</span><Icon name="ArrowUpRight" size={18} /></div><div className="journey-preview-map" aria-hidden="true"><svg viewBox="0 0 260 110" fill="none"><path d="M20 85H72C106 85 73 30 111 30H153C190 30 161 85 201 85H240" stroke="currentColor" strokeWidth="3" strokeDasharray="5 7" /><circle cx="20" cy="85" r="12" fill="#ffda7c" /><path d="m15 85 4 4 6-7" stroke="#392655" strokeWidth="2" /><circle cx="130" cy="30" r="18" fill="#fff" /><path d="m124 30 4 4 8-9" stroke="#6844cf" strokeWidth="3" /><circle cx="240" cy="85" r="12" fill="#b9a0ff" /><path d="M236 89v-10l8 3-8 3" stroke="#fff" strokeWidth="2" /></svg><span className="journey-you">YOU ARE HERE</span></div><div className="journey-preview-summary"><strong>Day {journey.day.toLocaleString()}<small> / {journey.totalDays.toLocaleString()}</small></strong><span>{Math.round(journey.day / journey.totalDays * 100)}%</span></div><Progress value={journey.day / journey.totalDays * 100} /><div className="journey-preview-destination"><span>Working toward</span><strong>{path.destination}<Icon name="ArrowRight" size={14} /></strong></div></button>
      </section><section className="so-streak-card card"><div className="so-card-eyebrow">KEEP YOUR FIRE GOING<Icon name="Flame" size={20} /></div><div className="so-streak-value"><CountUp value={metrics.streak} /><span>day<br />streak</span><div className="so-streak-flame"><Icon name="Flame" size={44} /></div></div><p>Showing up is a skill. You’ve got this.</p><WeekStreak /><div className="so-today-progress"><span>Today’s progress<strong>{complete}<small> / {tasks.length}</small></strong></span><Progress value={complete / Math.max(1, tasks.length) * 100} color="mint" /><small>{tasks.length ? tasks.length - complete + ' activities left on your plan' : 'A little room to recharge today'}</small></div></section></div>
    <div className="so-metrics-grid so-section"><Metric icon="Target" color="violet" title="Career readiness" value={metrics.readiness} unit="/100" description="Your progress across essential skills" chart={growth} onClick={() => navigate('/progress')} /><Metric icon="Code2" color="blue" title="Problems practiced" value={metrics.solved} description="One problem. One new perspective." onClick={() => navigate('/practice')} /><Metric icon="ChartNoAxesCombined" color="green" title="Practice accuracy" value={metrics.accuracy} unit="%" description="Correct answers across your attempts" onClick={() => navigate('/progress')} /><Metric icon="Sparkles" color="orange" title="Experience earned" value={journey.xp} unit="XP" description="Learn, build and unlock milestones" chart={activity} onClick={() => navigate('/journey')} /></div>
    <CampusInboxBanner />
    <div className="so-dashboard-columns"><section className="so-today-card card"><div className="so-panel-head"><div><span className="so-overline">LET’S MAKE PROGRESS</span><h2>Your to-do, made doable<span className="so-heading-dot" /></h2><p>{tasks.length} activities · {minutes} minutes of focused preparation</p></div><button className="so-square-button" aria-label="Open my preparation plan" onClick={() => navigate('/journey')}><Icon name="ArrowUpRight" size={20} /></button></div><div className="so-task-list">{tasks.length ? tasks.map((task, i) => <div className="so-task-wrap" key={task.id}><span className="so-task-number">{String(i + 1).padStart(2, '0')}</span><TaskRow task={task} onOpen={t => taskDestination(t, setModal)} /></div>) : <div className="so-rest-day"><Icon name="Coffee" size={30} /><h3>Rest is part of the plan.</h3><p>Recharge today. Your next step will be here.</p></div>}</div><div className="so-plan-footer"><span><Icon name="CalendarHeart" size={17} />A plan with room for real life.</span><button onClick={() => setModal({
            type: 'rest'
          })}>Adjust my week<Icon name="ArrowUpRight" size={14} /></button></div></section>
      <section className="so-skills-card card"><div className="so-panel-head"><div><span className="so-overline">GETTING CLOSER</span><h2>Your skills, in focus</h2></div><Icon name="ChartNoAxesCombined" size={20} /></div><div className="so-readiness"><Ring value={metrics.readiness} size={116} /><div><Badge color="mint">Preparation estimate</Badge><strong>Progress you<br />can build on.</strong><button onClick={() => navigate('/progress')}>View the evidence<Icon name="ArrowUpRight" size={13} /></button></div></div><div className="so-spectrum">{Object.entries(scores).map(([skill, score], i) => <div key={skill}><span><i style={{
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
