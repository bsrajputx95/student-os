import { CampusChat } from '../components/CampusCommunity.jsx';
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../lib/store.jsx';
import { PageHead, Icon, IconButton, Button, Avatar, PersonName, Badge } from '../components/ui.jsx';
import { StaffGuidance } from '../components/CollegeConnected.jsx';
export default function Messages({
  initialThread
}) {
  const {
    state
  } = useStore();
  return state.communityEnabled && initialThread !== 'staff' ? <CampusChat initialThread={initialThread || 'global'} /> : <LegacyMessages initialThread={initialThread} />;
}
function LegacyMessages({
  initialThread
}) {
  const {
    state,
    act,
    setModal
  } = useStore();
  const [thread, setThread] = useState(initialThread || 'global'),
    [draft, setDraft] = useState(''),
    [query, setQuery] = useState('');
  const bottom = useRef(null);
  useEffect(() => setThread(initialThread || 'global'), [initialThread]);
  const messages = state.messages.filter(m => m.thread === thread);
  useEffect(() => {
    bottom.current?.scrollIntoView({
      block: 'nearest'
    });
  }, [messages.length, thread]);
  const person = state.catalog.people.find(p => p.id === thread);
  async function send(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    await act('message.send', {
      thread,
      text: draft
    });
    setDraft('');
  }
  if (thread === 'staff') return <StaffGuidance />;
  return <><PageHead eyebrow="A GOOD CONVERSATION CAN CHANGE A DAY." title="A little hello goes a long way." description="Global chat and direct conversations. Messages are stored locally in this preview." /><div className="messages-workspace card"><aside className="conversation-list"><div className="section-head"><h2>Messages</h2><Icon name="MessageSquarePlus" size={20} /></div><label className="search-field"><Icon name="Search" size={15} /><input placeholder="Find a conversation…" aria-label="Find a conversation" value={query} onChange={e => setQuery(e.target.value)} /></label><button className={`conversation-row ${thread === 'global' ? 'active' : ''}`} onClick={() => setThread('global')}><span className="lounge-avatar"><Icon name="Users" size={21} /></span><span><strong>Campus lounge<Badge color="mint">Global</Badge></strong><small>A space for everyone on campus.</small></span></button><button className="conversation-row" onClick={() => setThread('staff')}><span className="lounge-avatar"><Icon name="GraduationCap" size={21} /></span><span><strong>Staff guidance<Badge color="purple">{state.staffMessages?.filter(m => !m.read).length || 0}</Badge></strong><small>Your teachers & placement team</small></span></button><span className="nav-label">YOUR CONVERSATIONS</span>{state.catalog.people.filter(p => state.profile.isDemo && p.id !== 'me' && p.name.toLowerCase().includes(query.toLowerCase())).map(p => <button className={`conversation-row ${thread === p.id ? 'active' : ''}`} onClick={() => setThread(p.id)} key={p.id}><Avatar person={p} size="md" /><span><strong>{p.name}<span className={`year-tag year-${p.year}`}>{p.year}{['', 'st', 'nd', 'rd', 'th'][p.year]} year</span></strong><small>{state.messages.filter(m => m.thread === p.id).at(-1)?.text || 'Start with a little hello.'}</small></span></button>)}</aside><section className="conversation-main"><header><div>{thread === 'global' ? <span className="lounge-avatar"><Icon name="Users" size={21} /></span> : <Avatar person={person} onClick={() => setModal({
              type: 'profile',
              id: thread
            })} />}<div>{thread === 'global' ? <h3>Campus lounge</h3> : <PersonName person={person} compact />}<p><i className="green-dot" />{thread === 'global' ? state.profile.college + ' · Local workspace' : 'Your direct conversation'}</p></div></div><IconButton name="Info" label="Conversation details" onClick={() => setModal(thread === 'global' ? {
            type: 'info',
            title: 'Your campus lounge',
            text: 'A shared space for questions, ideas, team matching, and a little encouragement. Messages in this local preview are saved to this workspace.'
          } : {
            type: 'profile',
            id: thread
          })} /></header><div className="conversation-body"><div className="conversation-start"><span>✧</span><strong>{thread === 'global' ? 'Good things start with a conversation.' : `Say a little hello to ${person?.name.split(' ')[0]}.`}</strong><p>{thread === 'global' ? 'A question, a project idea, a teammate. You are in good company.' : 'Ask a question, share an idea, or just make a new connection.'}</p></div><div className="message-date">TODAY</div>{messages.map(m => <div key={m.id} className={`message-row ${m.author === 'me' ? 'my-message' : ''}`}>{m.author !== 'me' && <Avatar person={m.author} size="sm" onClick={() => setModal({
              type: 'profile',
              id: m.author
            })} />}<div>{m.author !== 'me' && <PersonName person={m.author} compact />}<div className="message-bubble">{m.text}</div><small>{new Date(m.time).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}{m.author === 'me' && <Icon name="CheckCheck" size={12} />}</small></div></div>)}<div ref={bottom} /></div><form className="message-composer" onSubmit={send}><label className="sr-only" htmlFor="message-draft">Your message</label><textarea id="message-draft" placeholder={thread === 'global' ? 'A question? A little hello?' : 'Write a little hello…'} value={draft} onChange={e => setDraft(e.target.value)} maxLength={2000} rows={1} onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(e);
            }
          }} /><span>Shift + Enter for a new line</span><Button type="submit" disabled={!draft.trim()} aria-label="Send message"><Icon name="Send" size={18} /></Button></form></section></div></>;
}
