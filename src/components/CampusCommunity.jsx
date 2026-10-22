import { CoursePreview } from './LearningLibrary.jsx';
import ProfileImage from './ProfileImage.jsx';
import { MemberSafety, ReportPost, Moderation, EventTools } from './CommunityTools.jsx';
import React, { useState, useRef, useEffect } from 'react';
import { useStore, navigate, yearLabel } from '../lib/store.jsx';
import { Button, Icon, Badge, Modal, Empty, PageHead } from './ui.jsx';
const dateLabel = t => new Date(t.length === 10 ? t + 'T12:00:00' : t).toLocaleDateString('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
});
function initials(p) {
  return p?.name.replace(/^Dr\. /, '').split(' ').map(x => x[0]).slice(0, 2).join('') || 'SO';
}
function MemberBadge({
  person
}) {
  return <Badge color={person?.role === 'student' ? 'purple' : person?.role === 'placement' ? 'mint' : 'blue'}>{person?.role === 'student' ? yearLabel(person.year) : person?.role === 'placement' ? 'Placement team' : person?.designation || 'Faculty'}</Badge>;
}
export function CampusAvatar({
  person,
  onClick
}) {
  const Tag = onClick ? 'button' : 'span';
  return <Tag className={`campus-member-avatar tone-${person?.color || 'purple'}`} onClick={onClick} title={person?.name} aria-label={onClick ? 'View ' + person?.name : undefined}>{initials(person)}<ProfileImage person={person} /></Tag>;
}
function Person({
  person,
  onOpen
}) {
  return <div className="campus-person"><button onClick={() => onOpen(person)}><strong>{person?.name || 'College member'}</strong><MemberBadge person={person} /></button><small>@{person?.handle} · {person?.department}</small></div>;
}
function Profile({
  person,
  onClose,
  onMessage
}) {
  const {
      state,
      act
    } = useStore(),
    me = state.profile.id,
    following = state.communityFollows.some(f => f.from === me && f.to === person.id);
  return <Modal title={person.name} subtitle={'@' + person.handle} onClose={onClose}><div className="campus-profile-modal"><CampusAvatar person={person} /><MemberBadge person={person} /><p>{person.bio || 'A member of the connected campus.'}</p><div><span>{state.communityPeople.find(p => p.id === person.id)?.followers ?? 0} followers</span><span>{state.communityPeople.find(p => p.id === person.id)?.followingCount ?? 0} following</span><span>{person.postCount ?? 0} posts</span></div><small>{person.department} · {state.profile.college}{person.studentId && ' · Student ID: ' + person.studentId}</small>{person.id !== me && <footer><Button variant="secondary" onClick={() => act('community.follow', {
          id: person.id
        }).catch(() => {})}>{following ? 'Following' : 'Follow'}</Button><Button icon="MessageCircle" onClick={() => onMessage(person.id)}>Message</Button><MemberSafety id={person.id} /></footer>}</div></Modal>;
}
export default function CampusCommunity({
  initialTab = 'feed'
}) {
  const {
      state,
      act
    } = useStore(),
    me = state.profile.id,
    staff = state.profile.role !== 'student',
    people = state.communityPeople || [],
    byId = new Map(people.map(p => [p.id, p]));
  const [tab, setTab] = useState(initialTab),
    [query, setQuery] = useState(''),
    [year, setYear] = useState(''),
    [role, setRole] = useState(''),
    [tag, setTag] = useState(''),
    [count, setCount] = useState(24),
    [draft, setDraft] = useState(''),
    [draftTag, setDraftTag] = useState('Learning'),
    [busy, setBusy] = useState(false),
    [profile, setProfile] = useState(null);
  const [feed, setFeed] = useState({
    posts: state.communityPosts,
    cursor: null,
    hasMore: false
  });
  const feedTicket = useRef(0);
  useEffect(() => {
    const ticket = ++feedTicket.current;
    const params = new URLSearchParams({
      query,
      year,
      tag: tab === 'announcements' ? 'Announcement' : tag,
      limit: '100'
    });
    const controller = new AbortController();
    fetch('/api/community/posts?' + params, {
      signal: controller.signal
    }).then(r => r.json()).then(data => {
      if (data.error) throw new Error(data.error);
      if (ticket === feedTicket.current) setFeed(data);
    }).catch(() => {});
    return () => controller.abort();
  }, [query, year, tag, tab, state.communityVersion]);
  async function earlier() {
    if (count < feed.posts.length) {
      setCount(n => n + 24);
      return;
    }
    try {
      const params = new URLSearchParams({
        query,
        year,
        tag: tab === 'announcements' ? 'Announcement' : tag,
        limit: '100',
        before: feed.cursor || ''
      });
      const res = await fetch('/api/community/posts?' + params),
        data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFeed(old => ({
        ...data,
        posts: [...data.posts, ...old.posts]
      }));
      setCount(n => n + data.posts.length);
    } catch {}
  }
  const bottom = useRef(null),
    first = useRef(true);
  const following = state.communityFollows.filter(f => f.from === me).map(f => f.to),
    followers = state.communityFollows.filter(f => f.to === me).length;
  const posts = feed.posts.filter(p => {
    const person = byId.get(p.author);
    return (tab !== 'following' || following.includes(p.author) || p.author === me) && (tab !== 'announcements' || p.tag === 'Announcement') && (!tag || p.tag === tag) && (!year || String(person?.year) === year) && (!query || [p.text, person?.name, p.tag].join(' ').toLowerCase().includes(query.toLowerCase()));
  }).toSorted((a, b) => a.time.localeCompare(b.time));
  useEffect(() => {
    if (first.current && tab === 'feed') {
      bottom.current?.scrollIntoView({
        block: 'nearest'
      });
      first.current = false;
    }
  }, [tab]);
  async function post(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await act('community.post', {
        text: draft,
        tag: draftTag
      }, 'Shared with your college.');
      setDraft('');
      setQuery('');
      setTag('');
      setYear('');
      setTab('feed');
      requestAnimationFrame(() => bottom.current?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      }));
    } catch {} finally {
      setBusy(false);
    }
  }
  function message(id) {
    navigate((staff ? '/staff/messages' : '/messages') + '?tab=' + id);
    setProfile(null);
  }
  const directory = people.filter(p => (!year || String(p.year) === year) && (!role || p.role === role) && (!query || [p.name, p.handle, p.department, p.designation].join(' ').toLowerCase().includes(query.toLowerCase())));
  return <><PageHead eyebrow="ONE CAMPUS. EVERY VOICE." title="Built together. Better together." description="Students, teachers, and your placement team share one college feed."><Button variant="secondary" icon="MessageCircle" onClick={() => message('global')}>Campus chat</Button></PageHead><div className="campus-data-strip"><span><strong>{people.filter(p => p.role === 'student').length}</strong> students</span><span><strong>{people.filter(p => p.role !== 'student').length}</strong> staff</span><span><strong>{state.communityStats?.posts?.toLocaleString() || state.communityPosts.length}</strong> posts</span>{state.profile.sampleData && <span><strong>4 years</strong> campus history</span>}</div><Moderation /><div className="campus-community-layout"><aside className="campus-community-aside"><section className="card campus-my-profile"><div className="campus-profile-cover">✦ <span>✧</span></div><CampusAvatar person={byId.get(me)} /><h3>{state.profile.name}</h3><MemberBadge person={state.profile} /><small>@{state.profile.handle}</small><p>{state.profile.bio || 'Learning, building, and helping our campus grow.'}</p><div><button onClick={() => {
              setTab('people');
              setQuery('');
            }}><strong>{followers}</strong>followers</button><button onClick={() => setTab('following')}><strong>{following.length}</strong>following</button></div></section><section className="card campus-up-next"><span className="eyebrow">NEXT ON CAMPUS</span>{state.collegeEvents.filter(e => e.date >= new Date().toISOString().slice(0, 10)).slice(0, 3).map(e => <button key={e.id} onClick={() => setTab('events')}><Icon name="CalendarDays" size={16} /><span><strong>{e.name}</strong><small>{dateLabel(e.date)} · {e.type}</small></span></button>)}<button className="text-link" onClick={() => setTab('events')}>Explore the event archive<Icon name="ArrowUpRight" size={14} /></button></section>{state.profile.sampleData && <p className="campus-sample-caption">People, college events, applications, and historical posts are illustrative sample records. Official job listings retain their original sources.</p>}</aside><section className="card campus-feed-panel"><nav className="campus-feed-tabs" aria-label="College community tabs">{[['feed', 'Feed'], ['following', 'Following'], ['announcements', 'College'], ['people', 'People'], ['events', 'Events']].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => {
            setTab(id);
            setQuery('');
            setYear('');
            setTag('');
            setCount(24);
          }}>{label}</button>)}</nav>{tab === 'events' ? <CampusEvents embedded /> : <><div className="campus-feed-filters"><label><Icon name="Search" size={16} /><input aria-label={tab === 'people' ? 'Search college people' : 'Search college feed'} placeholder={tab === 'people' ? 'Find a name, username, or department…' : 'Search updates, projects, or people…'} value={query} onChange={e => {
                setQuery(e.target.value);
                setCount(24);
              }} /></label><select aria-label="Community year" value={year} onChange={e => setYear(e.target.value)}><option value="">All years</option>{[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}</select>{tab === 'people' ? <select aria-label="Community role" value={role} onChange={e => setRole(e.target.value)}><option value="">All people</option><option value="student">Students</option><option value="teacher">Teachers & academic staff</option><option value="placement">Placement officers</option></select> : <select aria-label="Feed topic" value={tag} onChange={e => setTag(e.target.value)}><option value="">All updates</option>{['Learning', 'Project', 'Question', 'Milestone', 'Announcement', 'Event'].map(t => <option key={t}>{t}</option>)}</select>}</div>{tab === 'people' ? <><div className="campus-directory-head"><strong>{directory.length} college members</strong><span>{people.filter(p => p.role === 'student').length} students · {people.filter(p => p.role === 'teacher' && p.department !== 'Academic Services').length} faculty · {people.filter(p => p.role === 'placement').length} placement · {people.filter(p => p.department === 'Academic Services').length} academic staff</span></div><div className="campus-directory">{directory.slice(0, count * 2).map(p => <article key={p.id}><CampusAvatar person={p} onClick={() => setProfile(p)} /><Person person={p} onOpen={setProfile} /><p>{p.bio}</p><footer>{p.id === me ? <Badge color="mint">You</Badge> : <><button onClick={() => act('community.follow', {
                      id: p.id
                    }).catch(() => {})}>{following.includes(p.id) ? 'Following' : '+ Follow'}</button><button aria-label={'Message ' + p.name} onClick={() => message(p.id)}><Icon name="MessageCircle" size={16} /></button></>}</footer></article>)}</div>{directory.length > count * 2 && <Button variant="ghost" onClick={() => setCount(n => n + 24)}>Show more people</Button>}</> : <><div className="campus-feed-order"><span>{posts.length} updates · oldest to newest</span><small>Newest updates appear above the composer</small></div>{(posts.length > count || feed.hasMore) && <button className="campus-load-earlier" onClick={earlier}><Icon name="ArrowUp" size={14} />Load earlier updates</button>}<div className="campus-feed-posts">{posts.slice(-count).map(p => <CampusPost key={p.id} post={p} person={byId.get(p.author)} byId={byId} onOpen={setProfile} />)}{!posts.length && <Empty icon="MessageCircle" title="Start a useful conversation." description="Share what you’re building or ask your college a question." />}<div ref={bottom} /></div><form className="campus-composer" onSubmit={post}><div><CampusAvatar person={byId.get(me)} /><textarea aria-label="Write a college post" rows={3} maxLength={2000} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Share a build, a question, or something you learned…" /></div><footer><select aria-label="Post category" value={draftTag} onChange={e => setDraftTag(e.target.value)}>{['Learning', 'Project', 'Question', 'Milestone', ...(staff ? ['Announcement', 'Event'] : [])].map(t => <option key={t}>{t}</option>)}</select><small>{draft.length}/2000 · Visible to your college</small><Button icon="ArrowUpRight" type="submit" disabled={busy || !draft.trim()}>{busy ? 'Sharing…' : 'Post update'}</Button></footer></form></>}</>}</section></div>{profile && <Profile person={profile} onClose={() => setProfile(null)} onMessage={message} />}</>;
}
function CampusPost({
  post,
  person,
  byId,
  onOpen
}) {
  const {
      state,
      act
    } = useStore(),
    me = state.profile.id;
  const [preview, setPreview] = useState(null);
  const [open, setOpen] = useState(false),
    [text, setText] = useState('');
  async function reply(e) {
    e.preventDefault();
    try {
      await act('community.comment', {
        id: post.id,
        text
      });
      setText('');
    } catch {}
  }
  return <article className="campus-post"><header><CampusAvatar person={person} onClick={() => onOpen(person)} /><Person person={person} onOpen={onOpen} /><small>{dateLabel(post.time)}</small></header><div className="campus-post-label"><Badge color={post.tag === 'Announcement' ? 'blue' : post.tag === 'Milestone' ? 'mint' : 'purple'}>{post.tag}</Badge></div><p>{post.text}</p>{post.resource?.type === 'course' && state.catalog.courses.some(c => c.id === post.resource.id) && <div className="campus-post-resource"><span><Icon name="BookOpen" size={23} /></span><div><strong>{state.catalog.courses.find(c => c.id === post.resource.id).title}</strong><small>Explore the concept behind this update</small></div><button onClick={() => state.profile.role === 'student' ? navigate('/learn?course=' + post.resource.id) : setPreview(state.catalog.courses.find(c => c.id === post.resource.id))}>{state.profile.role === 'student' ? 'Open course' : 'Preview course'} <Icon name="ArrowUpRight" size={14} /></button></div>}<footer><button className={post.likes.includes(me) ? 'is-liked' : ''} onClick={() => act('community.like', {
        id: post.id
      }).catch(() => {})}><Icon name="Heart" size={17} />{post.likes.length || ''} Like</button><button onClick={() => setOpen(!open)}><Icon name="MessageCircle" size={17} />{post.comments.length || ''} Reply</button>{post.author !== me && <button onClick={() => navigate((state.profile.role === 'student' ? '/messages' : '/staff/messages') + '?tab=' + post.author)}><Icon name="Send" size={16} />Message</button>}<ReportPost post={post} /></footer>{open && <section className="campus-post-replies">{post.comments.map(c => <div key={c.id}><CampusAvatar person={byId.get(c.author)} onClick={() => onOpen(byId.get(c.author))} /><p><strong>{byId.get(c.author)?.name}</strong>{c.text}</p></div>)}<form onSubmit={reply}><input aria-label="Reply to college post" value={text} maxLength={600} onChange={e => setText(e.target.value)} placeholder="Add a thoughtful reply…" /><button aria-label="Send college reply" disabled={!text.trim()}><Icon name="Send" size={16} /></button></form></section>}{preview && <CoursePreview course={preview} close={() => setPreview(null)} />}</article>;
}
export function CampusEvents({
  embedded = false
}) {
  const {
    state,
    act
  } = useStore();
  const [period, setPeriod] = useState('upcoming'),
    [year, setYear] = useState(''),
    [type, setType] = useState(''),
    [count, setCount] = useState(12);
  const today = new Date().toISOString().slice(0, 10),
    events = state.collegeEvents.filter(e => (period === 'all' || (period === 'past' ? e.date < today : e.date >= today)) && (!year || e.date.startsWith(year)) && (!type || e.type === type)).toSorted((a, b) => period === 'past' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  return <section className={'campus-event-archive ' + (embedded ? 'embedded' : '')}>{!embedded && <PageHead eyebrow="FOUR YEARS OF SHOWING UP" title="Make something. Meet someone." description="Upcoming experiences and a searchable archive of campus learning, hackathons, and workshops." />}<div className="campus-event-toolbar"><div>{[['upcoming', 'Upcoming'], ['past', 'Past events'], ['all', 'All events']].map(([id, label]) => <button key={id} className={period === id ? 'active' : ''} onClick={() => {
          setPeriod(id);
          setCount(12);
        }}>{label}</button>)}</div><select aria-label="Event archive year" value={year} onChange={e => setYear(e.target.value)}><option value="">Every year</option>{[...new Set(state.collegeEvents.map(e => e.date.slice(0, 4)))].sort().reverse().map(y => <option key={y}>{y}</option>)}</select><select aria-label="Campus event type" value={type} onChange={e => setType(e.target.value)}><option value="">Every type</option>{['Hackathon', 'Workshop', 'Meetup', 'Challenge'].map(t => <option key={t}>{t}</option>)}</select></div><div className="campus-event-count">{events.length} events · {state.collegeEvents.length} in the archive {state.profile.sampleData && <Badge color="peach">Sample college events</Badge>}</div><div className="campus-event-grid">{events.slice(0, count).map((e, i) => <article className="card" key={e.id}><div className={'campus-event-art tone-' + ['purple', 'mint', 'peach', 'blue'][i % 4]}><Badge color="glass">{e.type}</Badge><span>{['✳', '✧', '✺', '↗'][i % 4]}</span><strong>{new Date(e.date + 'T12:00:00Z').toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short'
            })}</strong></div><section><small>{dateLabel(e.date)} · {e.date < today ? 'Ended' : e.time}</small><h3>{e.name}</h3><p>{e.description}</p><small><Icon name="MapPin" size={12} />{e.location}</small><div className="campus-event-outcome">{e.date < today ? e.sample ? e.attendees.length + ' sample participants · archive notes retained' : e.outcome : `${e.attendees.length} registered · ${e.host}`}</div>{e.date >= today && <Button variant="secondary" disabled={e.cancelled || e.attendees.includes(state.profile.id)} onClick={() => act('community.event.register', {
            id: e.id
          }, 'Added to your college calendar.').catch(() => {})}>{e.attendees.includes(state.profile.id) ? 'On my calendar' : 'Join this event'}</Button>}<EventTools event={e} /></section></article>)}</div>{events.length > count && <Button variant="ghost" onClick={() => setCount(n => n + 12)}>Load more events</Button>}{!events.length && <Empty icon="CalendarDays" title="No events in this view." description="Try another year or type." />}</section>;
}
export function CampusChat({
  initialThread = 'global'
}) {
  const {
      state,
      act
    } = useStore(),
    me = state.profile.id,
    people = state.communityPeople,
    byId = new Map(people.map(p => [p.id, p]));
  const [to, setTo] = useState(initialThread === 'staff' ? 'global' : initialThread),
    [query, setQuery] = useState(''),
    [draft, setDraft] = useState(''),
    [messageQuery, setMessageQuery] = useState('');
  const bottom = useRef(null);
  useEffect(() => setTo(initialThread === 'staff' ? 'global' : initialThread), [initialThread]);
  const messages = state.communityMessages.filter(m => to === 'global' ? m.to === 'global' : m.author === me && m.to === to || m.author === to && m.to === me);
  useEffect(() => bottom.current?.scrollIntoView({
    block: 'nearest'
  }), [messages.length, to]);
  useEffect(() => {
    act('community.read', {
      thread: to
    }).catch(() => {});
  }, [to, messages.length]);
  async function send(e) {
    e.preventDefault();
    try {
      await act('community.message', {
        to,
        text: draft
      });
      setDraft('');
    } catch {}
  }
  const others = people.filter(p => p.id !== me && (!query || [p.name, p.handle, p.designation].join(' ').toLowerCase().includes(query.toLowerCase()))).toSorted((a, b) => Number(state.communityMessages.some(m => m.author === b.id || m.to === b.id)) - Number(state.communityMessages.some(m => m.author === a.id || m.to === a.id)));
  return <><PageHead eyebrow="A SHARED CAMPUS, A REAL CONVERSATION" title="Your college. In conversation." description="A common campus lounge and private conversations between college members." /><div className="campus-chat card"><aside><label><Icon name="Search" size={15} /><input aria-label="Find college conversation" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a student or staff member…" /></label><button className={to === 'global' ? 'active' : ''} onClick={() => setTo('global')}><span className="campus-member-avatar tone-mint"><Icon name="Users" /></span><span><strong>Campus lounge</strong><small>Students + college staff · {state.communityUnread?.global || 0} unread</small></span></button>{others.slice(0, query ? 35 : 16).map(p => <button key={p.id} className={to === p.id ? 'active' : ''} onClick={() => setTo(p.id)}><span className={'campus-member-avatar tone-' + p.color}>{p.initials}</span><span><strong>{p.name}</strong><small>{p.role === 'student' ? yearLabel(p.year) : p.designation} · {state.communityUnread?.[p.id] || 0} unread</small></span></button>)}</aside><section><header><strong>{to === 'global' ? 'Campus lounge' : byId.get(to)?.name || 'Select a conversation'}</strong><small>{to === 'global' ? 'Shared with all college members' : 'Private conversation · only visible to its participants'}</small></header><input aria-label="Search this conversation" placeholder="Search this conversation…" value={messageQuery} onChange={e => setMessageQuery(e.target.value)} /><div className="campus-chat-body">{messages.filter(m => m.text.toLowerCase().includes(messageQuery.toLowerCase())).map(m => <article className={m.author === me ? 'mine' : ''} key={m.id}><strong>{byId.get(m.author)?.name}</strong><p>{m.text}</p><small>{dateLabel(m.time)}{m.sample ? ' · sample history' : ''}</small></article>)}{!messages.length && <Empty icon="MessageCircle" title="Start with a hello." description="Ask a question, share a useful idea, or plan a study session." />}<div ref={bottom} /></div><form onSubmit={send}><textarea aria-label="College message" rows={2} value={draft} onChange={e => setDraft(e.target.value)} maxLength={2000} placeholder="Write a message…" /><Button type="submit" icon="Send" disabled={!draft.trim()}>Send</Button></form></section></div></>;
}
