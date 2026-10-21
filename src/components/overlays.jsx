import CompanyLogo from './CompanyLogo.jsx';
import { ProjectEvidence } from './Employability.jsx';
import { runPracticeCode } from '../lib/practice-runner.js';
import Diagnostic from './Diagnostic.jsx';
import Course from './CoursePlayer.jsx';
import Quiz from './QuizWorkspace.jsx';
import { PlanSetup, DailyReflection } from './PlanControls.jsx';
import { defaultPlanDays } from '../../shared/journey.js';
import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useStore, navigate, yearLabel, niceDate, today } from '../lib/store.jsx';
import { Modal, Icon, IconButton, Button, Badge, Progress, Avatar, PersonName, CourseArt, JourneyArt } from './ui.jsx';
import { CollegeAssignment } from './CollegeConnected.jsx';
import { ResumeAI } from './Quid.jsx';
const DayMission = lazy(() => import('../pages/Journey.jsx').then(m => ({
  default: m.DayMission
})));
import { ExternalProblem, CompanyGuide } from './PracticeDetails.jsx';
import { lessonNames, getPath } from '../../shared/paths.js';
export function ModalHost() {
  const {
    modal,
    setModal
  } = useStore();
  if (!modal) return null;
  const close = () => setModal(null);
  switch (modal.type) {
    case 'diagnostic':
      return <Diagnostic close={close} />;
    case 'plan-setup':
      return <PlanSetup close={close} />;
    case 'reflection':
      return <DailyReflection id={modal.id} close={close} />;
    case 'college-assignment':
      return <CollegeAssignment id={modal.id} close={close} />;
    case 'resume-ai':
      return <ResumeAI close={close} />;
    case 'mission':
      return <Suspense fallback={<Modal title="Opening your mission" onClose={close}><p role="status">Loading activities…</p></Modal>}><DayMission day={modal.day} close={close} /></Suspense>;
    case 'external-problem':
      return <ExternalProblem id={modal.id} close={close} />;
    case 'company-guide':
      return <CompanyGuide id={modal.id} close={close} />;
    case 'coding':
      return <Coding id={modal.id} close={close} />;
    case 'quiz':
      return <Quiz id={modal.id} assignmentId={modal.assignmentId} close={close} />;
    case 'course':
      return <Course id={modal.id} initialLesson={modal.lesson} close={close} />;
    case 'project':
      return <Project id={modal.id} close={close} />;
    case 'event':
      return <EventDetail id={modal.id} close={close} />;
    case 'profile':
      return <Profile id={modal.id} close={close} />;
    case 'onboarding':
      return <Onboarding close={close} />;
    case 'search':
      return <Search close={close} />;
    case 'rest':
      return <Rest close={close} />;
    case 'assignment':
      return <Assignment id={modal.id} close={close} />;
    case 'application':
      return <Application close={close} />;
    case 'connections':
      return <Connections mode={modal.mode} close={close} />;
    case 'company':
      return <Company name={modal.name} close={close} />;
    case 'day':
      return <DayDetail date={modal.date} topic={modal.topic} close={close} />;
    default:
      return <Modal title={modal.title || 'A little more information'} onClose={close}><div className="info-dialog"><span className="empty-icon"><Icon name="Info" size={28} /></span><p>{modal.text}</p></div></Modal>;
  }
}
function Coding({
  id,
  close
}) {
  const {
    state,
    act,
    setAssistant
  } = useStore();
  const problem = state.catalog.problems.find(p => p.id === id);
  const [code, setCode] = useState(problem.starter),
    [running, setRunning] = useState(false),
    [results, setResults] = useState(null),
    [error, setError] = useState('');
  const runner = useRef(null);
  useEffect(() => () => runner.current?.abort(), []);
  async function run() {
    runner.current?.abort();
    runner.current = new AbortController();
    setRunning(true);
    setError('');
    setResults(null);
    try {
      setResults(await runPracticeCode({
        code,
        fn: problem.functionName,
        tests: problem.tests,
        unordered: problem.id === 'two-sum'
      }, {
        signal: runner.current.signal
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }
  return <Modal wide title={problem.title} subtitle={`${problem.topic} · ${problem.company} preparation · JavaScript`} onClose={close} className="coding-modal"><div className="coding-workspace"><section className="problem-description"><div className="inline-badges"><Badge color={problem.difficulty === 'Easy' ? 'mint' : 'peach'}>{problem.difficulty}</Badge><Badge color="gray">{problem.minutes} min practice</Badge>{state.solved.includes(id) && <Badge color="mint"><Icon name="Check" size={12} />Solved</Badge>}</div><h3>A little problem to think through.</h3><p>{problem.prompt}</p><h4>For example</h4><pre>{problem.example}</pre><h4>Before you start</h4><ul><li>Talk through a simple example.</li><li>Think about the data you need to remember.</li><li>Try the smallest case, too.</li></ul><details><summary><Icon name="Lightbulb" size={15} />A little nudge</summary><p>{problem.hint}</p></details><Button variant="secondary" icon="Sparkles" onClick={() => setAssistant({
          topic: problem.topic
        })}>Help me understand the topic</Button></section><section className="editor-panel"><div className="editor-toolbar"><span><Icon name="Code2" size={16} />solution.js</span><Badge color="gray">JavaScript</Badge></div><label className="sr-only" htmlFor="code-editor">JavaScript solution</label><textarea id="code-editor" spellCheck={false} className="code-editor" value={code} onChange={e => {
          setCode(e.target.value);
          setResults(null);
        }} onKeyDown={e => {
          if (e.key === 'Tab') {
            e.preventDefault();
            const a = e.target.selectionStart,
              b = e.target.selectionEnd;
            setCode(code.slice(0, a) + '  ' + code.slice(b));
            requestAnimationFrame(() => {
              e.target.selectionStart = e.target.selectionEnd = a + 2;
            });
          }
        }} /><div className="editor-results"><div className="editor-results-label">YOUR TEST RUN</div>{running ? <p className="muted">Trying your approach…</p> : error ? <p className="error-text">{error}</p> : results ? <><div className="inline-badges">{results.map((r, i) => <Badge key={i} color={r.passed ? 'mint' : 'peach'}><Icon name={r.passed ? 'Check' : 'X'} size={12} />Case {i + 1}</Badge>)}</div>{results.some(r => !r.passed) && <p className="error-text">Try another approach. Expected {JSON.stringify(results.find(r => !r.passed).expected)}, received {JSON.stringify(results.find(r => !r.passed).actual) ?? 'undefined'}.</p>}{results.every(r => r.passed) && <p className="success-text">Your approach passes the sample cases. Nice thinking.</p>}</> : <p className="muted">Run your solution to see how it does against the sample cases.</p>}</div><footer className="editor-footer"><span>Isolated browser practice · not a proctored verdict.</span><Button variant="secondary" icon="Play" onClick={run} disabled={running}>Run code</Button><Button icon="Check" disabled={!results?.every(r => r.passed) || running} onClick={async () => {
            await act('coding.submit', {
              id
            }, 'Problem solved. A little stronger, +50 XP.');
          }}>Submit solution</Button></footer></section></div></Modal>;
}
function Project({
  id,
  close
}) {
  const {
    state,
    act,
    toast
  } = useStore();
  const p = state.catalog.projects.find(x => x.id === id),
    done = state.projectProgress[id] || [];
  return <Modal wide title={p.title} subtitle={`${p.subtitle} · ${p.weeks} at your own pace`} onClose={close}><div className="project-detail-layout"><section><div className={`project-detail-cover tone-${p.color}`}><span>YOUR NEXT “I MADE THIS.”</span><h2>{p.title}</h2><Icon name="Blocks" size={55} /></div><p className="body-copy">{p.description}</p><ProjectEvidence id={id} /><div className="inline-badges">{p.skills.map(s => <Badge key={s} color="gray">{s}</Badge>)}</div><div className="project-learning-note"><Icon name="FileUser" size={23} /><h3>Build it. Understand it. Tell the story.</h3><p>Finish the milestones, then add the project to your resume. Include your own repository and results when you make your final edit.</p>{done.length === p.steps.length ? <Button icon="Plus" onClick={() => act('resume.project', {
            id
          }, 'Your completed project is now on your resume.').catch(() => {})}>{state.resumeProjects.includes(id) ? 'Included on my resume' : 'Add to my resume'}</Button> : <Badge color="purple">{p.steps.length - done.length} milestones to your resume</Badge>}</div></section><section className="project-milestones"><div className="section-head"><div><h2>One useful step at a time.</h2><p>{done.length} of {p.steps.length} milestones complete.</p></div><span className="project-progress-number">{Math.round(done.length / p.steps.length * 100)}%</span></div><Progress value={done.length / p.steps.length * 100} />{p.steps.map((s, i) => <button key={s} className={`project-step ${done.includes(i) ? 'complete' : ''}`} onClick={() => {
          if (!done.includes(i)) act('project.step', {
            id,
            step: i
          }, 'Milestone complete. Your skills, activity, and resume are in sync.').catch(() => {});
        }}><span>{done.includes(i) ? <Icon name="Check" size={16} /> : String(i + 1).padStart(2, '0')}</span><div><strong>{s}</strong><small>{done.includes(i) ? 'A little proof of progress' : 'Complete this in your own project, then check it off.'}</small></div><Badge color={done.includes(i) ? 'mint' : 'gray'}>{done.includes(i) ? 'Done' : '+60 XP'}</Badge></button>)}<div className="plan-note"><Icon name="Heart" size={18} /><p>These are self-reported milestones. Keep your repository and evidence with your project.</p></div></section></div></Modal>;
}
function EventDetail({
  id,
  close
}) {
  const {
    state,
    act
  } = useStore();
  const e = state.catalog.events.find(e => e.id === id),
    registered = state.registrations.includes(id);
  return <Modal title={e.name} subtitle={`${e.type} · ${e.dateLabel || e.time}`} onClose={close}><div className={`event-detail-poster tone-${e.color}`}><span>{e.label}</span><h2>{e.title}</h2><b>✳</b></div><div className="event-detail-meta"><span><Icon name="CalendarDays" size={17} />{e.dateLabel || e.time}</span><span><Icon name="MapPin" size={17} />{e.location}</span></div><p className="body-copy">{e.description}</p><a className="btn btn-primary" href={e.sourceUrl} target="_blank" rel="noreferrer">Open official event<Icon name="ArrowUpRight" size={15} /></a><h3>What to explore</h3><ul className="clean-check-list">{e.agenda.map(a => <li key={a}><Icon name="Check" size={15} />{a}</li>)}</ul><div className="event-register-note"><Icon name="Route" size={19} /><p>{state.profile.year < 4 ? 'Save a planning reminder in your journey. Register separately on the official website.' : 'Your final-year plan stays focused. This experience is yours to choose.'}</p></div><Button className="full-width" icon={registered ? 'CalendarCheck' : 'ArrowUpRight'} onClick={() => act('event.register', {
      id
    }, 'Saved locally. Open the official site for registration.').catch(() => {})}>{registered ? 'Saved to my calendar' : 'Save to my calendar'}</Button></Modal>;
}
function Profile({
  id,
  close
}) {
  const {
    state,
    act,
    setModal
  } = useStore();
  const base = state.catalog.people.find(p => p.id === id),
    me = id === 'me',
    p = me ? {
      ...base,
      ...state.profile
    } : base;
  return <Modal title={me ? 'Your student profile' : `${p.name}'s corner`} onClose={close}><div className="profile-dialog-cover"><span>✧</span><span>✺</span></div><div className="profile-dialog"><Avatar person={p} size="xl" /><h2>{p.name}<span className={`year-tag year-${p.year}`}>{yearLabel(p.year)}</span></h2><p>@{p.handle}</p><p className="profile-bio">{p.bio}</p><div className="profile-stats"><button onClick={() => setModal({
          type: 'connections',
          mode: 'followers'
        })}><strong>{p.followers ?? 0}</strong>followers</button><button onClick={() => setModal({
          type: 'connections',
          mode: 'following'
        })}><strong>{me ? state.profile.followingCount || state.following.length : p.following}</strong>following</button><span><strong>{me ? Math.floor(state.journey.xp / 250) + 1 : 8}</strong>level explorer</span></div><div className="profile-details"><span><Icon name="GraduationCap" size={17} />{p.college}</span><span><Icon name="Contact" size={17} />{p.studentId}</span><span><Icon name="Route" size={17} />{p.track}</span></div><div className="row-actions">{me ? <><Button icon="SlidersHorizontal" onClick={() => setModal({
            type: 'onboarding'
          })}>Personalize my journey</Button><Button variant="secondary" icon="Settings" onClick={() => {
            close();
            navigate('/settings');
          }}>Settings</Button></> : <><Button icon={state.following.includes(id) ? 'Check' : 'Plus'} onClick={() => act('social.follow', {
            id
          }).catch(() => {})}>{state.following.includes(id) ? 'Following' : 'Follow'}</Button><Button variant="secondary" icon="MessageCircle" onClick={() => {
            close();
            navigate(`/messages?tab=${id}`);
          }}>Say hello</Button></>}</div></div></Modal>;
}
function Onboarding({
  close
}) {
  const {
    state,
    act
  } = useStore();
  const [step, setStep] = useState(0),
    [answers, setAnswers] = useState(state.profile.onboardingAnswers || [state.profile.year, state.profile.track, 'A little experience', 'JavaScript', 'An internship', 'Read, try, and build', state.profile.dailyMinutes, 'Five days', 'A little intimidating', 'One or two', 'Still exploring', 'Staying consistent']);
  const [busy, setBusy] = useState(false);
  const questions = [{
    title: 'Where are you in your college story?',
    subtitle: 'Your year helps us give your preparation the right amount of room.',
    options: [1, 2, 3, 4].map(n => ({
      label: yearLabel(n),
      value: n,
      detail: `A ${defaultPlanDays(n)}-day preparation window, with room to grow.`,
      icon: 'GraduationCap'
    }))
  }, {
    title: 'What makes you a little curious?',
    subtitle: 'This is a direction, not a forever decision. Exploring is a good answer.',
    options: state.catalog.tracks.map((t, i) => ({
      label: t,
      value: t,
      icon: ['Code2', 'Brain', 'ChartNoAxesCombined', 'Cloud', 'Compass'][i]
    }))
  }, {
    title: 'How familiar does coding feel?',
    subtitle: 'Every starting point belongs here.',
    options: ['I am brand new', 'A little experience', 'Comfortable building things'].map(value => ({
      label: value,
      value,
      icon: 'Sprout'
    }))
  }, {
    title: 'Which language feels most familiar?',
    subtitle: 'We will start with what you know and leave room for what you want to learn.',
    options: ['JavaScript', 'Python', 'Java', 'C / C++', 'Still finding out'].map(value => ({
      label: value,
      value,
      icon: 'Code2'
    }))
  }, {
    title: 'What would a good next chapter look like?',
    subtitle: 'A goal gives your plan a little direction.',
    options: ['An internship', 'A great first job', 'A strong project portfolio', 'Explore my options'].map(value => ({
      label: value,
      value,
      icon: 'Flag'
    }))
  }, {
    title: 'How do you enjoy learning?',
    subtitle: 'Your courses can fit the way things click for you.',
    options: ['Watch and follow along', 'Read, try, and build', 'A little of everything'].map(value => ({
      label: value,
      value,
      icon: 'BookOpen'
    }))
  }, {
    title: 'How much time feels realistic each day?',
    subtitle: 'Choose a rhythm you can return to. The plan should fit your life.',
    options: [30, 60, 75, 90].map(n => ({
      label: `${n} minutes`,
      value: n,
      icon: 'Clock3'
    }))
  }, {
    title: 'How often would you like to show up?',
    subtitle: 'Rest and catch-up time are part of making this last.',
    options: ['Three days', 'Five days', 'Six days'].map(value => ({
      label: value,
      value,
      icon: 'CalendarDays'
    }))
  }, {
    title: 'How does DSA feel right now?',
    subtitle: 'Be honest. This helps us choose the next useful step.',
    options: ['A little intimidating', 'I know some patterns', 'Comfortable solving problems'].map(value => ({
      label: value,
      value,
      icon: 'GitBranch'
    }))
  }, {
    title: 'Have you built a project of your own?',
    subtitle: 'A tiny experiment counts as a beginning.',
    options: ['Not yet', 'One or two', 'A few complete projects'].map(value => ({
      label: value,
      value,
      icon: 'Blocks'
    }))
  }, {
    title: 'Any particular kind of company in mind?',
    subtitle: 'We can keep this broad while you discover what fits.',
    options: ['Product companies', 'Service companies', 'Startups', 'Still exploring'].map(value => ({
      label: value,
      value,
      icon: 'Briefcase'
    }))
  }, {
    title: 'Where would a little support help most?',
    subtitle: 'One last question. Then your next chapter is ready.',
    options: ['Staying consistent', 'Knowing what to do next', 'Interview confidence', 'Finding enough time'].map(value => ({
      label: value,
      value,
      icon: 'Heart'
    }))
  }];
  const q = questions[step];
  async function finish() {
    setBusy(true);
    try {
      await act('profile.update', {
        year: answers[0],
        track: answers[1],
        level: answers[2],
        dailyMinutes: answers[6],
        weeklyDays: answers[7] === 'Three days' ? 3 : answers[7] === 'Six days' ? 6 : 5,
        onboardingDone: true,
        onboardingAnswers: answers
      }, 'Your path is a little more you. Let’s take the first step.');
      close();
      navigate('/journey');
    } finally {
      setBusy(false);
    }
  }
  return <Modal wide title="Let's make this journey yours." subtitle="A few thoughtful questions. A path with your name on it." onClose={close} className="onboarding-modal"><div className="onboarding-layout"><aside><span className="onboarding-flower">✺</span><div><span className="eyebrow">YOUR NEXT CHAPTER</span><h2>Different dreams.<br />Different starting points.<br /><i>Your own way forward.</i></h2><p>You don't have to have it all figured out. We will start where you are.</p></div><JourneyArt /><small>About 3 minutes. You can change your answers later.</small></aside><section><div className="onboarding-step"><span>QUESTION {String(step + 1).padStart(2, '0')} OF 12</span><strong>{Math.round((step + 1) / 12 * 100)}%</strong></div><Progress value={(step + 1) / 12 * 100} /><h2>{q.title}</h2><p>{q.subtitle}</p><div className="onboarding-options">{q.options.map(o => <button key={o.label} className={answers[step] === o.value ? 'selected' : ''} onClick={() => setAnswers(answers.map((a, i) => i === step ? o.value : a))}><span><Icon name={o.icon} size={20} /></span><div><strong>{o.label}</strong>{o.detail && <small>{o.detail}</small>}</div><i>{answers[step] === o.value && <Icon name="Check" size={13} />}</i></button>)}</div><footer><Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><Icon name="ArrowLeft" size={14} />Back</Button>{step === 11 ? <Button icon="Sparkles" onClick={finish} disabled={!answers[step] || busy}>{busy ? 'Making it yours…' : 'Make my plan'}</Button> : <Button icon="ArrowRight" onClick={() => setStep(step + 1)} disabled={!answers[step]}>Continue</Button>}</footer></section></div></Modal>;
}
function Search({
  close
}) {
  const {
    state,
    setModal
  } = useStore();
  const [query, setQuery] = useState('');
  const pages = [['Overview', '/overview', 'LayoutDashboard'], ['My journey', '/journey', 'Route'], ['Coding practice', '/practice', 'Code2'], ['Courses & assignments', '/learn', 'BookOpen'], ['Jobs & internships', '/career', 'Briefcase'], ['Interview studio', '/career?tab=interview', 'MessageSquare'], ['Build a project', '/career?tab=projects', 'Blocks'], ['My resume', '/career?tab=resume', 'FileUser'], ['Community', '/community', 'Users'], ['Events & hackathons', '/events', 'CalendarDays'], ['Messages & campus lounge', '/messages', 'MessageCircle'], ['My progress', '/progress', 'ChartNoAxesCombined'], ['Settings', '/settings', 'Settings']];
  const matches = pages.filter(([name]) => name.toLowerCase().includes(query.toLowerCase()));
  const courses = query ? state.catalog.courses.filter(c => c.title.toLowerCase().includes(query.toLowerCase())) : [];
  return <Modal title="Find your next thing." onClose={close} className="search-modal"><label className="command-search"><Icon name="Search" size={20} /><input autoFocus placeholder="A course, a place, a next step…" aria-label="Search StudentOS" value={query} onChange={e => setQuery(e.target.value)} /><kbd>esc</kbd></label><div className="command-results"><span className="nav-label">{query ? 'MATCHING PLACES' : 'A FEW GOOD PLACES TO START'}</span>{matches.map(([name, path, icon]) => <button key={path} onClick={() => {
        close();
        navigate(path);
      }}><span><Icon name={icon} size={18} />{name}</span><Icon name="ArrowUpRight" size={16} /></button>)}{courses.map(c => <button key={c.id} onClick={() => setModal({
        type: 'course',
        id: c.id
      })}><span><Icon name="BookOpen" size={18} />{c.title}</span><Badge color="purple">Course</Badge></button>)}{!matches.length && !courses.length && <p className="search-empty">Try “journey”, “SQL”, “resume”, or “events”.</p>}</div></Modal>;
}
function Rest({
  close
}) {
  const {
    act
  } = useStore();
  const [date, setDate] = useState(today()),
    [end, setEnd] = useState(today()),
    [reason, setReason] = useState('Exam / recovery break'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return <Modal title="A little room to breathe." subtitle="A break belongs in your plan, too." onClose={close}><form className="form-stack" onSubmit={async e => {
      e.preventDefault();
      setBusy(true);
      try {
        await act('rest.period', {
          start: date,
          end,
          reason
        }, 'Your rest day is in the plan. Take good care of yourself.');
        close();
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    }}><div className="rest-illustration"><Icon name="Coffee" size={55} /><span>slow is a speed, too.</span></div><p className="body-copy">Exams, family time, or just a day to recharge. Set aside a day and your weekly view will make room for it.</p><label>When would you like a break?<input required type="date" value={date} onChange={e => setDate(e.target.value)} min={today()} /></label><label>Through<input type="date" required min={date} value={end} onChange={e => setEnd(e.target.value)} /></label><label>Reason<input value={reason} onChange={e => setReason(e.target.value)} /></label>{error && <p role="alert">{error}</p>}<Button type="submit" icon="Coffee" disabled={busy}>Save my rest day</Button></form></Modal>;
}
function Assignment({
  id,
  close
}) {
  const {
    state,
    act
  } = useStore();
  const a = state.assignments.find(x => x.id === id);
  const [text, setText] = useState(a.submission),
    [busy, setBusy] = useState(false);
  return <Modal title={a.title} subtitle={`${a.teacher} · Due ${niceDate(a.deadline)}`} onClose={close}><Badge color={a.status === 'submitted' ? 'mint' : 'blue'}>{a.status === 'submitted' ? 'Your work is submitted' : a.subject}</Badge><p className="assignment-brief">{a.description}</p><form className="form-stack" onSubmit={async e => {
      e.preventDefault();
      setBusy(true);
      try {
        await act('assignment.submit', {
          id,
          text
        }, 'Your assignment is saved and submitted in this workspace.');
        close();
      } finally {
        setBusy(false);
      }
    }}><label>Your work<textarea rows={10} required minLength={20} placeholder="Write your answer, paste your SQL, or include a link to your project…" value={text} onChange={e => setText(e.target.value)} maxLength={6000} /></label><Button type="submit" disabled={busy} icon="Check">{a.status === 'submitted' ? 'Update my submission' : 'Submit my work'}</Button></form></Modal>;
}
function Application({
  close
}) {
  const {
    act
  } = useStore();
  const [company, setCompany] = useState(''),
    [title, setTitle] = useState('');
  return <Modal title="A new possibility to keep track of." subtitle="Add an application you have made outside StudentOS." onClose={close}><form className="form-stack" onSubmit={async e => {
      e.preventDefault();
      await act('application.add', {
        company,
        title
      }, 'Your application is in the tracker.');
      close();
    }}><label>Company<input required value={company} onChange={e => setCompany(e.target.value)} placeholder="Where did you apply?" maxLength={100} /></label><label>Role<input required value={title} onChange={e => setTitle(e.target.value)} placeholder="What are you hoping to do?" maxLength={120} /></label><Button type="submit" icon="Plus">Add to my tracker</Button></form></Modal>;
}
function Connections({
  mode,
  close
}) {
  const {
    state,
    act,
    setModal
  } = useStore();
  const list = state.catalog.people.filter(p => state.profile.isDemo && p.id !== 'me' && (mode === 'followers' || state.following.includes(p.id)));
  return <Modal title={mode === 'followers' ? 'A little community around you.' : 'The people you are growing with.'} subtitle={mode === 'followers' ? 'A sample of your campus connections.' : 'Students you follow in this workspace.'} onClose={close}><div className="connections-list">{list.map(p => <div key={p.id}><Avatar person={p} onClick={() => setModal({
          type: 'profile',
          id: p.id
        })} /><PersonName person={p} /><Button variant="secondary" onClick={() => act('social.follow', {
          id: p.id
        }).catch(() => {})} icon={state.following.includes(p.id) ? 'Check' : 'Plus'}>{state.following.includes(p.id) ? 'Following' : 'Follow'}</Button></div>)}{!list.length && <p className="body-copy">Say hello to someone in Community to start building your circle.</p>}</div></Modal>;
}
function Company({
  name,
  close
}) {
  const {
    state,
    setModal
  } = useStore();
  return <Modal title={`A little more ready for ${name}.`} subtitle="A focused preparation space · Sample learning guide" onClose={close}><div className="company-prep-intro"><CompanyLogo name={name} /><p>Build transferable problem-solving skills, practise explaining your choices, and prepare a project story you know well.</p></div><h3>Your preparation checkpoints</h3><div className="company-prep-rounds">{[['01', 'Problem-solving patterns', 'Arrays, strings, stacks, and a clear explanation of your approach.'], ['02', 'Technical foundations', 'Your language, APIs, databases, and the choices in your projects.'], ['03', 'Your project story', 'The problem, your contribution, the result, and what you learned.']].map(([n, title, body]) => <div key={n}><span>{n}</span><div><h4>{title}</h4><p>{body}</p></div></div>)}</div><h3>Start with a little practice</h3>{state.catalog.problems.filter(p => p.company === name).map(p => <button className="company-problem" key={p.id} onClick={() => setModal({
      type: 'coding',
      id: p.id
    })}><span>{p.title}<small>{p.topic}</small></span><Badge color={p.difficulty === 'Easy' ? 'mint' : 'peach'}>{p.difficulty}</Badge><Icon name="ArrowUpRight" size={16} /></button>)}</Modal>;
}
function DayDetail({
  date,
  topic,
  close
}) {
  const {
    state,
    setModal
  } = useStore();
  const rest = state.journey.restDays.includes(date) || new Date(date + 'T12:00:00').getDay() === 0;
  return <Modal title={rest ? 'A little space to recharge.' : `Your little steps for ${niceDate(date)}.`} subtitle={rest ? 'Rest is part of getting there.' : `${topic} · A balanced session, at your own pace.`} onClose={close}>{rest ? <div className="rest-illustration"><Icon name="Coffee" size={50} /><p>A good day to take a breath.</p></div> : <><p className="body-copy">Your journey balances learning, practice, and building. This is the template for this day; choose an activity below to explore.</p>{[{
        icon: 'BookOpen',
        title: 'Understand one useful idea',
        detail: 'A short read-and-do session.',
        kind: 'course',
        id: state.profile.track === 'Data science' ? 'python' : 'react',
        minutes: 20
      }, {
        icon: 'Code2',
        title: 'Practise one pattern',
        detail: 'Explain your approach, then try it.',
        kind: 'coding',
        id: 'two-sum',
        minutes: 20
      }, {
        icon: 'Blocks',
        title: 'Move your project forward',
        detail: 'One small milestone is enough.',
        kind: 'project',
        id: 'campus',
        minutes: 25
      }].map(t => <button className="day-step" key={t.title} onClick={() => setModal({
        type: t.kind,
        id: t.id
      })}><span><Icon name={t.icon} size={20} /></span><div><strong>{t.title}</strong><small>{t.detail}</small></div><Badge color="gray">{t.minutes} min</Badge><Icon name="ArrowUpRight" size={15} /></button>)}{state.profile.year < 4 && <div className="event-register-note"><Icon name="Users" size={19} /><p>Your weekly rhythm also includes space for a campus event or hackathon.</p></div>}</>}</Modal>;
}
const topicGuides = {
  'Arrays': {
    title: 'Think of an array as a numbered row of boxes.',
    body: 'Each box holds a value. The number on a box is its index, starting at zero. If you need to find two values that add up to a target, you could check every pair—or remember values you have already seen in a map.',
    example: 'For [2, 7, 11] and target 9: see 2 and remember it. At 7, ask “have I seen 9 − 7?” Yes: 2. The pair is at indices 0 and 1.'
  },
  'DSA': {
    title: 'Patterns make a new problem feel a little familiar.',
    body: 'A data structure organizes what you need to remember. An algorithm describes the steps you take. Start with a tiny input, work through it by hand, and identify the information each step needs.',
    example: 'A stack fits “most recent first”. A queue fits “first in, first out”. A sliding window fits a changing range of nearby values.'
  },
  'Frontend': {
    title: 'An interface is a conversation with a person.',
    body: 'A component is a reusable piece of that conversation. Props pass information into it, while state remembers information that changes. When state changes, React renders a new description of the interface.',
    example: 'An event button might remember saved = false. Clicking changes it to true, so its next render says “Saved”.'
  },
  'Backend': {
    title: 'An API is a clear agreement between two parts of a product.',
    body: 'The frontend sends a request to a resource, such as GET /events. The backend validates the request, reads or updates stored data, and returns a useful response. Plan for success, missing data, and errors.',
    example: 'GET /events returns a list. POST /registrations creates a registration. A 400 response can explain what input needs fixing.'
  },
  'Databases': {
    title: 'A database gives your information a dependable home.',
    body: 'Tables organize records into rows and columns. A primary key identifies a row. A foreign key links it to another table. SQL lets you ask precise questions about that data.',
    example: 'SELECT name FROM events WHERE category = \'Hackathon\'; chooses the names of matching events.'
  },
  'DevOps': {
    title: 'A small, repeatable path from a change to a working service.',
    body: 'Keep changes in Git, run useful checks, build a deployable version, and monitor what happens after release. Automation helps make the same careful steps happen each time.',
    example: 'Change → review → test → build → deploy → observe. Have a way to restore the previous working version.'
  }
};
export function Assistant() {
  const {
    assistant,
    setAssistant
  } = useStore();
  const [input, setInput] = useState(''),
    [topic, setTopic] = useState('Frontend'),
    [question, setQuestion] = useState('');
  useEffect(() => {
    if (assistant?.topic) {
      setTopic(topicGuides[assistant.topic] ? assistant.topic : 'DSA');
      setQuestion(assistant.topic);
    }
  }, [assistant]);
  if (!assistant) return null;
  const guide = topicGuides[topic] || topicGuides.Frontend;
  function send(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setQuestion(input);
    const t = input.toLowerCase();
    setTopic(/sql|database|table|query/.test(t) ? 'Databases' : /api|backend|rest|server/.test(t) ? 'Backend' : /deploy|docker|devops|cloud/.test(t) ? 'DevOps' : /array|two sum/.test(t) ? 'Arrays' : /dsa|algorithm|stack|queue|pattern/.test(t) ? 'DSA' : 'Frontend');
    setInput('');
  }
  return <aside className="assistant-drawer" role="dialog" aria-label="StudentOS study companion"><header><span className="assistant-logo"><Icon name="Sparkles" size={22} /></span><div><h3>A little help, right here.</h3><p>Your StudentOS study companion</p></div><IconButton name="X" label="Close study companion" onClick={() => setAssistant(null)} /></header><div className="assistant-body"><Badge color="purple"><Icon name="BookOpen" size={12} />TOPIC GUIDE</Badge><h2>Let's make it click.</h2><p className="assistant-intro">Explore a topic guide now. Personalized AI explanations will connect when your API is added.</p><div className="assistant-topics">{Object.keys(topicGuides).filter(t => t !== 'Arrays').map(t => <button key={t} className={topic === t ? 'active' : ''} onClick={() => {
          setTopic(t);
          setQuestion('');
        }}>{t}</button>)}</div>{question && <div className="assistant-user-question">{question}</div>}<article className="assistant-answer"><span>✦</span><h3>{guide.title}</h3><p>{guide.body}</p><div><Icon name="Lightbulb" size={17} /><p>{guide.example}</p></div></article><p className="assistant-kind-note"><Icon name="Heart" size={14} />It is okay to ask for another way to understand.</p></div><form onSubmit={send}><label className="sr-only" htmlFor="assistant-question">Ask about a topic</label><input id="assistant-question" value={input} onChange={e => setInput(e.target.value)} placeholder="Try “What is an API?”" /><button type="submit" aria-label="Find a topic guide" disabled={!input.trim()}><Icon name="ArrowUp" size={18} /></button></form></aside>;
}
