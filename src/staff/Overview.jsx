import { OrbitScene, CountUp } from '../components/DesignEffects.jsx';
import { can } from '../../shared/permissions.js';
import React from 'react';
import { useCampus } from './context.jsx';
import { useStore, navigate } from '../lib/store.jsx';
import { Icon, Button, Badge, Progress } from '../components/ui.jsx';
import { StudentAvatar, ReadinessBadge } from './Students.jsx';
export default function Overview({
  firstName
}) {
  const {
    data,
    setDialog
  } = useCampus();
  const {
    state
  } = useStore();
  const placement = can(state.profile, 'placement.manage');
  const publish = can(state.profile, 'content.publish');
  const needs = data.students.filter(s => s.needsSupport).slice(0, 3),
    leaders = data.students.slice(0, 4);
  return <><div className="staff-page-head"><div><span className="staff-eyebrow">YOUR CAMPUS, IN FOCUS</span><h1>Hello, {firstName}<span className="staff-greeting">✺</span></h1><p>{placement ? 'Your students are preparing. Let’s help them find where they belong.' : 'A clear view of your class. A meaningful next step for every student.'}</p></div>{publish && <Button icon="Plus" onClick={() => setDialog({
        type: 'compose',
        kind: placement ? 'Opportunity' : 'Assignment'
      })}>{placement ? 'Share an opportunity' : 'Create an assignment'}</Button>}</div><div className="staff-overview-hero"><section className="staff-welcome-card"><Badge color="glass">{placement ? 'FROM PREPARATION TO POSSIBILITY' : 'FOR THE WHOLE CLASS. AND EVERY INDIVIDUAL.'}</Badge><h2>{placement ? <>Big potential.<br />Better possibilities.</> : <>Their next chapter.<br />Your impact.</>}</h2><p>{placement ? 'Understand their strengths, close the gaps, and build a placement journey with purpose.' : 'Meaningful assignments. Thoughtful feedback. Small nudges that help your students go further.'}</p><div><Button icon="ArrowUpRight" onClick={() => navigate(placement ? '/staff/placements' : '/staff/students')}>{placement ? 'Explore company matches' : 'Meet your students'}</Button><button onClick={() => navigate('/staff/reports')}>See the bigger picture<Icon name="ArrowRight" size={15} /></button></div><div className="staff-hero-art"><OrbitScene variant="college" scores={{
            readiness: data.summary.averageReadiness
          }} total={data.summary.students} /></div></section><section className="card staff-review-highlight"><span className="staff-section-label">{placement ? 'YOUR PLACEMENT PULSE' : 'YOUR TEACHING PULSE'}</span><span className="staff-highlight-icon"><Icon name={placement ? 'Target' : 'NotebookPen'} size={23} /></span><strong>{placement ? data.summary.ready : data.summary.toReview}<small>{placement ? 'students ready to explore' : 'submissions to review'}</small></strong><p>{placement ? 'Preparation signals look promising. Check the individual role requirements before recommending a position.' : 'Your feedback could be the next useful step. Review submitted work and help them improve.'}</p><Button variant="secondary" icon="ArrowUpRight" onClick={() => navigate(placement ? '/staff/placements' : '/staff/assignments?tab=review')}>{placement ? 'Find their next fit' : 'Open review queue'}</Button></section></div><div className="staff-stats-grid">{[[data.summary.students, 'Students in your college', 'Users', 'purple'], [data.summary.averageReadiness + '%', 'Average career readiness', 'Target', 'mint'], [data.summary.activeThisWeek, 'Active in the last 7 days', 'Flame', 'peach'], [placement ? data.summary.offers : data.summary.published, placement ? 'Offers in the student tracker' : 'Published learning updates', placement ? 'Briefcase' : 'Send', 'blue']].map(([n, label, icon, tone]) => <section className="card staff-stat" key={label}><span className={`tone-${tone}`}><Icon name={icon} size={19} /></span><div><strong>{typeof n === "number" ? <CountUp value={n} /> : n}</strong><small>{label}</small></div></section>)}</div><div className="staff-overview-middle"><section className="card staff-panel"><div className="staff-section-head"><div><h2>A little support goes a long way.</h2><p>Students who may benefit from a check-in.</p></div><button onClick={() => navigate('/staff/students?support=1')}>View students<Icon name="ArrowUpRight" size={14} /></button></div>{needs.length ? needs.map(s => <div className="staff-support-row" key={s.id}><StudentAvatar student={s} /><div><button onClick={() => setDialog({
              type: 'student',
              id: s.id
            })}>{s.name}<span>Year {s.year}</span></button><small>{s.overdue ? `${s.overdue} overdue assignment${s.overdue === 1 ? '' : 's'}` : s.active7 ? 'A quieter learning week' : 'No recent activity'} · {s.track}</small></div><Button variant="ghost" icon="MessageCircle" onClick={() => publish ? setDialog({
            type: 'compose',
            kind: 'Feedback',
            studentIds: [s.id]
          }) : navigate('/staff/messages?tab=' + s.id)}>Check in</Button></div>) : <div className="staff-small-empty"><Icon name="Check" />Your students are keeping a steady rhythm.</div>}<div className="staff-panel-note"><Icon name="Heart" size={14} />A check-in is an invitation to help. Every student’s circumstances are different.</div></section><section className="card staff-panel"><div className="staff-section-head"><div><h2>Skills across the campus</h2><p>Where your next workshop could help.</p></div><Icon name="ChartNoAxesCombined" size={18} /></div>{data.skills.map(({
          skill,
          average
        }) => <div className="staff-skill-bar" key={skill}><span>{skill}</span><Progress value={average} color={average >= 65 ? 'mint' : 'purple'} /><strong>{average}%</strong></div>)}{publish && <button className="staff-inline-link" onClick={() => setDialog({
          type: 'compose',
          kind: 'Assignment',
          subject: data.skills.toSorted((a, b) => a.average - b.average)[0]?.skill
        })}>Create a focused practice assignment<Icon name="ArrowUpRight" size={14} /></button>}</section></div><div className="staff-overview-bottom"><section className="card staff-panel"><div className="staff-section-head"><div><h2>Preparation taking shape</h2><p>Explore individual strengths and next steps.</p></div><button onClick={() => navigate('/staff/students')}>All students<Icon name="ArrowUpRight" size={14} /></button></div><div className="staff-mini-roster">{leaders.map(s => <button key={s.id} onClick={() => setDialog({
            type: 'student',
            id: s.id
          })}><StudentAvatar student={s} /><div><strong>{s.name}</strong><small>Year {s.year} · {s.completedProjects} projects</small></div><ReadinessBadge value={s.readiness} /><Icon name="ArrowUpRight" size={14} /></button>)}</div></section><section className="card staff-panel"><div className="staff-section-head"><div><h2>What’s been moving</h2><p>The latest college workspace activity.</p></div><Icon name="Clock3" size={18} /></div><div className="staff-activity-list">{data.audit.slice(0, 4).map(a => <div key={a.id}><span><Icon name={a.action.includes('review') ? 'CheckCheck' : a.action.includes('drive') ? 'Briefcase' : 'Send'} size={15} /></span><div><strong>{a.title}</strong><small>{a.actor} · {a.action === 'item.save' ? 'Content prepared' : a.action === 'submission.review' ? 'Submission reviewed' : a.action.replaceAll('.', ' ')}{a.recipients ? ' · ' + a.recipients + ' recipients' : ''}</small></div></div>)}</div>{!data.audit.length && <p className="staff-small-empty">Your assignments, messages, and reviews will appear here.</p>}</section></div></>;
}
