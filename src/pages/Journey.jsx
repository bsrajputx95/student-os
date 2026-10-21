import React, { useState, useRef, useEffect } from 'react';
import { useStore, today, navigate } from '../lib/store.jsx';
import { PageHead, Button, Badge, Icon, Tabs, Progress, TaskRow, taskDestination, Modal } from '../components/ui.jsx';
import { missionFor, chapters, calendarDay } from '../../shared/journey.js';
const step = 104,
  padding = 100;
const xFor = i => 50 + Math.sin(i * Math.PI / 4) * 24;
export default function Journey() {
  const {
    state,
    setModal
  } = useStore();
  const {
    profile,
    journey,
    metrics,
    catalog
  } = state;
  const [tab, setTab] = useState('map'),
    [selected, setSelected] = useState(journey.day),
    [offset, setOffset] = useState(Math.max(0, (journey.day - 3) * step)),
    [jump, setJump] = useState(journey.day);
  const scroll = useRef(null);
  const preview = missionFor(profile, journey, selected, catalog),
    mission = !preview.rest && preview.date === today() && state.tasks.some(t => t.date === today()) ? {
      ...preview,
      steps: state.tasks.filter(t => t.date === today()),
      rest: false
    } : preview;
  const start = Math.max(0, Math.floor(offset / step) - 4),
    end = Math.min(journey.totalDays, start + 24);
  const visible = Array.from({
    length: end - start
  }, (_, i) => start + i);
  function go(day) {
    const d = Math.max(1, Math.min(journey.totalDays, Number(day) || 1));
    setSelected(d);
    setJump(d);
    setOffset(Math.max(0, (d - 3) * step));
    scroll.current?.scrollTo({
      top: Math.max(0, (d - 3) * step),
      behavior: 'instant'
    });
  }
  useEffect(() => {
    setSelected(journey.day);
    setJump(journey.day);
    setOffset(Math.max(0, (journey.day - 3) * step));
    scroll.current?.scrollTo({
      top: Math.max(0, (journey.day - 3) * step),
      behavior: 'instant'
    });
  }, [journey.startedAt, journey.totalDays, journey.revision]);
  useEffect(() => {
    if (tab === 'map') scroll.current?.scrollTo({
      top: Math.max(0, (journey.day - 3) * step)
    });
  }, [tab]);
  return <><PageHead eyebrow="A LONG GAME. ONE GOOD DAY AT A TIME." title="Your journey, all the way." description={`${profile.track} · ${journey.totalDays.toLocaleString()} days of learning, practice, projects, and recovery.`}><Button variant="secondary" icon="ClipboardCheck" onClick={() => setModal({
        type: 'diagnostic'
      })}>{profile.diagnostic ? 'Review my baseline' : 'Check my starting point'}</Button><Button variant="secondary" icon="SlidersHorizontal" onClick={() => setModal({
        type: 'plan-setup'
      })}>Set my deadline</Button></PageHead><div className="journey-window-banner"><div><Icon name="Flag" size={20} /><span>Target: <strong>{journey.targetDate || 'Your next chapter'}</strong> · {Math.max(0, journey.totalDays - calendarDay(journey, today()))} calendar days after today</span></div><span>Rest is scheduled. Missed days stay incomplete. Today’s plan follows the calendar.</span></div><div className="trail-summary card"><span className="summary-icon tone-purple"><Icon name="Route" size={25} /></span><div><small>YOUR CURRENT POSITION</small><h2>Day {journey.day} <span>/ {journey.totalDays}</span></h2></div><div className="trail-summary-bar"><span>{chapters[Math.min(7, Math.floor((journey.day - 1) / journey.totalDays * 8))]}</span><Progress value={(journey.day - 1) / journey.totalDays * 100} /></div><Badge color="mint"><Icon name="Flame" size={14} />{metrics.streak} day streak</Badge><Badge>{journey.xp.toLocaleString()} XP</Badge></div><Tabs items={[{
      id: 'map',
      label: 'Adventure map',
      icon: 'Map'
    }, {
      id: 'week',
      label: 'My next 7 days',
      icon: 'CalendarDays'
    }, {
      id: 'chapters',
      label: 'Chapters',
      icon: 'Flag'
    }]} value={tab} onChange={setTab} />{tab === 'map' ? <div className="trail-layout"><section className="card trail-map"><div className="trail-toolbar"><div><h3>There’s a whole world ahead.</h3><small>Scroll to explore every day of your path.</small></div><div className="trail-jumps"><button onClick={() => go(1)}>Start</button><button className="active" onClick={() => go(journey.day)}>Today</button><button onClick={() => go(journey.totalDays)}>Finish</button></div></div><div ref={scroll} className="trail-scroll" tabIndex={0} aria-label={`Preparation map, ${journey.totalDays} days. Scroll or use jump controls.`} onScroll={e => setOffset(e.currentTarget.scrollTop)}><div className="trail-world" style={{
            height: journey.totalDays * step + padding * 2
          }}><div className="trail-road" style={{
              top: start * step + padding,
              height: (end - start) * step + 10
            }}><svg viewBox={`0 0 1000 ${(end - start) * step + 10}`} preserveAspectRatio="none"><path d={visible.map((i, j) => j === 0 ? `M ${xFor(i) * 10} 0` : `C ${xFor(i - 1) * 10} ${(j - .5) * step} ${xFor(i) * 10} ${(j - .5) * step} ${xFor(i) * 10} ${j * step}`).join(' ')} fill="none" stroke="#fff" strokeWidth="40" /><path d={visible.map((i, j) => j === 0 ? `M ${xFor(i) * 10} 0` : `C ${xFor(i - 1) * 10} ${(j - .5) * step} ${xFor(i) * 10} ${(j - .5) * step} ${xFor(i) * 10} ${j * step}`).join(' ')} fill="none" stroke="#ccbee8" strokeWidth="3" strokeDasharray="7 9" /></svg></div>{visible.map(i => {
              const day = i + 1,
                m = missionFor(profile, journey, day, catalog),
                current = day === journey.day,
                complete = journey.completedDays?.includes(day);
              return <React.Fragment key={day}>{i % 14 === 0 && <div className="trail-decoration" style={{
                  top: i * step + padding + 25,
                  left: xFor(i) > 50 ? '10%' : '75%'
                }}><span>{['🌱', '🌳', '⛰️', '🌼'][Math.floor(i / 14) % 4]}</span><small>{m.chapter}</small></div>}{(i === 0 || Math.floor(i / journey.totalDays * 8) !== Math.floor((i - 1) / journey.totalDays * 8)) && <span className="trail-chapter-label" style={{
                  top: i * step + padding - 70
                }}>CHAPTER {m.phase + 1} · {m.chapter}</span>}<button className={`trail-node ${complete ? 'complete' : ''} ${current ? 'current' : ''} ${selected === day ? 'selected' : ''} ${m.rest ? 'rest' : ''} ${m.checkpoint ? 'checkpoint' : ''}`} style={{
                  top: i * step + padding,
                  left: `${xFor(i)}%`
                }} onClick={() => setSelected(day)} aria-label={`Day ${day}: ${m.rest ? 'Recovery day' : m.chapter}${current ? ', you are here' : ''}`}><span>{m.rest ? <Icon name="Coffee" size={22} /> : m.checkpoint ? <Icon name="Trophy" size={23} /> : complete ? <Icon name="Check" size={23} /> : day}</span><small>{current ? 'YOU ARE HERE' : m.rest ? 'REST DAY' : m.checkpoint ? 'CHECKPOINT' : `DAY ${day}`}</small>{current && <span className="trail-traveller" aria-hidden="true"><svg viewBox="0 0 30 48"><path d="M11 31L9 43M19 31l3 12" stroke="#5d518e" strokeWidth="5" strokeLinecap="round" /><path d="M8 20Q15 15 22 20L21 34H9Z" fill="#8273cb" /><rect x="19" y="19" width="8" height="13" rx="3" fill="#edb38f" /><circle cx="15" cy="11" r="7" fill="#edc3a4" /><path d="M8 10c0-10 15-9 14 1l-5-2-2-4-2 4Z" fill="#665174" /></svg></span>}</button></React.Fragment>;
            })}<div className="trail-finish" style={{
              top: journey.totalDays * step + padding - 40
            }}><Icon name="Flag" size={28} /><strong>Your next chapter starts here.</strong><span>Day {journey.totalDays} · Keep growing.</span></div></div></div><form className="trail-jump-form" onSubmit={e => {
          e.preventDefault();
          go(jump);
        }}><label htmlFor="jump-day">Jump to day</label><input id="jump-day" type="number" min={1} max={journey.totalDays} value={jump} onChange={e => setJump(e.target.value)} /><Button variant="secondary" type="submit" icon="ArrowRight">Go</Button><small>All {journey.totalDays} days · rest included</small></form></section><aside className="card trail-mission"><Badge color={selected === journey.day ? 'purple' : 'blue'}>{selected === journey.day ? 'YOUR CURRENT DAY' : 'DAY PREVIEW'}</Badge><span className="trail-day-number">{String(selected).padStart(3, '0')}</span><small>CHAPTER {mission.phase + 1}</small><h2>{mission.rest ? 'Room to recover.' : mission.checkpoint ? 'See how far you’ve come.' : mission.chapter}</h2><p>{mission.rest ? 'Recovery is scheduled, not earned. Take a break, catch up gently, and return tomorrow.' : `${profile.dailyMinutes} focused minutes. A balanced mix that keeps your whole skill set growing.`}</p>{mission.steps.map((s, i) => <div className="trail-mission-step" key={i}><span><Icon name={['Code2', 'BookOpen', 'Blocks', mission.event ? 'Users' : 'MessageSquare'][i]} size={17} /></span><div><strong>{s.title}</strong><small>{s.category} · {s.minutes} min</small></div></div>)}<Button icon="ArrowUpRight" onClick={() => setModal({
          type: 'mission',
          day: selected
        })}>{mission.rest ? 'See recovery day' : 'Explore day ' + selected}</Button><Button variant="ghost" icon="Coffee" onClick={() => setModal({
          type: 'rest'
        })}>Plan leave or a break</Button><div className="trail-preview-note">{selected < journey.day ? 'You’ve passed this stop. Revisit it whenever you want.' : selected > journey.day ? 'Preview ahead. Your current tasks stay on today’s plan.' : 'Complete today’s tasks to move your traveller forward.'}</div></aside></div> : tab === 'week' ? <div className="trail-week-grid">{Array.from({
        length: Math.min(7, journey.totalDays - journey.day + 1)
      }, (_, i) => {
        const m = missionFor(profile, journey, journey.day + i, catalog);
        return <button key={i} className="card trail-week-day" onClick={() => {
          setTab('map');
          setTimeout(() => go(m.number), 0);
        }}><small>DAY {m.number} · {m.date}</small><Icon name={m.rest ? 'Coffee' : m.event ? 'Users' : 'Flag'} size={25} /><h3>{m.rest ? 'Recovery day' : m.chapter}</h3><p>{m.rest ? 'Rest, reset, return.' : m.steps[0].title}</p><Badge color={m.rest ? 'mint' : 'purple'}>{m.rest ? 'Rest' : profile.dailyMinutes + ' min'}</Badge></button>;
      })}</div> : <div className="trail-chapters">{chapters.map((c, i) => {
        const first = Math.floor(i * journey.totalDays / 8) + 1,
          last = Math.floor((i + 1) * journey.totalDays / 8);
        return <button className="card" key={c} onClick={() => {
          setTab('map');
          setTimeout(() => go(first), 0);
        }}><span>0{i + 1}</span><div><h3>{c}</h3><p>Day {first}–{last} · practice, build, review, and recover</p></div><Icon name="ArrowUpRight" /></button>;
      })}</div>}<section className="card trail-today"><div className="section-head"><div><h2>Today’s connected tasks</h2><p>Finish here or in the practice, learning, and career sections.</p></div><Badge color="mint">{metrics.completedToday}/{metrics.totalToday}</Badge></div>{state.tasks.filter(t => t.date === today()).map(t => <TaskRow key={t.id} task={t} onOpen={task => taskDestination(task, setModal)} />)}{!metrics.totalToday && <p>{journey.targetDate < today() ? 'Your preparation window has ended. Set a new deadline to build your next plan.' : 'A scheduled recovery day. Explore your next stop whenever you like.'}</p>}</section></>;
}
export function DayMission({
  day,
  close
}) {
  const {
    state,
    setModal
  } = useStore();
  const preview = missionFor(state.profile, state.journey, day, state.catalog),
    m = !preview.rest && preview.date === today() && state.tasks.some(t => t.date === today()) ? {
      ...preview,
      steps: state.tasks.filter(t => t.date === today()),
      rest: false
    } : preview;
  return <Modal title={`Day ${m.number} · ${m.rest ? 'Recovery' : m.chapter}`} subtitle={m.date + ' · ' + (m.number === state.journey.day ? 'Current day' : 'Journey preview')} onClose={close}>{m.rest ? <div className="empty"><Icon name="Coffee" size={40} /><h3>Take a breath. You’re still moving.</h3><p>Rest is part of a balanced long-term plan. No tasks are required for this day.</p></div> : <><p className="body-copy">Your plan combines coding, learning, building, and explaining your work. Open a step to get started.</p>{m.steps.map((s, i) => <button className="mission-open-step" key={i} onClick={() => {
        if (s.kind === 'review' && m.date !== today()) setModal({
          type: 'info',
          title: 'A reflection for ' + m.date,
          text: 'This is a preview. The reflection opens from your task list when this day arrives.'
        });else if (['assessment', 'review'].includes(s.kind)) {
          close();
          taskDestination(s, setModal);
        } else if (s.kind === 'coding') setModal({
          type: state.catalog.problems.find(p => p.id === s.resourceId)?.external ? 'external-problem' : 'coding',
          id: s.resourceId
        });else if (s.kind === 'event') {
          close();
          navigate('/events');
        } else if (s.kind === 'interview') {
          close();
          navigate('/career?tab=interview');
        } else setModal({
          type: s.kind,
          id: s.resourceId,
          lesson: s.lesson
        });
      }}><span>{i + 1}</span><div><strong>{s.title}</strong><small>{s.category} · {s.minutes} min</small></div><Icon name="ArrowUpRight" size={17} /></button>)}<p className="quiet-note">Future days are previews. Only today’s task list advances your current journey position.</p></>}</Modal>;
}
