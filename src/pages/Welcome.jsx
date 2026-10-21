import { OrbitScene } from '../components/DesignEffects.jsx';
import React, { useState, useEffect } from 'react';
import { useStore, navigate } from '../lib/store.jsx';
import { Button, Icon, Badge } from '../components/ui.jsx';
export default function Welcome() {
  const {
    startSession
  } = useStore();
  const [campus, setCampus] = useState({
    name: 'StudentOS',
    enabled: false
  });
  useEffect(() => {
    fetch('/api/campus-summary').then(r => r.json()).then(setCampus).catch(() => {});
  }, []);
  const initial = new URLSearchParams(location.search).get('role');
  const [mode, setMode] = useState(location.pathname === '/register' ? 'register' : 'login'),
    [form, setForm] = useState({
      handle: initial === 'teacher' ? 'neha.faculty' : initial === 'placement' ? 'arjun.placements' : '',
      password: '',
      name: '',
      year: '1',
      department: 'Computer Science'
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const field = (key, value) => setForm(f => ({
    ...f,
    [key]: value
  }));
  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await startSession({
        mode,
        ...form
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function sample(handle) {
    setMode('login');
    setForm(f => ({
      ...f,
      handle,
      password: '12345678'
    }));
    setError('');
  }
  return <main className="hkbk-auth"><section className="auth-story"><button className="auth-brand" onClick={() => navigate('/login')}><span className="brand-mark">s<sup>✦</sup></span>studentos<span>.</span></button><Badge color="mint">{campus.name}</Badge><h1>One campus.<br />A thousand<br /><em>possibilities.</em></h1><p>A place to learn, build, find your people, and get ready for what comes next.</p><div className="auth-campus-art" aria-hidden="true"><OrbitScene variant="welcome" /></div>{campus.enabled && <><div className="auth-campus-counts"><span><strong>{campus.students}</strong>student profiles</span><span><strong>{campus.staff}</strong>college staff</span><span><strong>4 years</strong>of learning history</span></div><small className="auth-sample-note">Illustrative campus dataset. Generated people, scores, posts, and college events are sample records, not official college records.</small></>}</section><section className="auth-panel"><div className="auth-panel-inner"><div className="auth-mode"><button className={mode === 'login' ? 'active' : ''} onClick={() => {
            setMode('login');
            setError('');
          }}>Log in</button><button className={mode === 'register' ? 'active' : ''} onClick={() => {
            setMode('register');
            setError('');
          }}>Create account</button></div><span className="eyebrow">YOUR CONNECTED CAMPUS</span><h2>{mode === 'login' ? 'Good to have you back.' : 'Your next chapter starts here.'}</h2><p>{mode === 'login' ? 'Pick up where you left off. Your progress and your people are waiting.' : 'Create a student account. We’ll personalise your journey around your year, interests, and pace.'}</p><form className="form-stack" onSubmit={submit}>{mode === 'register' && <label>Full name<input required minLength={2} maxLength={80} autoComplete="name" value={form.name} onChange={e => field('name', e.target.value)} placeholder="Your full name" /></label>}<label>Username<input required autoComplete="username" minLength={3} maxLength={30} pattern="[a-z0-9][a-z0-9._-]{2,29}" value={form.handle} onChange={e => field('handle', e.target.value.toLowerCase().replace(/\s/g, ''))} placeholder="e.g. bhavanisingh" /></label><label>Password<input required type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={8} maxLength={128} value={form.password} onChange={e => field('password', e.target.value)} placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'} /></label>{mode === 'register' && <><label>College email<input type="email" required value={form.email || ''} onChange={e => field('email', e.target.value)} autoComplete="email" /></label><div className="auth-form-two"><label>College year<select value={form.year} onChange={e => field('year', e.target.value)}>{[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}</select></label><label>Department<select value={form.department} onChange={e => field('department', e.target.value)}>{['Computer Science', 'Information Technology', 'Electronics', 'Mechanical Engineering', 'Artificial Intelligence'].map(d => <option key={d}>{d}</option>)}</select></label></div><small>College: {campus.name} · Student registration. Staff accounts are provisioned by the college. {campus.hosted && 'Use fictional details when exploring.'}</small></>}{error && <p className="error-text" role="alert">{error}</p>}<Button type="submit" disabled={busy} icon="ArrowRight">{busy ? 'Opening your workspace…' : mode === 'login' ? 'Log in to StudentOS' : 'Create student account'}</Button></form><button className="text-link" onClick={() => navigate('/forgot-password')}>Forgot your password?</button>{campus.enabled && <div className="auth-explore"><div><strong>Choose a workspace</strong><Badge color="peach">QUICK ACCESS</Badge></div><button onClick={() => sample('bhavanisingh')}><span className="auth-demo-initials">BS</span><span><strong>Bhavani Singh</strong><small>Year 4 · Day 1,438 / 1,460 · top candidate</small></span><Icon name="ArrowUpRight" size={17} /></button><div className="auth-staff-demos"><button onClick={() => sample('neha.faculty')}><Icon name="GraduationCap" size={18} /><span>Teacher<small>neha.faculty</small></span></button><button onClick={() => sample('arjun.placements')}><Icon name="Briefcase" size={18} /><span>Placement<small>arjun.placements</small></span></button><button onClick={() => sample('hkbk.staff.091')}><Icon name="ShieldCheck" size={18} /><span>Administrator<small>hkbk.staff.091</small></span></button></div><p>Workspace password: <code>12345678</code>. Choose an account above, then log in.</p></div>}<small className="auth-local"><Icon name="Database" size={13} />{campus.hosted ? 'Connected campus · progress saved securely' : campus.enabled ? 'Local preview · accounts and activity saved on this device' : 'Institution workspace · secure sign-in'}</small></div></section></main>;
}
