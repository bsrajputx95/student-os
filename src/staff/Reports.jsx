import DateRangeReport from './DateRangeReport.jsx';
import React, { useState } from 'react';
import { useCampus } from './context.jsx';
import { Icon, Button, Badge, Progress } from '../components/ui.jsx';
import { exportStudents } from './Students.jsx';
export default function Reports() {
  const {
    data,
    setDialog
  } = useCampus();
  const [year, setYear] = useState('');
  const students = data.students.filter(s => !year || s.year === Number(year));
  const count = students.length,
    avg = key => count ? Math.round(students.reduce((n, s) => n + s[key], 0) / count) : 0;
  const days = Array.from({
    length: 7
  }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const key = date.toLocaleDateString('en-CA');
    return {
      key,
      label: date.toLocaleDateString('en', {
        weekday: 'short'
      }),
      count: students.reduce((n, s) => n + (s.activity.find(a => a.date === key)?.count || 0), 0)
    };
  });
  const max = Math.max(1, ...days.map(d => d.count));
  const work = data.items.filter(i => i.status === 'published' && ['Assignment', 'Project', 'Quiz'].includes(i.kind));
  const bands = [['Building foundations', 0, 39, 'purple'], ['Developing skills', 40, 59, 'blue'], ['Almost there', 60, 74, 'peach'], ['Ready to explore', 75, 100, 'mint']].map(([name, min, max, color]) => ({
    name,
    color,
    count: students.filter(s => s.readiness >= min && s.readiness <= max).length
  }));
  return <><div className="staff-page-head"><div><span className="staff-eyebrow">THE BIGGER PICTURE, WITH A PURPOSE</span><h1>See what’s working. Know what’s next.</h1><p>Learning activity, skill growth, and placement preparation from the connected student records.</p></div><div className="staff-page-head-actions"><select aria-label="Report college year" value={year} onChange={e => setYear(e.target.value)}><option value="">Whole college</option>{[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}</select><Button variant="secondary" icon="Download" onClick={() => exportStudents(students)}>Export report</Button></div></div><DateRangeReport /><div className="staff-report-metrics">{[[count, 'students in this view', 'Users'], [avg('readiness') + '%', 'average readiness', 'Target'], [students.filter(s => s.active7 > 0).length, 'active this week', 'Flame'], [students.reduce((n, s) => n + s.completedProjects, 0), 'completed portfolio projects', 'Blocks']].map(([n, label, icon]) => <section className="card" key={label}><Icon name={icon} size={21} /><strong>{n}</strong><small>{label}</small></section>)}</div><div className="staff-report-grid"><section className="card staff-panel"><div className="staff-section-head"><div><h2>A week of showing up</h2><p>Practice, learning, and project contributions.</p></div><Badge color="mint">Last 7 days</Badge></div><div className="staff-week-chart">{days.map(d => <div key={d.key}><strong>{d.count}</strong><span style={{
              height: Math.max(3, d.count / max * 170)
            }} /><small>{d.label}</small></div>)}</div><p className="staff-chart-caption">Counts come from the selected students’ saved learning activity.</p></section><section className="card staff-panel"><div className="staff-section-head"><div><h2>Preparation, across the college</h2><p>A starting point for targeted support.</p></div><Icon name="Target" size={19} /></div><div className="staff-readiness-bands">{bands.map(b => <div key={b.name}><span className={'tone-' + b.color}><Icon name={b.color === 'mint' ? 'Sprout' : 'Circle'} size={18} /></span><div><strong>{b.name}</strong><Progress value={count ? b.count / count * 100 : 0} color={b.color} /></div><b>{b.count}</b></div>)}</div><p className="staff-chart-caption">Readiness reflects current preparation signals. It is not an employer assessment or a hiring decision.</p></section><section className="card staff-panel"><div className="staff-section-head"><div><h2>Where a workshop could help</h2><p>Average skill scores in your selected group.</p></div><Icon name="Lightbulb" size={19} /></div>{data.skills.map(({
          skill
        }) => {
          const value = count ? Math.round(students.reduce((n, s) => n + s.skills[skill], 0) / count) : 0;
          return <div className="staff-skill-bar" key={skill}><span>{skill}</span><Progress value={value} color={value >= 65 ? 'mint' : 'purple'} /><strong>{value}%</strong></div>;
        })}<Button variant="secondary" icon="Plus" onClick={() => setDialog({
          type: 'compose',
          kind: 'Assignment',
          studentIds: students.map(s => s.id)
        })}>Create targeted practice</Button></section><section className="card staff-panel"><div className="staff-section-head"><div><h2>Work, from assignment to review</h2><p>Published work and its submission progress.</p></div><Icon name="NotebookPen" size={19} /></div>{work.length ? work.map(i => {
          const deliveries = i.deliveries.filter(d => students.some(s => s.id === d.studentId)),
            submitted = deliveries.filter(d => ['submitted', 'graded'].includes(d.status)).length;
          return <button className="staff-report-assignment" key={i.id} onClick={() => setDialog({
            type: 'item',
            id: i.id
          })}><div><strong>{i.title}</strong><span>{submitted}/{deliveries.length} submitted</span></div><Progress value={deliveries.length ? submitted / deliveries.length * 100 : 0} color="mint" /></button>;
        }) : <p className="staff-small-empty">Published assignments will show their progress here.</p>}</section></div><section className="card staff-panel staff-audit-panel"><div className="staff-section-head"><div><h2>A record of useful actions</h2><p>Who shared, reviewed, and moved things forward.</p></div><Badge color="gray">College activity log</Badge></div><div className="staff-table-scroll"><table className="staff-audit-table"><thead><tr><th>Action</th><th>Details</th><th>By</th><th>Recipients</th><th>When</th></tr></thead><tbody>{data.audit.slice(0, 15).map(a => <tr key={a.id}><td><Badge color={a.action.includes('review') ? 'mint' : 'purple'}>{a.action.replaceAll('.', ' ')}</Badge></td><td>{a.title}</td><td>{a.actor}</td><td>{a.recipients || '—'}</td><td>{new Date(a.time).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: 'numeric',
                  minute: '2-digit'
                })}</td></tr>)}</tbody></table></div></section></>;
}
