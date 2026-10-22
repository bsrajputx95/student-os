import { PageMotion } from './components/DesignEffects.jsx';
import AccountAccess, { EnrollmentPending } from './components/AccountAccess.jsx';
import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { Provider, useStore, useRoute, navigate, yearLabel } from './lib/store.jsx';
import { Icon, IconButton, Avatar, Button, Badge } from './components/ui.jsx';
import Overview from './pages/Overview.jsx';
const Help = lazy(() => import('./pages/Help.jsx'));
const Journey = lazy(() => import('./pages/Journey.jsx'));
const Practice = lazy(() => import('./pages/Practice.jsx'));
const Learn = lazy(() => import('./pages/Learn.jsx'));
const Career = lazy(() => import('./pages/Career.jsx'));
const Community = lazy(() => import('./pages/Community.jsx'));
const Events = lazy(() => import('./pages/Events.jsx'));
const ProgressPage = lazy(() => import('./pages/ProgressPage.jsx'));
const Messages = lazy(() => import('./pages/Messages.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));
import { ModalHost } from './components/overlays.jsx';
import Quid from './components/Quid.jsx';
import Welcome from './pages/Welcome.jsx';
const StaffWorkspace = lazy(() => import('./staff/StaffWorkspace.jsx'));
const StaffEntry = lazy(() => import('./staff/StaffWorkspace.jsx').then(module => ({
  default: module.StaffEntry
})));
const navigation = [{
  label: 'Overview',
  icon: 'LayoutDashboard',
  path: '/overview'
}, {
  label: 'My journey',
  icon: 'Route',
  path: '/journey'
}, {
  label: 'Practice',
  icon: 'Code2',
  path: '/practice'
}, {
  label: 'Learn',
  icon: 'BookOpen',
  path: '/learn'
}, {
  label: 'Career',
  icon: 'Briefcase',
  path: '/career'
}, {
  label: 'Community',
  icon: 'Users',
  path: '/community'
}, {
  label: 'Events & hackathons',
  icon: 'CalendarDays',
  path: '/events'
}];
function Workspace() {
  const {
    state,
    error,
    refresh,
    setModal,
    setAssistant,
    assistant,
    act,
    endSession
  } = useStore();
  const [route] = useRoute(),
    [mobile, setMobile] = useState(false),
    [notifications, setNotifications] = useState(false);
  const prompted = useRef(new Set());
  useEffect(() => {
    if (state?.profile && !['teacher', 'placement', 'support', 'admin'].includes(state.profile.role) && !state.profile.onboardingDone && !prompted.current.has(state.profile.id)) {
      prompted.current.add(state.profile.id);
      setModal({
        type: 'onboarding'
      });
    }
  }, [state?.profile?.id, state?.profile?.onboardingDone]);
  const path = route.split('?')[0],
    tab = new URLSearchParams(route.split('?')[1]).get('tab');
  useEffect(() => {
    const key = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setModal({
          type: 'search'
        });
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [setModal]);
  useEffect(() => {
    setMobile(false);
    setNotifications(false);
    document.title = `${navigation.find(x => x.path === path)?.label || 'Your workspace'} · StudentOS`;
  }, [path]);
  if (['/forgot-password', '/reset-password', '/invite'].includes(path)) return <AccountAccess />;
  if (!state) return <div className="loading-screen"><span className="brand-mark">s<sup>✦</sup></span><h2>{error ? 'A small connection hiccup.' : 'Loading your workspace…'}</h2>{error ? <><p>{error}</p><Button onClick={refresh}>Try again</Button></> : <span className="loading-dots"><i /><i /><i /></span>}</div>;
  if (state.sessionRequired || path === '/login' || path === '/register') return <Welcome />;
  if (state.profile.enrollmentStatus === 'pending') return <EnrollmentPending />;
  if (['teacher', 'placement', 'support', 'admin'].includes(state.profile.role)) return <StaffWorkspace />;
  if (path.startsWith('/staff')) return <StaffEntry />;
  const current = navigation.find(x => x.path === path)?.label || {
    '/progress': 'My progress',
    '/messages': 'Messages',
    '/settings': 'Settings'
  }[path] || 'Overview';
  let page;
  switch (path) {
    case '/help':
      page = <Help />;
      break;
    case '/journey':
      page = <Journey />;
      break;
    case '/practice':
      page = <Practice />;
      break;
    case '/learn':
      page = <Learn initialTab={tab} />;
      break;
    case '/career':
      page = <Career initialTab={tab} />;
      break;
    case '/community':
      page = <Community />;
      break;
    case '/events':
      page = <Events />;
      break;
    case '/progress':
      page = <ProgressPage />;
      break;
    case '/messages':
      page = <Messages initialThread={tab} />;
      break;
    case '/settings':
      page = <SettingsPage />;
      break;
    default:
      page = <Overview />;
  }
  return <div className="app-shell so-app"><a className="skip-link" href="#main-content">Skip to main content</a>{mobile && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobile(false)} />}
    <aside className={`sidebar ${mobile ? 'sidebar-open' : ''}`}>
      <button className="brand" onClick={() => navigate('/overview')}><span className="brand-mark">s<sup>✦</sup></span><span>student<span className="brand-os">os</span><span className="brand-period">.</span></span></button>
      <button className="campus-switch" title="Switch workspace or create a new user" onClick={endSession}><span className="campus-icon"><Icon name="GraduationCap" size={17} /></span><span><strong>{state.profile.college}</strong><small>Student workspace</small></span><Icon name="ChevronsUpDown" size={13} /></button>
      <div className="nav-label">YOUR WORKSPACE</div>
      <nav aria-label="Main navigation">{navigation.map((item, i) => <React.Fragment key={item.path}>{i === 4 && <div className="nav-divider" />}<button className={`nav-item ${path === item.path || item.path === '/overview' && path === '/' ? 'active' : ''}`} aria-current={path === item.path || item.path === "/overview" && path === "/" ? "page" : undefined} onClick={() => navigate(item.path)}><Icon name={item.icon} size={19} /><span>{item.label}</span>{item.path === '/journey' && <span className="nav-new">✦</span>}{item.path === '/community' && <span className="nav-dot" />}</button></React.Fragment>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item" onClick={() => navigate('/help')}><Icon name="CircleHelp" size={19} />Help & support</button><button className="nav-item" onClick={() => navigate('/staff')}><Icon name="GraduationCap" size={19} />Teacher & placement<Icon name="ArrowUpRight" size={14} /></button><button className={`nav-item ${path === '/progress' ? 'active' : ''}`} onClick={() => navigate('/progress')}><Icon name="ChartNoAxesCombined" size={19} />My progress<Icon name="ArrowUpRight" size={14} /></button>
        <div className="sidebar-journey"><span className="tiny-spark">✦</span><span className="eyebrow">PREPARATION PLAN</span><strong>Your preparation<br />at a glance.</strong><div><span>Day {state.journey.day}</span><span>{state.journey.totalDays} days</span></div><div className="sidebar-progress"><i style={{
              width: `${state.journey.day / state.journey.totalDays * 100}%`
            }} /></div><button onClick={() => setModal({
            type: 'onboarding'
          })}>{state.profile.onboardingDone ? 'Fine-tune your path' : 'Make this journey yours'}<Icon name="ArrowUpRight" size={14} /></button></div>
        <button className="sidebar-profile" onClick={() => setModal({
          type: 'profile',
          id: 'me'
        })}><Avatar person="me" size="sm" /><span><strong>{state.profile.name}</strong><small>{yearLabel(state.profile.year)} · {state.profile.department || "Student"}</small></span><Icon name="ChevronsUpDown" size={14} /></button>
      </div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><IconButton name="Menu" label="Open navigation" onClick={() => setMobile(!mobile)} /><span>Workspace</span><Icon name="ChevronRight" size={13} /><strong>{current}</strong></div><button className="global-search" onClick={() => setModal({
          type: 'search'
        })}><Icon name="Search" size={16} /><span>Find your next thing…</span><kbd>Ctrl K</kbd></button><div className="topbar-right"><span className="so-topbar-streak"><Icon name="Flame" size={15} />{state.metrics.streak}<span>day streak</span></span><span className="topbar-date">{new Date().toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              timeZone: 'Asia/Kolkata'
            })}</span><button className="topbar-inbox icon-btn" aria-label="Open messages" onClick={() => navigate('/messages')}><Icon name="MessageSquare" size={19} /><span /></button><div className="notification-wrap"><button className={`icon-btn ${notifications ? 'selected' : ''}`} aria-label="Open notifications" onClick={() => setNotifications(!notifications)}><Icon name="Bell" size={19} />{state.notifications.some(n => !n.read) && <i className="notification-dot" />}</button>{notifications && <div className="notification-panel"><div className="section-head"><h3>Your updates</h3><button className="text-link" onClick={() => act('notifications.read', {}, 'You are all caught up.').catch(() => {})}>Mark all read</button></div>{state.notifications.map(n => <button key={n.id} className={`notification-item ${n.read ? '' : 'unread'}`} onClick={() => navigate(n.route)}><span><Icon name={n.id === 'note-1' ? 'PartyPopper' : n.id === 'note-2' ? 'NotebookPen' : 'Sparkles'} size={18} /></span><div><strong>{n.title}</strong><p>{n.text}</p></div></button>)}</div>}</div><span className="topbar-separator" /><Avatar person="me" size="sm" onClick={() => setModal({
            type: 'profile',
            id: 'me'
          })} /></div></header>
      <main id="main-content" tabIndex={-1} className="main-content" key={path}><Suspense fallback={<p role="status">Opening this workspace…</p>}>{page}</Suspense><footer className="workspace-footer"><span>StudentOS · Student workspace</span><span>Learning · Practice · Career</span></footer></main>
    </div>
    <PageMotion route={route} /><ModalHost /><Quid />
  </div>;
}
export default function App() {
  return <Provider><Suspense fallback={<div className="loading-screen"><span className="brand-mark">s<sup>✦</sup></span><h2>Opening your workspace…</h2></div>}><Workspace /></Suspense></Provider>;
}
