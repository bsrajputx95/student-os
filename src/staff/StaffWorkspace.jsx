import { PageMotion } from '../components/DesignEffects.jsx';
import ProfileImage from '../components/ProfileImage.jsx';
import Help from '../pages/Help.jsx';
import Administration from './Administration.jsx';
import { roleLabels, can } from '../../shared/permissions.js';
import React, { useEffect, useState } from 'react';
import { useStore, useRoute, navigate } from '../lib/store.jsx';
import { Icon, Button, Badge } from '../components/ui.jsx';
import Quid from '../components/Quid.jsx';
import { CampusProvider, useCampus } from './context.jsx';
import Overview from './Overview.jsx';
import CampusCommunity, { CampusChat } from '../components/CampusCommunity.jsx';
import Students from './Students.jsx';
import Assignments from './Assignments.jsx';
import Placements from './Placements.jsx';
import Outreach from './Outreach.jsx';
import Reports from './Reports.jsx';
import { StaffDialogs } from './dialogs.jsx';
const nav = [['administration', 'Administration', 'ShieldCheck'], ['overview', 'Overview', 'LayoutDashboard'], ['students', 'Students', 'Users'], ['assignments', 'Assign & review', 'NotebookPen'], ['placements', 'Placements', 'Briefcase'], ['outreach', 'Outreach', 'Megaphone'], ['reports', 'Reports', 'ChartNoAxesCombined'], ['community', 'Community', 'Users'], ['messages', 'Messages', 'MessageCircle'], ['help', 'Help & support', 'CircleHelp']];
export function StaffEntry() {
  const {
    startSession,
    state
  } = useStore();
  const [busy, setBusy] = useState(''),
    [error, setError] = useState('');
  async function enter(role) {
    if (state.accountProtected) {
      navigate('/login?role=' + role);
      return;
    }
    setBusy(role);
    try {
      await startSession({
        mode: 'staff',
        role
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }
  return <div className="staff-entry"><span className="brand-mark">s<sup>✦</sup></span><Badge color="mint">THE COLLEGE WORKSPACE</Badge><h1>A little guidance.<br />A world of difference.</h1><p>Teach, mentor, and help every student find their next opportunity.</p><div>{[['teacher', 'GraduationCap', 'Teacher workspace', 'Understand your students. Assign meaningful work. Give feedback that moves them forward.'], ['placement', 'Briefcase', 'Placement workspace', 'See readiness. Match opportunities. Turn preparation into a clear placement pipeline.']].map(([role, icon, title, body]) => <button className="card" key={role} disabled={!!busy} onClick={() => enter(role)}><span className={`staff-entry-icon ${role}`}><Icon name={icon} size={27} /></span><h2>{title}</h2><p>{body}</p><strong>{busy === role ? 'Opening…' : 'Explore workspace'}<Icon name="ArrowUpRight" size={16} /></strong></button>)}</div>{error && <p className="error-text" role="alert">{error}</p>}<small>Local demo campus · staff roles share the student data on this device.</small><Button variant="ghost" onClick={() => navigate('/overview')}>Back to student workspace</Button></div>;
}
export default function StaffWorkspace() {
  return <CampusProvider><StaffShell /></CampusProvider>;
}
function StaffShell() {
  const {
    state,
    endSession,
    startSession
  } = useStore();
  const {
    data,
    error,
    load,
    setDialog
  } = useCampus();
  const [route] = useRoute();
  const page = route.split('/')[2]?.split('?')[0] || 'overview';
  const current = nav.find(([id]) => id === page) || nav[0];
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    setMobile(false);
    document.title = `${current[1]} · StudentOS ${roleLabels[state.profile.role]}`;
  }, [page, state.profile.role]);
  const role = state.profile.role,
    firstName = state.profile.name.replace(/^Dr\. /, '').split(' ')[0];
  return <div className={`staff-app staff-role-${role}`}>{mobile && <button className="staff-scrim" aria-label="Close staff navigation" onClick={() => setMobile(false)} />}<aside className={`staff-sidebar ${mobile ? 'is-open' : ''}`}><button className="staff-brand" onClick={() => navigate('/staff/overview')}><span className="brand-mark">s<sup>✦</sup></span><strong>studentos<span>.</span></strong></button><div className="staff-campus"><span><Icon name="GraduationCap" size={21} /></span><div><strong>{state.profile.college}</strong><small>One connected college</small></div></div><span className="staff-nav-label">{{
          teacher: 'TEACHING & MENTORING',
          placement: 'TRAINING & PLACEMENT',
          admin: 'COLLEGE ADMINISTRATION',
          support: 'ACADEMIC SUPPORT'
        }[role]}</span><nav aria-label="Staff navigation">{nav.filter(([id]) => id !== 'administration' || can(state.profile, 'institution.manage')).map(([id, label, icon]) => <button key={id} className={page === id ? 'active' : ''} aria-current={page === id ? "page" : undefined} onClick={() => navigate('/staff/' + id)}><Icon name={icon} size={19} />{label}{id === 'assignments' && !!data?.summary.toReview && <b>{data.summary.toReview}</b>}</button>)}</nav><div className="staff-sidebar-bottom"><section className="staff-sidebar-note"><span>✦</span><strong>Big futures start<br />with a little support.</strong><p>Help the whole class.<br />Make room for the individual.</p><button onClick={() => can(state.profile, 'content.publish') ? setDialog({
            type: 'compose',
            kind: 'Feedback'
          }) : navigate('/staff/messages')}>Send encouragement<Icon name="ArrowUpRight" size={13} /></button></section><button className="staff-switch-role" onClick={() => state.accountProtected ? navigate('/login?role=' + (role === 'teacher' ? 'placement' : 'teacher')) : startSession({
          mode: 'staff',
          role: role === 'teacher' ? 'placement' : 'teacher'
        })}><Icon name={role === 'teacher' ? 'Briefcase' : 'GraduationCap'} size={16} />Switch to {role === 'teacher' ? 'placement' : 'teacher'}</button><button className="staff-account" onClick={endSession} title="Switch workspace"><span>{state.profile.name.replace(/^Dr\. /, '').split(' ').map(n => n[0]).slice(0, 2).join('')}<ProfileImage person={state.profile} /></span><div><strong>{state.profile.name}</strong><small>{state.profile.designation}</small></div><Icon name="ChevronsUpDown" size={14} /></button></div></aside><div className="staff-main"><header className="staff-topbar"><div><button className="icon-btn staff-menu" aria-label="Open staff navigation" onClick={() => setMobile(!mobile)}><Icon name="Menu" /></button><span>College workspace</span><Icon name="ChevronRight" size={13} /><strong>{current[1]}</strong></div><div><Badge color={role === 'teacher' ? 'purple' : 'mint'}>{roleLabels[role]}</Badge><span className="staff-date">{new Date().toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              timeZone: 'Asia/Kolkata'
            })}</span><button className="staff-header-avatar" onClick={endSession} aria-label="Switch staff workspace">{firstName[0]}<ProfileImage person={state.profile} /></button></div></header><main className="staff-content">{!data ? <div className="staff-loading"><Icon name="GraduationCap" size={35} /><h2>{error ? 'The college workspace couldn’t load.' : 'Loading college workspace…'}</h2><p>{error || 'Loading student records and coursework.'}</p>{error && <Button onClick={load}>Try again</Button>}</div> : <>{error && <div className="staff-error" role="alert">{error}<Button variant="ghost" onClick={load}>Refresh</Button></div>}{page === 'help' ? <Help /> : page === 'administration' ? <Administration /> : page === 'community' ? <CampusCommunity /> : page === 'messages' ? <CampusChat initialThread={new URLSearchParams(route.split('?')[1]).get('tab') || 'global'} /> : page === 'students' ? <Students /> : page === 'assignments' ? <Assignments /> : page === 'placements' ? <Placements /> : page === 'outreach' ? <Outreach /> : page === 'reports' ? <Reports /> : <Overview firstName={firstName} />}<footer className="staff-footer"><span>StudentOS · College workspace</span><span><i />College workspace · {data.students.length} students · {state.communityPeople?.filter(p => p.role !== 'student').length || 2} staff</span></footer></>}</main></div><PageMotion route={route} /><StaffDialogs /><Quid /></div>;
}
