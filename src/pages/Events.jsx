import { CampusEvents } from '../components/CampusCommunity.jsx';
import React, { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { PageHead, Button, Icon, Badge, Avatar, Empty } from '../components/ui.jsx';
import { CollegeUpdates } from '../components/CollegeConnected.jsx';
export default function Events() {
  const {
    state
  } = useStore();
  return state.communityEnabled ? <><CampusEvents /><section className='campus-official-events card'><h2>Beyond the campus</h2><p>Official resources from the existing event catalog.</p>{state.catalog.events.map(e => <a key={e.id} href={e.sourceUrl} target='_blank' rel='noreferrer'>{e.name}<Icon name='ArrowUpRight' size={14} /></a>)}</section></> : <LegacyEvents />;
}
function LegacyEvents() {
  const {
    state,
    setModal
  } = useStore();
  const [filter, setFilter] = useState('All happenings');
  const events = state.catalog.events.filter(e => filter === 'All happenings' || filter === 'My calendar' && state.registrations.includes(e.id) || e.type === filter);
  return <><PageHead eyebrow="EVENTS & HACKATHONS" title="Events & hackathons" description="Browse college events, workshops and opportunities to build with a team."><Badge color="mint"><Icon name="CalendarCheck" size={14} />{state.registrations.length} on your calendar</Badge></PageHead><CollegeUpdates kind="Event" /><div className="events-hero"><div><Badge color="glass">A LITTLE OUTSIDE YOUR COMFORT ZONE</Badge><h2>Some of the best things<br />start with “I'll give it a try.”</h2><p>{state.profile.year < 4 ? 'Events and hackathons are part of your journey. Pick something that makes you curious.' : 'Your final-year focus comes first. Join an event whenever it feels right for you.'}</p><Button variant="dark" icon="ArrowUpRight" onClick={() => setModal({
          type: 'event',
          id: state.catalog.events[0].id
        })}>Find my next experience</Button></div><div className="events-hero-art"><span className="event-orbit orbit-a" /><span className="event-orbit orbit-b" /><span className="event-globe">✳</span><span className="event-ticket"><Icon name="Ticket" size={24} />ADMIT ONE<br /><strong>your next idea.</strong></span><span className="event-confetti">✦</span></div></div><div className="section-head"><div className="filter-pills">{['All happenings', 'Hackathon', 'Workshop', 'Meetup', 'My calendar'].map(f => <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>{f === 'Hackathon' ? 'Hackathons' : f === 'Workshop' ? 'Workshops' : f === 'Meetup' ? 'Meetups' : f}</button>)}</div><span className="small-text">A little something for every starting point.</span></div><div className="events-grid">{events.map(e => <article className="card event-card" key={e.id}><button className={`event-poster tone-${e.color}`} onClick={() => setModal({
          type: 'event',
          id: e.id
        })}><div className="event-poster-top"><Badge color="glass">{e.type}</Badge><span className="event-date"><strong>OCT</strong><small>2026</small></span></div><h2>{e.title}</h2><span className="event-poster-flower">{e.id === 'buildathon' ? '✳' : e.id === 'design' ? '✺' : '✧'}</span><span className="event-poster-label">{e.label}</span></button><div className="event-card-body"><div><h3>{e.name}</h3>{state.registrations.includes(e.id) && <span className="registered-check"><Icon name="CircleCheck" size={17} /></span>}</div><p><Icon name="MapPin" size={14} />{e.location}</p><p><Icon name="Clock3" size={14} />{e.dateLabel || e.time}</p><footer><div><span>Official event resources</span></div><Button variant="secondary" icon="ArrowUpRight" onClick={() => setModal({
              type: 'event',
              id: e.id
            })}>{state.registrations.includes(e.id) ? 'On my calendar' : 'Take a look'}</Button></footer></div></article>)}</div>{!events.length && <div className="card"><Empty icon="CalendarHeart" title="No events match this filter." description="Browse all events or choose another event type." action="Explore events" onAction={() => setFilter('All happenings')} /></div>}<div className="events-plan-note"><span className="note-flower">✿</span><div><h3>Events in your preparation plan</h3><p>Registered events can become scheduled activities in your preparation journey.</p></div><Button variant="secondary" icon="Route" onClick={() => setModal({
        type: 'day',
        date: new Date().toISOString().slice(0, 10),
        topic: 'Open-source participation'
      })}>How it fits my journey</Button></div></>;
}
