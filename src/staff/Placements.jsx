import CompanyLogo from '../components/CompanyLogo.jsx';
import DriveOperations from './DriveOperations.jsx';
import { can } from '../../shared/permissions.js';
import React, { useState } from 'react';
import { useStore, navigate } from '../lib/store.jsx';
import { useCampus } from './context.jsx';
import { Icon, Button, Badge, Tabs, Progress, Empty } from '../components/ui.jsx';
import { jobScore, pipelineStages } from '../../shared/staff.js';
import { StudentAvatar, ReadinessBadge } from './Students.jsx';
export default function Placements() {
  const {
    state
  } = useStore();
  const {
    data,
    setDialog,
    mutate
  } = useCampus();
  const [tab, setTab] = useState('matches'),
    [studentId, setStudentId] = useState(data.students[0]?.id),
    [query, setQuery] = useState(''),
    [country, setCountry] = useState('India'),
    [yearMatch, setYearMatch] = useState(true),
    [type, setType] = useState('All roles'),
    [driveId, setDriveId] = useState(data.drives[0]?.id);
  const [limit, setLimit] = useState(6);
  const student = data.students.find(s => s.id === studentId) || data.students[0];
  const jobs = student ? state.catalog.jobs.map(job => ({
    ...job,
    ...jobScore(student, job)
  })).filter(j => (country === 'All countries' || j.country === country) && (type === 'All roles' || j.type === type) && (!yearMatch || j.yearMatch) && `${j.company} ${j.title}`.toLowerCase().includes(query.toLowerCase())).toSorted((a, b) => b.score - a.score) : [];
  const drive = data.drives.find(d => d.id === driveId) || data.drives[0];
  const placement = can(state.profile, 'placement.manage');
  return <><div className="staff-page-head"><div><span className="staff-eyebrow">PREPARATION, MEET POSSIBILITY</span><h1>Find the fit. Build the next chapter.</h1><p>Student strengths, sourced opportunities, and college drives — connected in one place.</p></div>{placement && <Button icon="Plus" onClick={() => setDialog({
        type: 'drive'
      })}>Create college drive</Button>}</div><div className="staff-placement-pulse"><section><Icon name="Target" size={20} /><strong>{data.summary.ready}</strong><span>students at 75%+ readiness</span></section><section><Icon name="Briefcase" size={20} /><strong>{state.catalog.jobs.length}</strong><span>sourced opportunities to explore</span></section><section><Icon name="CalendarDays" size={20} /><strong>{data.drives.length}</strong><span>college recruitment drives</span></section><section><Icon name="Award" size={20} /><strong>{data.drives.reduce((n, d) => n + d.applications.filter(a => a.status === 'Offered').length, 0)}</strong><span>offers in college drives</span></section></div><Tabs items={[{
      id: 'matches',
      label: 'Company & role matches'
    }, {
      id: 'drives',
      label: 'College drives',
      count: data.drives.length
    }, {
      id: 'pipeline',
      label: 'Placement pipeline'
    }]} value={tab} onChange={setTab} />{tab === 'matches' ? <div className="staff-matching-layout"><section className="card staff-match-student"><span className="staff-section-label">PREPARING THE RIGHT INTRODUCTION</span><label>Choose a student<select aria-label="Student for company matching" value={student?.id || ''} onChange={e => setStudentId(e.target.value)}>{data.students.map(s => <option key={s.id} value={s.id}>{s.name} · Year {s.year}</option>)}</select></label>{student && <><StudentAvatar student={student} large /><h2>{student.name}</h2><p>Year {student.year} · {student.track}</p><ReadinessBadge value={student.readiness} /><h4>Current preparation</h4>{Object.entries(student.skills).map(([s, n]) => <div className="staff-match-skill" key={s}><span>{s}</span><Progress value={n} color={n >= 70 ? 'mint' : 'purple'} /><strong>{n}</strong></div>)}<Button variant="secondary" icon="ArrowUpRight" onClick={() => setDialog({
            type: 'student',
            id: student.id
          })}>View complete profile</Button>{can(state.profile, 'content.publish') && <Button variant="ghost" icon="Lightbulb" onClick={() => setDialog({
            type: 'compose',
            kind: 'Feedback',
            studentIds: [student.id]
          })}>Suggest an improvement</Button>}<p className="staff-match-explainer">Readiness compares current skills with a role’s preparation themes. Graduation dates, work authorization, and employer requirements still need checking at the source.</p></>}</section><section><div className="staff-match-filters"><label className="staff-search"><Icon name="Search" size={16} /><input aria-label="Search company matches" placeholder="Company or role…" value={query} onChange={e => {
              setQuery(e.target.value);
              setLimit(6);
            }} /></label><select aria-label="Company match country" value={country} onChange={e => {
            setCountry(e.target.value);
            setLimit(6);
          }}><option>India</option><option>All countries</option>{[...new Set(state.catalog.jobs.map(j => j.country))].filter(c => c !== 'India').map(c => <option key={c}>{c}</option>)}</select><select aria-label="Company match role type" value={type} onChange={e => setType(e.target.value)}>{['All roles', 'Internship', 'Full-time'].map(t => <option key={t}>{t}</option>)}</select><label className="staff-match-year"><input type="checkbox" checked={yearMatch} onChange={e => setYearMatch(e.target.checked)} />Match college year</label></div><div className="staff-match-source"><Icon name="Info" size={14} />{jobs.length} role matches · imported {state.catalog.verifiedAt} · check the original listing for current availability</div><div className="staff-job-match-grid">{jobs.slice(0, limit).map(j => <article className="card staff-job-match" key={j.id}><div className="staff-job-match-top"><CompanyLogo name={j.company} /><div><strong>{j.company}</strong><small>{j.type} · {j.country}</small></div><ReadinessBadge value={j.score} /></div><h3>{j.title}</h3>{j.compensation && <Badge color={j.compensation === 'Unpaid' ? 'peach' : 'mint'}>{j.compensation}</Badge>}<p className="staff-job-location"><Icon name="MapPin" size={13} />{j.location}</p><div className="staff-match-skill-tags">{j.skills.map(s => <span key={s} className={student.skills[s] >= 70 ? 'ready' : 'gap'}>{s}<small>{student.skills[s]}%</small></span>)}</div><p className="staff-job-gap">{j.gaps.length ? `Prepare next: ${j.gaps.map(g => g.skill).join(', ')}.` : 'A promising skill match. Review the employer’s eligibility requirements.'}</p><div className="staff-job-year"><Icon name={j.yearMatch ? 'Check' : 'Info'} size={13} />{j.yearMatch ? 'College year aligned · confirm graduation dates' : 'Different year profile · read eligibility'}</div><footer><a href={j.sourceUrl} target="_blank" rel="noreferrer">Original listing<Icon name="ArrowUpRight" size={13} /></a>{can(state.profile, 'content.publish') && <Button variant="secondary" icon="Send" onClick={() => setDialog({
                type: 'compose',
                kind: 'Opportunity',
                jobId: j.id,
                studentIds: [student.id]
              })}>Recommend</Button>}</footer></article>)}</div>{!jobs.length && <div className="card"><Empty icon="Search" title="Try a broader opportunity search." description="Adjust the country, role type, or college-year filter." /></div>}{jobs.length > limit && <Button className="staff-load-more" variant="secondary" onClick={() => setLimit(limit + 6)}>Show more matches<Icon name="ChevronRight" size={15} /></Button>}</section></div> : tab === 'drives' ? <div className="staff-drive-grid">{data.drives.map(d => <article className="card staff-drive-card" key={d.id}><div><CompanyLogo name={d.company} /><Badge color="mint">College published · {d.status}</Badge></div><h2>{d.company}</h2><h3>{d.title}</h3><p>{d.description}</p><div className="staff-drive-meta"><span><Icon name="CalendarDays" size={14} />{d.date || 'Date to be confirmed'}</span><span><Icon name="Users" size={14} />{d.applications.length} invited</span></div><div className="staff-drive-stage-counts">{['Applied', 'Interview', 'Offered'].map(stage => <span key={stage}><strong>{d.applications.filter(a => a.status === stage).length}</strong>{stage}</span>)}</div><footer>{placement && <DriveOperations drive={d} />}<span>By {d.author}</span><Button variant="secondary" icon="ArrowUpRight" onClick={() => {
            setDriveId(d.id);
            setTab('pipeline');
          }}>Open pipeline</Button></footer></article>)}{!data.drives.length && <div className="card staff-full-span"><Empty icon="CalendarDays" title="Bring your next college drive together." description={placement ? 'Create a drive, choose the participating students, and track every stage in one place.' : 'Placement staff can publish college drives. You can review the shared pipeline here.'} action={placement ? 'Create a college drive' : undefined} onAction={() => setDialog({
          type: 'drive'
        })} /></div>}</div> : <><div className="staff-pipeline-head"><div><h2>{drive ? `${drive.company} · ${drive.title}` : 'Your college placement pipeline'}</h2><p>{placement ? 'Move students through each stage as the recruitment process progresses.' : 'A shared view of recruitment progress. Placement staff update the stages.'}</p></div>{data.drives.length > 0 && <select aria-label="Pipeline drive" value={drive?.id || ''} onChange={e => setDriveId(e.target.value)}>{data.drives.map(d => <option key={d.id} value={d.id}>{d.company} · {d.title}</option>)}</select>}</div>{drive ? <div className="staff-pipeline-board">{pipelineStages.map((stage, i) => <section className="staff-pipeline-column" key={stage}><h3><i className={`pipeline-color-${i}`} />{stage}<span>{drive.applications.filter(a => a.status === stage).length}</span></h3>{drive.applications.filter(a => a.status === stage).map(a => {
            const s = data.students.find(s => s.id === a.studentId);
            return <article className="card" key={a.studentId}><button onClick={() => setDialog({
                type: 'student',
                id: a.studentId
              })}><StudentAvatar student={s || {
                  name: a.name,
                  year: 4
                }} /><strong>{a.name}</strong></button><small>Year {s?.year} · {s?.department}</small><ReadinessBadge value={s?.readiness || 0} />{placement && <label>Move to<select aria-label={`Placement stage for ${a.name}`} value={a.status} onChange={e => mutate('drive.stage', {
                  driveId: drive.id,
                  studentId: a.studentId,
                  stage: e.target.value
                }, 'Placement stage updated in the student workspace.').catch(() => {})}>{pipelineStages.map(s => <option key={s}>{s}</option>)}</select></label>}</article>;
          })}{!drive.applications.some(a => a.status === stage) && <div className="staff-pipeline-empty"><Icon name={stage === 'Offered' ? 'Sparkles' : 'CircleDashed'} size={24} /><p>A little space for what comes next.</p></div>}</section>)}</div> : <div className="card"><Empty icon="Briefcase" title="Every application has a journey." description="Publish a college drive to begin tracking your students from invitation to outcome." /></div>}</>}</>;
}
