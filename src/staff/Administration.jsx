import AcademicRecordEditor from './AcademicRecordEditor.jsx';
import InstitutionTools from './InstitutionTools.jsx';
import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Button, Badge, Icon, Empty } from '../components/ui.jsx';
import { roleLabels, can } from '../../shared/permissions.js';
export default function Administration() {
  const {
    state,
    request
  } = useStore();
  const [academic, setAcademic] = useState(null);
  const [data, setData] = useState(null),
    [operations, setOperations] = useState(null),
    [query, setQuery] = useState(''),
    [page, setPage] = useState(1),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [invite, setInvite] = useState({
      email: '',
      role: 'teacher',
      department: 'Computer Science'
    }),
    [link, setLink] = useState('');
  async function load() {
    try {
      const [members, ops] = await Promise.all([fetch(`/api/admin/members?query=${encodeURIComponent(query)}&page=${page}`).then(r => r.json()), fetch('/api/admin/operations').then(r => r.json())]);
      if (members.error) throw new Error(members.error);
      setData(members);
      setOperations(ops);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [query, page]);
  async function manage(person, operation, extra = {}) {
    setBusy(true);
    try {
      await request('/api/admin/account', {
        id: person.id,
        operation,
        ...extra
      });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function sendInvite(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await request('/api/admin/invite', invite);
      setLink(result.url);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!can(state.profile, 'institution.manage')) return <Empty title="College administrator access required." description="Ask your institution administrator to manage accounts and services." />;
  return <><div className="staff-page-head"><div><span className="staff-eyebrow">COLLEGE ADMINISTRATION</span><h1>People, access, and reliable operations.</h1><p>Approve enrollments, invite staff, and inspect delivery and service status.</p></div></div>{error && <p className="error-text" role="alert">{error}</p>}
    <div className="admin-top-grid"><section className="card admin-panel"><h2>Invite a college member</h2><form className="form-stack" onSubmit={sendInvite}><label>College email<input type="email" required value={invite.email} onChange={e => setInvite({
              ...invite,
              email: e.target.value
            })} /></label><div className="staff-form-two"><label>Role<select value={invite.role} onChange={e => setInvite({
                ...invite,
                role: e.target.value
              })}>{Object.entries(roleLabels).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select></label><label>Department<input value={invite.department} onChange={e => setInvite({
                ...invite,
                department: e.target.value
              })} /></label></div><Button disabled={busy} type="submit" icon="Mail">Create one-time invitation</Button></form>{link && <div className="admin-invite-link"><strong>Invitation ready · expires in seven days</strong><p>Share this private invitation with its intended recipient. Email is queued when delivery is configured.</p><input aria-label="Private invitation link" readOnly value={link} /></div>}</section><section className="card admin-panel"><h2>Connected services</h2>{operations && <><p><Badge color={operations.services.ai ? 'mint' : 'gray'}>{operations.services.ai ? 'AI configured' : 'AI connection needed'}</Badge></p><p><Badge color={operations.services.mail ? 'mint' : 'gray'}>{operations.services.mail ? 'Email configured' : 'Email delivery connection needed'}</Badge></p><p>{operations.migrations.length} database migrations applied.</p><p>Passwords and API credentials stay on the server. View delivery failures below before retrying a service.</p></>}<Button variant="secondary" onClick={load} icon="RefreshCw">Refresh operations</Button></section></div>
    <InstitutionTools /><section className="card admin-panel"><div className="section-head"><h2>College accounts {data && <Badge>{data.total}</Badge>}</h2><label className="search-field"><Icon name="Search" size={16} /><input aria-label="Find college account" value={query} onChange={e => {
            setQuery(e.target.value);
            setPage(1);
          }} placeholder="Name, username, or student ID" /></label></div><div className="staff-table-scroll"><table className="admin-table"><thead><tr><th>Member</th><th>Role</th><th>Enrollment</th><th>Access</th><th>Actions</th></tr></thead><tbody>{data?.members.map(person => <tr key={person.id}><td><strong>{person.name}</strong><small>@{person.handle} · {person.department}</small></td><td><select aria-label={'Role for ' + person.name} value={person.role} disabled={busy || person.id === state.profile.id} onChange={e => manage(person, 'role', {
                  role: e.target.value
                })}>{Object.entries(roleLabels).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select></td><td>{person.enrollmentStatus === 'pending' ? <Button variant="secondary" disabled={busy} onClick={() => manage(person, 'approve', {
                  studentId: person.studentId === 'Not linked yet' ? 'PENDING-' + person.handle : person.studentId
                })}>Approve enrollment</Button> : <Badge color="mint">Approved</Badge>}</td><td><Badge color={person.suspended ? 'peach' : 'mint'}>{person.suspended ? 'Suspended' : 'Active'}</Badge></td><td>{person.role === 'student' && <Button variant="ghost" onClick={() => setAcademic(person)}>Academic record</Button>}<Button variant="ghost" disabled={busy || person.id === state.profile.id} onClick={() => manage(person, person.suspended ? 'restore' : 'suspend')}>{person.suspended ? 'Restore access' : 'Suspend access'}</Button></td></tr>)}</tbody></table></div><div className="section-head"><Button variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button><span>Page {page}</span><Button variant="ghost" disabled={!data || page * 25 >= data.total} onClick={() => setPage(p => p + 1)}>Next</Button></div></section>
    <section className="card admin-panel"><h2>Delivery queue</h2><div className="staff-table-scroll"><table className="admin-table"><thead><tr><th>Type</th><th>Status</th><th>Attempts</th><th>Scheduled</th><th>Last issue</th></tr></thead><tbody>{operations?.jobs.map(job => <tr key={job.id}><td>{job.kind}</td><td><Badge color={job.status === 'done' ? 'mint' : job.status === 'failed' ? 'peach' : 'gray'}>{job.status}</Badge></td><td>{job.attempts}</td><td>{new Date(job.due_at).toLocaleString('en-IN')}</td><td>{job.last_error || '—'}</td></tr>)}</tbody></table>{!operations?.jobs.length && <p>No deliveries scheduled yet.</p>}</div></section><section className="card admin-panel"><h2>Durable account audit</h2>{operations?.audit.map(event => <div className="admin-audit-row" key={event.id}><strong>{event.action}</strong><span>{event.target_id || 'College operation'}</span><small>{new Date(event.created_at).toLocaleString('en-IN')}</small></div>)}</section>
  {academic && <AcademicRecordEditor person={academic} close={() => setAcademic(null)} onSaved={load} />}</>;
}
