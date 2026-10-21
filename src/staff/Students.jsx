import ProfileImage from '../components/ProfileImage.jsx';
import React, { useState, useEffect } from 'react';
import { useCampus } from './context.jsx';
import { can } from '../../shared/permissions.js';
import { useRoute, useStore } from '../lib/store.jsx';
import { Icon, Button, Badge, Empty, Modal } from '../components/ui.jsx';
import { matchesStudent, csvExport } from '../../shared/staff.js';
export function StudentAvatar({
  student,
  large = false
}) {
  const colors = ['purple', 'mint', 'blue', 'peach'];
  return <span className={`staff-student-avatar tone-${colors[(student.year || 1) % 4]} ${large ? 'large' : ''}`}>{student.name.split(' ').map(n => n[0]).slice(0, 2).join('')}<ProfileImage person={student} /></span>;
}
export function ReadinessBadge({
  value
}) {
  return <span className={`staff-readiness ${value >= 75 ? 'high' : value >= 50 ? 'medium' : 'early'}`}><i />{value}%</span>;
}
export function exportStudents(students) {
  const rows = [['Name', 'Student ID', 'Year', 'Department', 'Track', 'Readiness %', 'Problems practiced', 'Quiz score %', 'Completed projects', 'Active days (last 7)', 'Overdue work', 'Offers'], ...students.map(s => [s.name, s.studentId, s.year, s.department, s.track, s.readiness, s.solved, s.quizScore, s.completedProjects, s.active7, s.overdue, s.offers])];
  const url = URL.createObjectURL(new Blob([csvExport(rows)], {
    type: 'text/csv;charset=utf-8'
  }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'studentos-college-progress.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Students() {
  const {
    state
  } = useStore();
  const publish = can(state.profile, 'content.publish');
  const {
    data,
    setDialog,
    mutate
  } = useCampus();
  const [route] = useRoute();
  const [filters, setFilters] = useState({
      query: new URLSearchParams(route.split('?')[1]).get('query') || '',
      year: '',
      department: '',
      track: '',
      readiness: '',
      support: route.includes('support=1')
    }),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState([]),
    [sort, setSort] = useState('readiness'),
    [save, setSave] = useState(false),
    [cohortName, setCohortName] = useState(''),
    [saving, setSaving] = useState(false);
  const students = data.students.filter(s => matchesStudent(s, filters)).toSorted((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'year' ? b.year - a.year : sort === 'activity' ? b.active7 - a.active7 : b.readiness - a.readiness);
  useEffect(() => setPage(1), [JSON.stringify(filters), sort]);
  function filter(key, value) {
    setFilters(f => ({
      ...f,
      [key]: value
    }));
  }
  function toggle(id) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }
  const all = students.length > 0 && students.every(s => selected.includes(s.id));
  async function saveCohort(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await mutate('cohort.save', {
        name: cohortName,
        filters
      }, 'Cohort saved. You can reuse this audience.');
      setSave(false);
    } finally {
      setSaving(false);
    }
  }
  return <><div className="staff-page-head"><div><span className="staff-eyebrow">KNOW THE PERSON BEHIND THE PROGRESS</span><h1>Every student. A clear next step.</h1><p>One college roster. All years. A useful view of what each student needs.</p></div><Button variant="secondary" icon="Download" onClick={() => exportStudents(students)}>Export this view</Button></div><div className="staff-roster-summary">{[[data.students.length, 'in the college'], [data.students.filter(s => s.readiness >= 75).length, 'ready to explore'], [data.students.filter(s => s.needsSupport).length, 'could use a check-in']].map(([n, label]) => <span key={label}><strong>{n}</strong>{label}</span>)}</div><div className="staff-cohort-pills"><span><Icon name="Users" size={15} />Saved cohorts</span>{data.cohorts.map(c => <button key={c.id} onClick={() => setFilters({
        query: '',
        year: '',
        department: '',
        track: '',
        readiness: '',
        ...c.filters
      })}>{c.name}<small>{data.students.filter(s => matchesStudent(s, c.filters)).length}</small></button>)}{publish && <button className="staff-save-filter" onClick={() => setSave(true)}><Icon name="Plus" size={14} />Save this filter</button>}</div><section className="card staff-roster-card"><div className="staff-roster-toolbar"><label className="staff-search"><Icon name="Search" size={17} /><input aria-label="Search students" value={filters.query} onChange={e => filter('query', e.target.value)} placeholder="Name, username, or student ID…" /></label><div><span>{students.length} students</span><select aria-label="Sort students" value={sort} onChange={e => setSort(e.target.value)}><option value="readiness">Readiness: high to low</option><option value="name">Name: A–Z</option><option value="year">Year: final year first</option><option value="activity">Activity: most active</option></select></div></div><div className="staff-roster-filters"><select aria-label="Filter student year" value={filters.year} onChange={e => filter('year', e.target.value)}><option value="">All years</option>{[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}</select><select aria-label="Filter student department" value={filters.department} onChange={e => filter('department', e.target.value)}><option value="">All departments</option>{[...new Set(data.students.map(s => s.department))].map(s => <option key={s}>{s}</option>)}</select><select aria-label="Filter student track" value={filters.track} onChange={e => filter('track', e.target.value)}><option value="">All learning paths</option>{[...new Set(data.students.map(s => s.track))].map(s => <option key={s}>{s}</option>)}</select><select aria-label="Minimum student readiness" value={filters.readiness} onChange={e => filter('readiness', e.target.value)}><option value="">Any readiness</option>{[40, 60, 75, 85].map(n => <option key={n} value={n}>{n}%+ ready</option>)}</select><select aria-label="Filter student company" value={filters.company || ''} onChange={e => filter('company', e.target.value)}><option value="">All company interests</option>{[...new Set(data.students.flatMap(s => [...(s.targetCompanies || []), ...(s.companyApplications || [])]))].sort().map(c => <option key={c}>{c}</option>)}</select><label><input type="checkbox" checked={filters.support} onChange={e => filter('support', e.target.checked)} />Needs a check-in</label><button onClick={() => {
          setFilters({
            query: '',
            year: '',
            department: '',
            track: '',
            readiness: '',
            support: false
          });
          setSelected([]);
        }}>Reset filters</button></div><div className="staff-table-scroll"><table className="staff-student-table"><thead><tr><th><input type="checkbox" aria-label="Select all filtered students" checked={all} onChange={() => setSelected(all ? selected.filter(id => !students.some(s => s.id === id)) : [...new Set([...selected, ...students.map(s => s.id)])])} /></th><th>Student</th><th>Year & department</th><th>Learning path</th><th>Readiness</th><th>Practice</th><th>Last 7 days</th><th /></tr></thead><tbody>{students.slice((page - 1) * 40, page * 40).map(s => <tr className={selected.includes(s.id) ? 'is-selected' : ''} key={s.id}><td><input aria-label={`Select ${s.name}`} type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} /></td><td><button className="staff-student-cell" onClick={() => setDialog({
                  type: 'student',
                  id: s.id
                })}><StudentAvatar student={s} /><span><strong>{s.name}</strong><small>@{s.handle}</small></span></button></td><td><Badge color={s.year === 4 ? 'mint' : s.year === 3 ? 'purple' : 'blue'}>Year {s.year}</Badge><small className="staff-table-sub">{s.department} · {s.section}</small></td><td><span className="staff-track-name">{s.track}</span><small className="staff-table-sub">Day {s.journeyDay} / {s.totalDays}</small></td><td><ReadinessBadge value={s.readiness} /></td><td><strong className="staff-table-number">{s.solved}</strong><small className="staff-table-sub">{s.completedProjects} projects</small></td><td><div className="staff-activity-dots">{s.activity.map(a => <i key={a.date} className={a.count > 0 ? 'active' : ''} title={`${a.date}: ${a.count} contributions`} />)}</div><small className="staff-table-sub">{s.active7}/7 active days{s.overdue ? ` · ${s.overdue} overdue` : ''}</small></td><td><button className="icon-btn" aria-label={`View ${s.name}`} onClick={() => setDialog({
                  type: 'student',
                  id: s.id
                })}><Icon name="ArrowUpRight" size={17} /></button></td></tr>)}</tbody></table></div>{!students.length && <Empty icon="Search" title="No students match this view." description="Try another year, department, or readiness filter." />}<div className="staff-table-foot"><span>{students.length ? Math.min((page - 1) * 40 + 1, students.length) : 0}–{Math.min(page * 40, students.length)} of {students.length} matching · {data.students.length} in college</span><div className="campus-roster-pagination"><button disabled={page === 1} onClick={() => setPage(n => n - 1)}>Previous</button><span>Page {page} / {Math.max(1, Math.ceil(students.length / 40))}</span><button disabled={page * 40 >= students.length} onClick={() => setPage(n => n + 1)}>Next</button></div><span>Readiness is a preparation signal, assessed across current skills.</span></div></section>{selected.length > 0 && publish && <div className="staff-selection-bar" role="status"><span><Icon name="CheckCheck" size={18} /><strong>{selected.length}</strong>students selected</span><button onClick={() => setSelected([])}>Clear</button><Button variant="secondary" icon="MessageCircle" onClick={() => setDialog({
        type: 'compose',
        kind: 'Message',
        studentIds: selected
      })}>Send a message</Button><Button icon="Plus" onClick={() => setDialog({
        type: 'compose',
        kind: 'Assignment',
        studentIds: selected
      })}>Assign to selected</Button></div>}{save && <Modal title="Save a student cohort" subtitle="Reuse this group for assignments, guidance, and updates." onClose={() => setSave(false)}><form className="form-stack" onSubmit={saveCohort}><label>Cohort name<input required value={cohortName} onChange={e => setCohortName(e.target.value)} placeholder="e.g. Final-year full-stack students" maxLength={80} /></label><p>{students.length} students currently match these filters. Cohorts update with the roster.</p><Button type="submit" disabled={saving} icon="Check">Save cohort</Button></form></Modal>}</>;
}
