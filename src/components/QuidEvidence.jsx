import React, { useState } from 'react';
import { csvExport } from '../../shared/staff.js';
import { Icon } from './ui.jsx';
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g).map((part, i) => part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part.startsWith('*') ? <em key={i}>{part.slice(1, -1)}</em> : part.startsWith('`') ? <code key={i}>{part.slice(1, -1)}</code> : part);
}
export function AnswerText({
  text = ''
}) {
  const blocks = [];
  let block;
  const flush = () => {
    if (block) blocks.push(block);
    block = null;
  };
  for (const line of text.split('\n')) {
    if (!line.trim()) {
      flush();
      continue;
    }
    const kind = /^\s*[-*]\s+/.test(line) ? 'ul' : /^\s*\d+[.)]\s+/.test(line) ? 'ol' : 'p';
    if (block?.kind !== kind) {
      flush();
      block = {
        kind,
        lines: []
      };
    }
    block.lines.push(line.replace(kind === 'ul' ? /^\s*[-*]\s+/ : kind === 'ol' ? /^\s*\d+[.)]\s+/ : /^#{1,4}\s+/, ''));
  }
  flush();
  return <div className="quid-answer">{blocks.map((b, i) => b.kind === 'p' ? <p key={i}>{inline(b.lines.join('\n'))}</p> : React.createElement(b.kind, {
      key: i
    }, b.lines.map((line, j) => <li key={j}>{inline(line)}</li>)))}</div>;
}
export function AcademicReport({
  report,
  onStudent
}) {
  const [limit, setLimit] = useState(8),
    [query, setQuery] = useState('');
  const rows = report.rows.filter(r => [r.name, r.handle, r.department].join(' ').toLowerCase().includes(query.toLowerCase()));
  function download() {
    const csv = csvExport([['Name', 'Username', 'Year', 'Department', 'Track', 'Metric', 'Score', 'Source', 'Checks', 'Last check', 'Overdue', 'Active days (7)'], ...report.rows.map(r => [r.name, r.handle, r.year, r.department, r.track, r.label, r.score, r.illustrative ? 'Sample history' : 'Scored academic evidence', r.evidence?.checks ?? '', r.evidence?.lastCheckedAt || '', r.overdue, r.active7])]);
    const url = URL.createObjectURL(new Blob([csv], {
      type: 'text/csv;charset=utf-8'
    }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'studentos-academic-review.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
  return <section className="quid-report" aria-label={report.title}><header><div><small>CALCULATED FROM COLLEGE RECORDS</small><h4>{report.title}</h4></div><button aria-label="Download matching students as CSV" title="Download matching students as CSV" onClick={download}><Icon name="Download" size={16} /></button></header><div className="quid-report-total"><strong>{report.matched}</strong><span>matching students<small>of {report.population} in this view · {report.total} college records</small></span></div><div className="quid-report-filters">{report.filters.map(f => <span key={f}>{f}</span>)}</div>{report.unassessed > 0 && <p>{report.unassessed} {report.unassessed === 1 ? 'student has' : 'students have'} no scored evidence in {report.skill}; excluded from this ranking.</p>}<label className="quid-report-search"><Icon name="Search" size={14} /><input aria-label="Search matching students" placeholder="Find a name in these results…" value={query} onChange={e => {
        setQuery(e.target.value);
        setLimit(8);
      }} /></label><div className="quid-student-results">{rows.slice(0, limit).map(r => <button key={r.id} onClick={() => onStudent(r)} aria-label={'Review support for ' + r.name}><span><strong>{r.name}</strong><small>Year {r.year} · @{r.handle}</small><small>{r.illustrative ? 'Sample campus history' : r.evidence?.checks ? r.evidence.checks + ' scored checks' : 'Recorded academic evidence'}</small></span><span className={'quid-score ' + (r.score < 50 ? 'needs-support' : '')}><strong>{r.score}<small>/100</small></strong><small>{r.label}</small></span><Icon name="ArrowUpRight" size={14} /></button>)}</div>{!rows.length && <p>No matching student records.</p>}{rows.length > limit && <button className="quid-show-more" onClick={() => setLimit(n => n + 12)}>Show more · {Math.min(limit, rows.length)} of {rows.length}<Icon name="ChevronRight" size={13} /></button>}<p className="quid-report-note">{report.interpretation}</p><small className="quid-report-date">As of {new Date(report.asOf).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })}{report.limited ? ` · First ${report.rows.length.toLocaleString()} matches available` : ''}</small></section>;
}
export function SupportPlan({
  plan
}) {
  return <details className="quid-support" open><summary><Icon name="Compass" size={17} /><span>{plan.title}</span><Icon name="ChevronRight" size={14} /></summary><div className="quid-support-body">{plan.strengths.length > 0 && <p><strong>Recorded strengths</strong> {plan.strengths.map(s => s.skill + ' ' + s.score + '/100').join(' · ')}</p>}{plan.assessmentSignals.length > 0 && <div className="quid-assessment-signals"><strong>Lower scored attempts to review</strong>{plan.assessmentSignals.map((a, i) => <p key={i}>{a.title} · {a.score}/100<small>{(a.date || '').slice(0, 10)} · {a.verification}</small></p>)}</div>}<ol>{plan.steps.map((s, i) => <li key={i}><strong>{s.when}</strong><p>{s.task}</p></li>)}</ol><small>{plan.note}</small></div></details>;
}
