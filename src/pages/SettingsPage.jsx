import AccountSessions from '../components/AccountSessions.jsx';
import React, { useState } from 'react';
import { useStore, yearLabel } from '../lib/store.jsx';
import { PageHead, Button, Icon, Avatar, Badge } from '../components/ui.jsx';
export default function SettingsPage() {
  const {
    state,
    act,
    setModal,
    endSession
  } = useStore();
  const [name, setName] = useState(state.profile.name),
    [bio, setBio] = useState(state.profile.bio);
  return <><PageHead eyebrow="A WORKSPACE THAT FEELS LIKE YOU." title="Your rhythm. Your preferences." description="A few small choices to make StudentOS fit a little better." /><div className="settings-layout"><section className="card settings-profile"><div className="section-head"><h2>The person behind the progress.</h2><Avatar person="me" /></div><form className="form-stack" onSubmit={async e => {
          e.preventDefault();
          await act('profile.update', {
            name,
            bio
          }, 'A little more you. Your profile is saved.');
        }}><label>Your name<input required value={name} onChange={e => setName(e.target.value)} maxLength={80} /></label><label>A little about you<textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={300} /></label><label>Student ID<input readOnly value={state.profile.studentId} /></label><div className="profile-meta"><Badge>{yearLabel(state.profile.year)}</Badge><span>{state.profile.college}</span></div><Button type="submit" icon="Check">Save my details</Button></form></section><div className="settings-right"><AccountSessions />{state.profile.sampleData && <section className="card settings-section"><Badge color="blue">Presentation workspace</Badge><h2>A connected campus to explore.</h2><p>This workspace contains fictional people, academic history and college activity for presentations. Company resources link to their original sources. StudentOS completion records are separate from external provider credentials.</p></section>}<section className="card settings-section"><span className="stat-icon tone-purple"><Icon name="Route" size={21} /></span><h2>A plan that fits your life.</h2><p>{state.profile.track} · {state.profile.dailyMinutes} minutes per day · {state.journey.totalDays} days</p><Button variant="secondary" icon="SlidersHorizontal" onClick={() => setModal({
            type: 'plan-setup'
          })}>Set preparation deadline</Button><Button variant="ghost" icon="Coffee" onClick={() => setModal({
            type: 'rest'
          })}>Plan a rest day</Button></section><section className="card settings-section"><h2>The little preferences.</h2>{[{
            key: 'notifications',
            title: 'Helpful reminders',
            description: 'Keep the next useful step within reach.'
          }, {
            key: 'autoResume',
            title: 'Let my resume grow with me',
            description: 'Include projects when all their milestones are complete.'
          }].map(x => <label className="toggle-row" key={x.key}><span><strong>{x.title}</strong><small>{x.description}</small></span><input type="checkbox" checked={state.profile[x.key]} onChange={e => act('profile.update', {
              [x.key]: e.target.checked
            }, 'Your preference is saved.').catch(() => {})} /></label>)}</section><section className="card settings-section"><div className="section-head"><h2>Quid & connected services</h2><Badge color={state.aiConfigured ? 'mint' : 'gray'}>{state.aiConfigured ? 'AI connected' : 'Records & app guide ready'}</Badge></div><p>Quid reads your saved academic progress and helps you navigate. Connect a server-side Gemini or compatible provider for open-ended coaching, explanations and resume rewriting.</p><Button variant="secondary" icon="Info" onClick={() => setModal({
            type: 'info',
            title: 'Connections for the next phase',
            text: 'The local prototype keeps your activity in a SQLite workspace. AI credentials will be stored only on the server when you provide a service. Live jobs, college identity, notifications, GitHub, and LeetCode will need their own authorized integrations.'
          })}>See connection details</Button><Button variant="ghost" icon="Users" onClick={endSession}>Switch workspace / create a new user</Button></section></div></div></>;
}
