import CampusCommunity from '../components/CampusCommunity.jsx';
import React, { useState, useRef, useEffect } from 'react';
import { useStore, navigate } from '../lib/store.jsx';
import { PageHead, Button, Icon, Avatar, PersonName, Badge, Tabs, Empty } from '../components/ui.jsx';
import { CollegeUpdates } from '../components/CollegeConnected.jsx';
export default function Community() {
  const {
    state
  } = useStore();
  return state.communityEnabled ? <CampusCommunity initialTab={new URLSearchParams(location.search).get('tab') === 'college' ? 'announcements' : 'feed'} /> : <LegacyCommunity />;
}
function LegacyCommunity() {
  const {
    state,
    act,
    setModal
  } = useStore();
  const [tab, setTab] = useState(new URLSearchParams(window.location.search).get('tab') || 'feed'),
    [draft, setDraft] = useState(''),
    [busy, setBusy] = useState(false);
  const bottom = useRef(null);
  const posts = state.posts.filter(p => tab !== 'following' || p.author === 'me' || state.following.includes(p.author)).toSorted((a, b) => new Date(a.time) - new Date(b.time));
  useEffect(() => {
    bottom.current?.scrollIntoView({
      block: 'nearest',
      behavior: 'instant'
    });
  }, [tab, state.posts.length]);
  async function post(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await act('social.post', {
        text: draft
      }, 'Posted to your workspace feed.');
      setDraft('');
    } finally {
      setBusy(false);
    }
  }
  return <><PageHead eyebrow="COLLEGE COMMUNITY" title="Community" description="Share project updates, ask questions and follow college announcements."><Button variant="secondary" icon="MessageCircle" onClick={() => navigate('/messages')}>Messages & global chat</Button></PageHead><div className="social-layout"><aside className="social-sidebar"><section className="card community-profile"><div className="profile-cover"><span>✧</span><span>✺</span></div><Avatar person="me" size="lg" /><PersonName person="me" /><p>{state.profile.bio || 'Learning, building, and finding my direction.'}</p>{state.profile.isDemo && <Badge color="peach">Demo profile & social activity</Badge>}<div className="social-counts"><button onClick={() => setModal({
              type: 'connections',
              mode: 'followers'
            })}><strong>{state.profile.followers || 0}</strong><span>followers</span></button><button onClick={() => setModal({
              type: 'connections',
              mode: 'following'
            })}><strong>{state.profile.followingCount || state.following.length}</strong><span>following</span></button></div><button className="text-link" onClick={() => setModal({
            type: 'profile',
            id: 'me'
          })}>View my profile<Icon name="ArrowUpRight" size={14} /></button></section><section className="card social-campus"><Icon name="GraduationCap" size={23} /><h3>{state.profile.college}</h3><p>College announcements and teacher updates live in the College tab.</p><button className="text-link" onClick={() => setTab('college')}>Open college updates<Icon name="ArrowUpRight" size={14} /></button></section><section className="social-next-event"><Badge color="mint">HAPPENING THIS MONTH</Badge><h3>Build with open source.</h3><p>Hacktoberfest 2026 · Online & worldwide</p><button className="text-link" onClick={() => setTab('events')}>Explore event updates<Icon name="ArrowUpRight" size={14} /></button></section></aside><section className="card social-stream"><div className="social-stream-head"><Tabs items={[{
            id: 'feed',
            label: 'Feed'
          }, {
            id: 'following',
            label: 'Following'
          }, {
            id: 'college',
            label: 'College'
          }, {
            id: 'events',
            label: 'Event updates'
          }]} value={tab} onChange={setTab} /><span><Icon name="ArrowUp" size={12} />Oldest to newest</span></div><div className="social-posts" tabIndex={0} aria-label="Community feed">{tab === 'college' ? <CollegeUpdates kind="Announcement" /> : tab === 'events' ? <><CollegeUpdates kind="Event" />{state.catalog.events.map(e => <article className="social-event-post" key={e.id}><div><Badge color={e.color}>{e.type}</Badge><small>{e.dateLabel || 'October 2026'} · {e.host}</small></div><h2>{e.name}</h2><p>{e.description}</p><a href={e.sourceUrl} target="_blank" rel="noreferrer">View official update<Icon name="ArrowUpRight" size={14} /></a></article>)}</> : posts.length ? posts.map(p => <Post key={p.id} post={p} />) : <Empty icon="MessageSquarePlus" title="Be the first to share something." description="Post a project update, a question, or what you learned today. Your newest post appears just above the composer." />}<div ref={bottom} /></div>{['feed', 'following'].includes(tab) && <form className="social-bottom-composer" onSubmit={post}><div><Avatar person="me" size="sm" /><textarea aria-label="Write a community post" value={draft} maxLength={2000} onChange={e => setDraft(e.target.value)} placeholder="Share what you’re building, learning, or thinking…" rows={2} /></div><footer><small>{state.profile.isDemo ? 'Demo workspace · posts stay on this device' : 'Local workspace · community sync is not connected'} · {draft.length}/2000</small><Button type="submit" icon="ArrowUpRight" disabled={!draft.trim() || busy}>{busy ? 'Posting…' : 'Post update'}</Button></footer></form>}</section></div></>;
}
function Post({
  post
}) {
  const {
    state,
    act,
    setModal
  } = useStore();
  const [comments, setComments] = useState(false),
    [text, setText] = useState('');
  const liked = state.likes.includes(post.id);
  async function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    await act('social.comment', {
      id: post.id,
      text
    });
    setText('');
  }
  return <article className="social-post"><div className="post-author"><Avatar person={post.author} onClick={() => setModal({
        type: 'profile',
        id: post.author
      })} /><div><PersonName person={post.author} /><small>{new Date(post.time).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: '2-digit'
          })} · {post.tag}</small></div></div><p className="post-text">{post.text}</p>{post.project && <div className={`shared-project tone-${post.color}`}><div><span>PROJECT UPDATE</span><h3>{post.project}</h3><p>{post.projectDetail}</p></div><Icon name="PanelsTopLeft" size={40} /></div>}<div className="post-actions"><button className={liked ? 'liked' : ''} aria-label={`${liked ? 'Unlike' : 'Like'} post`} onClick={() => act('social.like', {
        id: post.id
      }).catch(() => {})}><Icon name="Heart" size={17} fill={liked ? 'currentColor' : 'none'} />{post.likes + (liked ? 1 : 0)}</button><button onClick={() => setComments(!comments)}><Icon name="MessageCircle" size={17} />{(state.comments[post.id] || []).length || ''} Reply</button><button onClick={() => navigate(`/messages?tab=${post.author === 'me' ? 'global' : post.author}`)}><Icon name="Send" size={16} />Message</button></div>{comments && <div className="post-comments">{(state.comments[post.id] || []).map(c => <div className="post-comment" key={c.id}><Avatar person="me" size="xs" /><p><strong>{state.profile.name}</strong>{c.text}</p></div>)}<form onSubmit={submit}><Avatar person="me" size="xs" /><input aria-label="Write a reply" placeholder="Write a reply…" value={text} onChange={e => setText(e.target.value)} maxLength={600} /><button className="icon-btn" aria-label="Send reply" type="submit" disabled={!text.trim()}><Icon name="Send" size={16} /></button></form></div>}</article>;
}
