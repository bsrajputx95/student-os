import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Button, Badge } from './ui.jsx';
export default function AccountSessions() {
  const {
    request,
    endSession
  } = useStore();
  const [sessions, setSessions] = useState([]),
    [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/account/sessions').then(r => r.json()).then(data => setSessions(data.sessions || [])).catch(e => setError(e.message));
  }, []);
  return <section className="card settings-section"><div className="section-head"><h2>Account security</h2><Badge>{sessions.length} active sessions</Badge></div><p><a href="/api/account/export" download>Download my StudentOS records</a></p><p>Sessions expire after inactivity or their maximum lifetime. Logging out everywhere revokes all saved sessions for this account.</p>{sessions.slice(0, 5).map((s, i) => <p className="small-text" key={i}>Signed in {new Date(s.created_at).toLocaleDateString('en-IN')} · last active {new Date(s.last_seen).toLocaleString('en-IN')}</p>)}{error && <p className="error-text">{error}</p>}<Button variant="secondary" icon="LogOut" onClick={async () => {
      try {
        await request('/api/account/logout-all', {});
        await endSession();
      } catch (e) {
        setError(e.message);
      }
    }}>Log out everywhere</Button></section>;
}
