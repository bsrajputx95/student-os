import React, { useState } from 'react';
import { useStore, today } from '../lib/store.jsx';
import { Button, Badge } from '../components/ui.jsx';
import { csvExport } from '../../shared/staff.js';
export default function DateRangeReport() {
  const {
      request
    } = useStore(),
    [from, setFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)),
    [to, setTo] = useState(today()),
    [data, setData] = useState(null),
    [error, setError] = useState('');
  return <section className="card staff-panel"><h2>Evidence over a chosen period</h2><form className="row-actions" onSubmit={async e => {
      e.preventDefault();
      try {
        const r = await fetch('/api/staff/report?from=' + from + '&to=' + to);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setData(d);
        setError('');
      } catch (e) {
        setError(e.message);
      }
    }}><label>From<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label><label>To<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label><Button type="submit">Build report</Button></form>{error && <p role="alert">{error}</p>}{data && <><p>{data.students} students · {data.activity} activity records · {data.verifiedChecks} scored checks · {data.assessmentAverage ?? '—'}% average</p><table><thead><tr><th>Year</th><th>Students</th><th>Checks</th><th>Average</th></tr></thead><tbody>{data.cohorts.map(c => <tr key={c.year}><td>{c.year}</td><td>{c.students}</td><td>{c.verifiedChecks}</td><td>{c.score ?? '—'}%</td></tr>)}</tbody></table><p>Interventions: {data.interventions.created} opened · {data.interventions.resolved} resolved</p><div className="row-actions">{data.funnel.map(f => <Badge key={f.status}>{f.status}: {f.count}</Badge>)}</div><p>{data.explanation}</p><Button variant="secondary" onClick={() => {
        const content = csvExport([['Year', 'Students', 'Verified checks', 'Average score'], ...data.cohorts.map(c => [c.year, c.students, c.verifiedChecks, c.score])]),
          url = URL.createObjectURL(new Blob([content], {
            type: 'text/csv'
          })),
          a = document.createElement('a');
        a.href = url;
        a.download = 'studentos-period-report.csv';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}>Export this report</Button></>}</section>;
}
