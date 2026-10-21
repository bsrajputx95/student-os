import { matchesPracticeLab, matchesPracticeQuiz } from '../../shared/practice-roles.js';
import { runPracticeCode } from '../lib/practice-runner.js';
import React, { useState, useEffect, useRef } from 'react';
import { useStore, navigate } from '../lib/store.jsx';
import { Button, Icon, Badge, Empty } from '../components/ui.jsx';
import { assessmentLabs, projectFiles, sqlSchema } from '../../shared/assessments.js';
import { zipFiles } from '../../shared/zip.js';
const stamp = t => new Date(t).toLocaleDateString('en-IN', {
  day: 'numeric',
  month: 'short'
});
function download(files, name) {
  const url = URL.createObjectURL(new Blob([zipFiles(files)], {
      type: 'application/zip'
    })),
    a = document.createElement('a');
  a.href = url;
  a.download = name + '.zip';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function AssessmentLab({
  scope
} = {}) {
  const {
    state,
    setModal
  } = useStore();
  const params = new URLSearchParams(location.search),
    [selected, setSelected] = useState(params.get('lab')),
    [filter, setFilter] = useState('All formats'),
    [search, setSearch] = useState('');
  useEffect(() => setSelected(new URLSearchParams(location.search).get('lab')), [location.search]);
  const lab = assessmentLabs.find(l => l.id === selected),
    attempts = (state.assessmentAttempts || []).filter(a => !scope || assessmentLabs.some(l => l.id === a.labId && matchesPracticeLab(l, scope))),
    passed = new Set(attempts.filter(a => a.passed).map(a => a.labId));
  if (lab) return <LabWorkspace key={lab.id} lab={lab} onBack={() => {
    setSelected(null);
    navigate('/practice?tab=assessments');
  }} />;
  return <><section className="assessment-hero"><div><Badge color="glass">THE ASSESSMENT LAB</Badge><h2>Less memorising.<br />More figuring it out.</h2><p>Step into a broken project. Follow the evidence. Fix the cause. Prove it with a test.</p><div><span><Icon name="Download" size={15} />Real starter ZIPs</span><span><Icon name="Database" size={15} />Executable SQL</span><span><Icon name="Clock3" size={15} />Timed attempts</span></div></div><div className="incident-terminal" aria-hidden="true"><header><i /><i /><i /><span>checkout / incident-042</span></header><p><b>FAIL</b> webhook_replay.test.js</p><code>expected: balance = 1,250<br />received: balance = 1,500</code><span>→ Find the duplicate. Fix the invariant.</span><footer><span>5 production-style projects</span><strong>11 hands-on labs ↗</strong></footer></div></section><div className="assessment-metrics"><div><strong>{passed.size}<small> / {assessmentLabs.length}</small></strong><span>labs passed</span></div><div><strong>{attempts.length}</strong><span>saved attempts</span></div><div><strong>6</strong><span>SQL datasets & edge cases</span></div><div><strong>32</strong><span>new core-CS & aptitude questions</span></div></div><div className="assessment-filterbar"><div>{['All formats', 'Project debugging', 'SQL', 'Core tests', 'History'].map(f => <button className={filter === f ? 'active' : ''} key={f} onClick={() => setFilter(f)}>{f}</button>)}</div><label><Icon name="Search" size={16} /><input aria-label="Search assessment labs" value={search} onChange={e => setSearch(e.target.value)} placeholder="Payments, SQL, reliability…" /></label></div>{filter === 'History' ? <div className="card lab-history"><h2>Your assessment log</h2>{attempts.length ? attempts.toReversed().map(a => <button key={a.id} onClick={() => {
        setSelected(a.labId);
        navigate('/practice?tab=assessments&lab=' + a.labId);
      }}><span className={'lab-history-score ' + (a.passed ? 'passed' : '')}>{a.score}%</span><span><strong>{a.title}</strong><small>{stamp(a.time)} · {a.mode} · {a.verification}</small></span><Icon name="ArrowUpRight" size={16} /></button>) : <Empty title="Your first attempt starts here." description="Run a lab, then submit it to save its result and connect it to your progress." />}</div> : filter === 'Core tests' ? <div className="assessment-grid">{state.catalog.quizzes.filter(q => ['Core CS', 'Code output', 'Aptitude', 'Role check'].includes(q.label) && (!scope || matchesPracticeQuiz(q, scope))).map(q => <article className="card assessment-card" key={q.id}><span className="lab-card-icon"><Icon name={q.topic === 'Databases' ? 'Database' : 'Brain'} size={22} /></span><Badge color="blue">{q.label}</Badge><h3>{q.title}</h3><p>{q.questions.length} original questions, scored on the server, with explanations after submission.</p><footer><span>{q.topic}</span><Button variant="secondary" onClick={() => setModal({
            type: 'quiz',
            id: q.id
          })}>Take the test<Icon name="ArrowUpRight" size={14} /></Button></footer></article>)}</div> : <div className="assessment-grid">{assessmentLabs.filter(l => (!scope || matchesPracticeLab(l, scope)) && (filter === 'All formats' || l.type === filter) && [l.title, l.focus, l.objective].join(' ').toLowerCase().includes(search.toLowerCase())).map((l, i) => <article className={'card assessment-card ' + (passed.has(l.id) ? 'lab-passed' : '')} key={l.id}><div className="lab-card-top"><span className={'lab-card-icon ' + (l.type === 'SQL' ? 'sql' : '')}><Icon name={l.type === 'SQL' ? 'Database' : 'Braces'} size={23} /></span><Badge color={passed.has(l.id) ? 'mint' : l.difficulty === 'Advanced' ? 'peach' : 'purple'}>{passed.has(l.id) ? 'Passed' : l.difficulty}</Badge></div><small>{l.type} · {l.focus}</small><h3>{l.title}</h3><p>{l.incident || l.objective}</p><footer><span><Icon name="Clock3" size={14} />{l.minutes} min</span><Button variant="secondary" onClick={() => {
            setSelected(l.id);
            navigate('/practice?tab=assessments&lab=' + l.id);
          }}>Open workspace<Icon name="ArrowUpRight" size={14} /></Button></footer></article>)}</div>}{scope && !assessmentLabs.some(l => matchesPracticeLab(l, scope)) && filter !== 'Core tests' && filter !== 'History' && <Empty title="Try a role scenario or a broader level." description="The role quizzes and interview tab cover this profile. Choose All practice to explore every hands-on lab." />}<div className="lab-format-note"><Icon name="Info" size={17} /><p>Original StudentOS practice, inspired by common assessment formats. SQL is checked on fresh server datasets. Project checks run in your browser and are recorded as practice evidence. These are not copied HackerRank or HackerEarth questions.</p></div></>;
}
function LabWorkspace({
  lab,
  onBack
}) {
  const {
    state,
    act,
    request,
    refresh,
    toast
  } = useStore();
  const active = state.assessmentSessions?.toReversed().find(s => s.labId === lab.id && !s.submitted);
  const [code, setCode] = useState(state.assessmentDrafts?.[lab.id]?.code || (lab.type === 'SQL' ? '-- Write your SQLite SELECT query here\nSELECT * FROM ' + (lab.id === 'department-ranking' ? 'employees' : lab.id === 'duplicate-events' ? 'webhook_events' : 'payments') + ';' : lab.starter)),
    [session, setSession] = useState(active || null),
    [mode, setMode] = useState(active?.mode || 'practice'),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState(null),
    [error, setError] = useState(''),
    [now, setNow] = useState(Date.now()),
    [view, setView] = useState(lab.file || 'query.sql'),
    [explanation, setExplanation] = useState(state.assessmentDrafts?.[lab.id]?.explanation || '');
  const worker = useRef(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(timer);
      worker.current?.terminate();
    };
  }, []);
  const expired = session?.deadline && now > session.deadline,
    remaining = session?.deadline ? Math.max(0, Math.ceil((session.deadline - now) / 1000)) : null,
    files = lab.type === 'SQL' ? null : projectFiles(lab, code),
    readonly = view !== (lab.file || 'query.sql');
  async function start() {
    setBusy(true);
    setError('');
    try {
      const r = await act('assessment.start', {
        id: lab.id,
        mode
      });
      setSession(r.session);
      setResult(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function browserChecks() {
    return runPracticeCode({
      code,
      fn: lab.fn,
      tests: lab.tests,
      immutable: true
    });
  }
  async function evaluate(submit = false) {
    setError('');
    setBusy(true);
    try {
      if (!session) throw new Error('Start a practice or timed attempt first.');
      if (expired) throw new Error('Time is up. Start a new attempt to continue.');
      if (submit && explanation.trim().length < 40) throw new Error('Add a short explanation of your approach before submitting (at least 40 characters).');
      let response;
      if (lab.type === 'SQL') response = await request('/api/labs/sql', {
        id: lab.id,
        sessionId: session.id,
        code,
        submit,
        explanation
      });else {
        const results = await browserChecks();
        response = await request('/api/labs/project', {
          id: lab.id,
          sessionId: session.id,
          code,
          results,
          submit,
          explanation
        });
      }
      setResult(response);
      await act('assessment.draft', {
        id: lab.id,
        code,
        explanation
      });
      if (submit) {
        await refresh();
        toast(response.score === 100 ? 'Lab passed. Your skills, activity, and matching daily task are updated.' : 'Attempt saved. Review the failed checks and try again.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <section className="lab-workspace"><header className="lab-workspace-title"><button onClick={onBack}><Icon name="ArrowLeft" size={17} />All assessments</button><div><Badge color={lab.type === 'SQL' ? 'mint' : 'purple'}>{lab.type}</Badge><span>{lab.focus}</span></div></header><div className="lab-workspace-head"><div><h1>{lab.title}</h1><p>{lab.difficulty} · {lab.minutes} minutes · {lab.skill}</p></div><div className="lab-session-controls">{session ? <><span className={'lab-clock ' + (expired ? 'expired' : '')}><Icon name="Clock3" size={16} />{remaining === null ? 'Practice · no time limit' : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')} remaining`}</span>{expired && <Button variant="secondary" onClick={start}>New attempt</Button>}</> : <><select aria-label="Assessment attempt mode" value={mode} onChange={e => setMode(e.target.value)}><option value="practice">Practice · no timer</option><option value="timed">Timed assessment</option></select><Button icon="Play" disabled={busy} onClick={start}>Start attempt</Button></>}</div></div><div className="lab-workbench"><aside className="card lab-brief"><Badge color="peach">{lab.type === 'SQL' ? 'DATA INVESTIGATION' : 'INCIDENT BRIEF'}</Badge>{lab.incident && <><h3>What happened?</h3><p>{lab.incident}</p></>}<h3>Your task</h3><p>{lab.objective}</p>{lab.acceptance && <><h3>Acceptance criteria</h3><ul>{lab.acceptance.map(a => <li key={a}>{a}</li>)}</ul></>}<details><summary><Icon name="Lightbulb" size={15} />Need a hint?</summary><p>{lab.hint}</p></details>{lab.type === 'SQL' ? <><h3>Visible database</h3><p className="lab-caption">SQLite dialect. Three fresh datasets check your query. Mutations, attachments and recursive queries are disabled.</p>{Object.entries(sqlSchema).map(([name, t]) => <details className="lab-schema" key={name}><summary>{name}<span>{t.rows.length} rows</span></summary><div className="table-scroll"><table><thead><tr>{t.columns.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{t.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{String(c)}</td>)}</tr>)}</tbody></table></div></details>)}</> : <><h3>Work in your own editor</h3><p>Download, unzip, edit <code>{lab.file}</code>, and run <code>npm test</code>. Node 22+; no packages or payment credentials needed.</p><a className="btn btn-secondary" href={'/assessment-kits/' + lab.id + '.zip'} download><Icon name="Download" size={15} />Starter project ZIP</a><Button variant="ghost" icon="Download" onClick={() => download(projectFiles(lab, code), lab.id + '-my-work')}>Download my work</Button></>}<p className="lab-caption">{lab.type === 'SQL' ? 'SQL is executed in a disposable, time-limited server process.' : 'Project tests are visible browser checks for self-directed practice; they are not a verified hiring assessment.'}</p></aside><section className="card lab-editor"><div className="lab-file-tabs">{lab.type === 'SQL' ? <span><Icon name="Database" size={14} />query.sql</span> : Object.keys(files).map(f => <button className={view === f ? 'active' : ''} key={f} onClick={() => setView(f)}>{f}</button>)}</div><textarea className="lab-code" aria-label={lab.type === 'SQL' ? 'SQL assessment query' : 'Project assessment code'} spellCheck={false} readOnly={readonly} value={readonly ? files[view] : code} onChange={e => {
          setCode(e.target.value);
          setResult(null);
        }} /><div className="lab-editor-actions"><small>{code.length}/12,000 · {readonly ? 'Reference file' : 'Editable solution'}</small><Button variant="ghost" disabled={busy} onClick={() => act('assessment.draft', {
            id: lab.id,
            code,
            explanation
          }, 'Draft saved.').catch(() => {})}>Save draft</Button><Button variant="secondary" icon="Play" disabled={!session || busy || expired} onClick={() => evaluate(false)}>{busy ? 'Checking…' : 'Run checks'}</Button></div><div className="lab-results"><div><strong>Test results</strong>{result && <Badge color={result.score === 100 ? 'mint' : 'peach'}>{result.score}% passed{result.saved ? ' · saved' : ''}</Badge>}</div>{error && <p className="error-text" role="alert">{error}</p>}{!result && !error && <p>Start an attempt, inspect the project or schema, then run your solution. The supplied project starter intentionally contains bugs.</p>}{result?.checks.map(c => <div className={'lab-check ' + (c.passed ? 'pass' : 'fail')} key={c.name}><Icon name={c.passed ? 'CircleCheck' : 'X'} size={16} />{c.name}<span>{c.passed ? 'Passed' : 'Needs work'}</span></div>)}{result?.rows && <div className="table-scroll lab-query-result"><table><thead><tr>{Object.keys(result.rows[0] || {}).map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{result.rows.map((r, i) => <tr key={i}>{Object.values(r).map((v, j) => <td key={j}>{String(v ?? 'NULL')}</td>)}</tr>)}</tbody></table>{!result.rows.length && <p>No rows returned.</p>}</div>}</div><form className="lab-submit" onSubmit={e => {
          e.preventDefault();
          evaluate(true);
        }}><label>Explain your fix or query<textarea aria-label="Assessment explanation" value={explanation} onChange={e => setExplanation(e.target.value)} rows={3} maxLength={2000} placeholder="What was wrong? Why does this approach work? Which edge case did you check?" /></label><footer><small>Submit saves this attempt. A first pass earns 80 XP and records its verification level and updates today’s matching task.</small><Button type="submit" icon="Check" disabled={!session || busy || expired}>Submit attempt</Button></footer></form></section></div></section>;
}
