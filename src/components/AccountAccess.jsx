import React, { useEffect, useState } from 'react';
import { useStore, navigate } from '../lib/store.jsx';
import { Button, Badge, Icon } from './ui.jsx';
export default function AccountAccess() {
  const {
      request,
      startSession
    } = useStore(),
    path = location.pathname,
    token = new URLSearchParams(location.search).get('token');
  const invite = path === '/invite',
    reset = path === '/reset-password';
  const [info, setInfo] = useState(null),
    [form, setForm] = useState({
      identifier: '',
      name: '',
      handle: '',
      password: ''
    }),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (invite) fetch('/api/invite?token=' + encodeURIComponent(token || '')).then(r => r.json()).then(data => {
      if (data.error) throw new Error(data.error);
      setInfo(data);
    }).catch(e => setError(e.message));
  }, [invite, token]);
  const field = (key, value) => setForm(f => ({
    ...f,
    [key]: value
  }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (invite) await startSession({
        mode: 'invite',
        token,
        ...form
      });else {
        const result = await request(reset ? '/api/account/reset' : '/api/account/recover', reset ? {
          token,
          password: form.password
        } : {
          identifier: form.identifier
        });
        setMessage(result.message);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <main className="account-access"><section className="card"><button className="brand" onClick={() => navigate('/login')}><span className="brand-mark">s<sup>✦</sup></span><strong>studentos.</strong></button><Badge color="purple">{invite ? 'YOUR COLLEGE INVITATION' : reset ? 'CHOOSE A NEW PASSWORD' : 'ACCOUNT RECOVERY'}</Badge><h1>{invite ? 'Join your connected campus.' : reset ? 'Get back to your learning.' : 'Recover your StudentOS account.'}</h1>{info && <p>{info.college} · {info.role} · {info.email}</p>}{error && <p className="error-text" role="alert">{error}</p>}{message ? <><p role="status">{message}</p><Button onClick={() => navigate('/login')}>Return to login</Button></> : <form className="form-stack" onSubmit={submit}>{invite && <><label>Full name<input required minLength={2} maxLength={80} value={form.name} onChange={e => field('name', e.target.value)} /></label><label>Choose a username<input required pattern="[a-z0-9][a-z0-9._-]{2,29}" autoComplete="username" value={form.handle} onChange={e => field('handle', e.target.value.toLowerCase())} /></label></>}{!invite && !reset && <label>Username or saved college email<input required autoComplete="username" value={form.identifier} onChange={e => field('identifier', e.target.value)} /></label>}{(invite || reset) && <label>New password<input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={form.password} onChange={e => field('password', e.target.value)} /></label>}<Button type="submit" disabled={busy || invite && !info} icon="ArrowRight">{busy ? 'Saving…' : invite ? 'Accept college invitation' : reset ? 'Update password' : 'Send recovery link'}</Button></form>}<Button variant="ghost" onClick={() => navigate('/login')}>Back to login</Button></section></main>;
}
export function EnrollmentPending() {
  const {
    state,
    endSession,
    refresh
  } = useStore();
  return <main className="account-access"><section className="card"><Badge color="peach">ENROLLMENT REVIEW</Badge><h1>Your college is reviewing your account.</h1><p>{state.profile.name}, your account is saved. An administrator at {state.profile.college} must approve your enrollment before campus records and learning activities become available.</p><Button onClick={refresh} icon="RefreshCw">Check approval status</Button><Button variant="ghost" onClick={endSession}>Log out</Button></section></main>;
}
