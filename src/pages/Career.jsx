import CompanyLogo from '../components/CompanyLogo.jsx';
import { ResumeWorkspace, ApplicationTimeline } from '../components/Employability.jsx';
import Interview from '../components/InterviewStudio.jsx';
import React, { useState, useEffect } from 'react';
import { useStore, navigate, niceDate } from '../lib/store.jsx';
import { PageHead, Button, Icon, IconButton, Badge, Tabs, Ring, Progress, CourseArt, Empty } from '../components/ui.jsx';
import Opportunities from '../components/Opportunities.jsx';
export default function Career({
  initialTab
}) {
  const {
    state,
    setModal
  } = useStore();
  const [tab, setTab] = useState(initialTab || 'opportunities');
  useEffect(() => setTab(initialTab || 'opportunities'), [initialTab]);
  return <><PageHead eyebrow="CAREER WORKSPACE" title="Career & placements" description="Explore opportunities, track applications and prepare your resume and portfolio."><Button variant="secondary" icon="FileUser" onClick={() => {
        setTab('resume');
        navigate('/career?tab=resume');
      }}>My resume</Button></PageHead><Tabs items={[{
      id: 'opportunities',
      label: 'Opportunities'
    }, {
      id: 'applications',
      label: 'Applications',
      count: state.applications.length
    }, {
      id: 'interview',
      label: 'Interview studio'
    }, {
      id: 'projects',
      label: 'Build a project'
    }, {
      id: 'resume',
      label: 'My resume'
    }]} value={tab} onChange={next => {
      setTab(next);
      navigate('/career?tab=' + next);
    }} />{tab === 'opportunities' ? <Opportunities /> : tab === 'applications' ? <Applications /> : tab === 'interview' ? <Interview /> : tab === 'projects' ? <Projects /> : <ResumeWorkspace />}</>;
}
function Applications() {
  const {
    state,
    act,
    setModal
  } = useStore();
  const [detail, setDetail] = useState(null);
  const stages = ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Not selected'];
  return <><div className="section-head"><div><h2>Every application has a story.</h2><p>Keep track of the conversations, possibilities, and next steps.</p></div><Button icon="Plus" onClick={() => setModal({
        type: 'application'
      })}>Add an application</Button></div><div className="application-board">{stages.map((s, i) => <section className="application-column" key={s}><h3><i style={{
            background: ['#9b8ae1', '#73a6dc', '#efa77d', '#66b69b', '#bdadc2'][i]
          }} />{s}<span>{state.applications.filter(a => a.status === s).length}</span></h3>{state.applications.filter(a => a.status === s).map(a => <article className="card application-card" key={a.id}><CompanyLogo name={a.company} /><h4>{a.title}</h4><p>{a.company}</p><small>Added {niceDate(a.date)}</small><Button variant="ghost" onClick={() => setDetail(a.id)}>Timeline & next step</Button><label><span>Move to</span><select aria-label={`Move ${a.company} application`} value={a.status} onChange={e => act('application.move', {
              id: a.id,
              status: e.target.value
            }, 'Application stage updated.').catch(() => {})}>{stages.map(x => <option key={x}>{x}</option>)}</select></label></article>)}{!state.applications.some(a => a.status === s) && <div className="column-empty"><Icon name={i === 3 ? 'Sparkles' : 'CircleDashed'} size={22} /><p>{i === 3 ? 'No selected applications yet.' : 'No applications in this stage.'}</p></div>}</section>)}</div>{detail && <ApplicationTimeline application={state.applications.find(a => a.id === detail)} close={() => setDetail(null)} />}</>;
}
function Projects() {
  const {
    state,
    setModal
  } = useStore();
  return <><div className="project-intro"><div><Badge color="glass">BUILD SOMETHING YOU CAN TALK ABOUT</Badge><h2>Projects for your portfolio</h2><p>Choose a project, complete its milestones<br />and add the finished work to your resume.</p></div><div className="project-intro-art"><div className="project-window"><i /><i /><i /><span>&lt;your next big idea /&gt;</span><b>✦</b></div><span className="project-sticker">made by you ↗</span></div></div><div className="project-grid">{state.catalog.projects.map(p => {
        const done = (state.projectProgress[p.id] || []).length;
        return <section className="card project-card" key={p.id}><div className={`project-cover tone-${p.color}`}><span className="project-cover-word">{p.id === 'campus' ? 'hello, campus.' : p.id === 'spend' ? 'a little clarity.' : p.id === 'insight' ? 'find the story.' : 'ship something.'}</span><Icon name={p.id === 'campus' ? 'PanelsTopLeft' : p.id === 'spend' ? 'ChartPie' : p.id === 'insight' ? 'ChartNoAxesCombined' : 'Rocket'} size={55} /><Badge color="glass">{p.category}</Badge></div><div className="project-card-body"><div className="course-category"><span>{p.level}</span><span>{p.weeks}</span></div><h3>{p.title}</h3><p>{p.subtitle}</p><div className="project-skills">{p.skills.map(s => <Badge color="gray" key={s}>{s}</Badge>)}</div>{done > 0 && <><Progress value={done / p.steps.length * 100} /><small>{done}/{p.steps.length} milestones completed</small></>}<Button variant="secondary" icon="ArrowUpRight" onClick={() => setModal({
              type: 'project',
              id: p.id
            })}>{done === p.steps.length ? 'See what you built' : done ? 'Keep building' : 'Explore this project'}</Button></div></section>;
      })}</div></>;
}
