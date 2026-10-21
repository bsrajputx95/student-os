import React, { useEffect, useRef, useState } from 'react';
import { useStore, niceDate } from '../lib/store.jsx';
import { Button, Badge, Modal, Empty, Progress } from './ui.jsx';
import { sqlSchema } from '../../shared/assessments.js';
import { can } from '../../shared/permissions.js';
export default function CollegeChallenges({
  scope
} = {}) {
  const {
      state,
      request,
      refresh
    } = useStore(),
    [items, setItems] = useState([]),
    [error, setError] = useState(''),
    [session, setSession] = useState(null),
    [labs, setLabs] = useState([]),
    [answers, setAnswers] = useState([]),
    [sql, setSql] = useState([]),
    [board, setBoard] = useState(null),
    [busy, setBusy] = useState(false),
    [create, setCreate] = useState(false),
    [now, setNow] = useState(Date.now());
  const changed = useRef(false);
  const load = () => fetch('/api/challenges').then(r => r.json()).then(r => {
    if (r.error) throw new Error(r.error);
    setItems(r.challenges);
  }).catch(e => setError(e.message));
  useEffect(() => {
    load();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  async function act(type, p) {
    setBusy(true);
    setError('');
    try {
      const r = await request('/api/challenges/' + type, p);
      if (r.session) {
        setSession(r.session);
        setAnswers(r.session.answers || []);
        setSql(r.session.sql || []);
        if (type === 'start') {
          const v = await request('/api/challenges/view', {
            sessionId: r.session.id
          });
          setLabs(v.labs || []);
        } else if (r.labs) setLabs(r.labs);
      }
      await load();
      if (type === 'submit' || r.session?.status === 'submitted') await refresh();
      return r;
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!session || session.status !== 'queued') return;
    const timer = setInterval(() => act('view', {
      sessionId: session.id
    }), 2000);
    return () => clearInterval(timer);
  }, [session?.id, session?.status]);
  useEffect(() => {
    if (!changed.current || session?.status !== 'active') return;
    const timer = setTimeout(() => request('/api/challenges/draft', {
      sessionId: session.id,
      answers,
      sql
    }).then(() => {
      changed.current = false;
    }).catch(e => setError(e.message)), 700);
    return () => clearTimeout(timer);
  }, [answers, sql, session?.id]);
  async function scoreboard(c) {
    try {
      const r = await fetch('/api/challenges/leaderboard?id=' + encodeURIComponent(c.id)).then(r => r.json());
      if (r.error) throw new Error(r.error);
      setBoard({
        title: c.title,
        rows: r.rows
      });
    } catch (e) {
      setError(e.message);
    }
  }
  return <><div className="section-head"><div><h2>One campus. A daily challenge.</h2><p>Timed, server-scored questions and SQL. Saved attempts and a college scoreboard.</p></div>{can(state.profile, 'content.publish') && <Button onClick={() => setCreate(true)}>Create challenge</Button>}</div>{error && <p role="alert" className="error-text">{error}</p>}<div className="quiz-grid">{items.filter(c => !scope || scope.all || !c.roleIds?.length || c.roleIds.includes(scope.role.id)).map(c => {
        const open = now >= c.startsAt && now < c.endsAt,
          attempt = c.attempts.at(-1);
        return <section className="card quiz-card" key={c.id}><Badge color={open ? 'mint' : 'gray'}>{open ? 'Open' : now < c.startsAt ? 'Upcoming' : 'Closed'}</Badge><h3>{c.title}</h3><p>{c.description}</p><small>{c.questionCount} questions · {c.sqlCount} SQL labs · {c.duration} min · Years {c.years.join(', ')}</small><p>Closes {new Date(c.endsAt).toLocaleString('en-IN')}</p>{attempt && <p>{attempt.status} {attempt.score !== null && `· ${attempt.score}%`}</p>}<div className="row-actions">{state.profile.role === 'student' && <Button disabled={busy || !attempt && !open} onClick={() => attempt ? act('view', {
              sessionId: attempt.id
            }) : act('start', {
              id: c.id
            })}>{attempt ? 'View attempt' : 'Join challenge'}</Button>}<Button variant="secondary" onClick={() => scoreboard(c)}>Scoreboard</Button></div></section>;
      })}{!items.length && <Empty title="No college challenges published yet." description="Your college can publish a timed assessment here." />}</div>
  {session && <Modal title="Campus challenge" subtitle={session.status === 'active' ? Math.max(0, Math.ceil(Math.min(session.deadline - now, session.deadline - session.startedAt) / 60000)) + ' minutes left · drafts save automatically' : session.status} onClose={() => setSession(null)} wide>{session.status === 'active' ? <><Progress value={(now - session.startedAt) / (session.deadline - session.startedAt) * 100} />{session.questions.map((q, i) => <fieldset className="challenge-question" key={i}><legend>{i + 1}. {q.text}</legend>{q.options.map((o, j) => <label key={j}><input type="radio" name={'challenge-' + i} checked={answers[i] === j} onChange={() => {
              changed.current = true;
              setAnswers(a => Array.from({
                length: session.questions.length
              }, (_, k) => k === i ? j : a[k] ?? null));
            }} />{o}</label>)}</fieldset>)}{labs.length > 0 && <details><summary>Database schema</summary><pre>{Object.entries(sqlSchema).map(([name, t]) => name + ' (' + t.columns.join(', ') + ')').join('\n')}</pre></details>}{labs.map((l, i) => <section key={l.id}><h3>{l.title}</h3><p>{l.objective}</p><textarea className="code-editor" aria-label={l.title + ' query'} value={sql[i] || ''} onChange={e => {
            changed.current = true;
            setSql(a => labs.map((_, j) => j === i ? e.target.value : a[j] || ''));
          }} /></section>)}<Button disabled={busy || now > session.deadline} onClick={() => act('submit', {
          sessionId: session.id,
          answers,
          sql
        })}>Submit for grading</Button></> : session.status === 'queued' ? <p role="status">Your submission is saved. Server checks are running; you can return later.</p> : <><h2>{session.score !== null ? session.score + '%' : 'Attempt expired'}</h2><p>{session.feedback ? 'The challenge has closed. Review your answers below.' : 'Question feedback will unlock when the college challenge closes.'}</p>{session.feedback?.map((f, i) => <section className="card" key={i}><h3>{f.text} · {f.score}%</h3>{session.questions[i]?.explanation && <p>{session.questions[i].explanation}</p>}{f.error && <p>{f.error}</p>}</section>)}</>}</Modal>}
  {board && <Modal title={board.title} subtitle="Best submitted score per student · time breaks ties" onClose={() => setBoard(null)}><div className="table-scroll"><table><thead><tr><th>Rank</th><th>Student</th><th>Year</th><th>Score</th><th>Time</th></tr></thead><tbody>{board.rows.map(r => <tr key={r.handle}><td>{r.rank}</td><td>{r.name}<small>@{r.handle}</small></td><td>{r.year}</td><td>{r.score}%</td><td>{r.seconds}s</td></tr>)}</tbody></table></div>{!board.rows.length && <p>No graded submissions yet.</p>}</Modal>}
  {create && <ChallengeForm close={() => {
      setCreate(false);
      load();
    }} />}</>;
}
function ChallengeForm({
  close
}) {
  const {
      request,
      state
    } = useStore(),
    [banks, setBanks] = useState(state.catalog.quizzes),
    [chosen, setChosen] = useState([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch('/api/staff').then(r => r.json()).then(d => setBanks([...(d.questionBanks || []), ...state.catalog.quizzes]));
  }, []);
  return <Modal title="Publish a college challenge" onClose={close}><form className="form-stack" onSubmit={async e => {
      e.preventDefault();
      setBusy(true);
      try {
        const f = new FormData(e.currentTarget);
        await request('/api/challenges/create', {
          title: f.get('title'),
          description: f.get('description'),
          startsAt: new Date(f.get('startsAt')).toISOString(),
          endsAt: new Date(f.get('endsAt')).toISOString(),
          duration: Number(f.get('duration')),
          maxAttempts: Number(f.get('maxAttempts')),
          years: f.getAll('year').map(Number),
          quizIds: chosen,
          sqlIds: f.getAll('sql')
        });
        close();
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    }}><label>Title<input name="title" required minLength={4} /></label><label>Instructions<textarea name="description" /></label><label>Opens<input type="datetime-local" name="startsAt" required /></label><label>Closes<input type="datetime-local" name="endsAt" required /></label><label>Minutes<input type="number" name="duration" defaultValue={30} min={5} max={180} /></label><label>Attempts<input type="number" name="maxAttempts" defaultValue={1} min={1} max={3} /></label><fieldset><legend>Student years</legend>{[1, 2, 3, 4].map(y => <label key={y}><input type="checkbox" name="year" value={y} defaultChecked />Year {y}</label>)}</fieldset><fieldset><legend>Question banks (up to 100 questions)</legend>{banks.map(b => <label key={b.id}><input type="checkbox" checked={chosen.includes(b.id)} onChange={() => setChosen(a => a.includes(b.id) ? a.filter(x => x !== b.id) : [...a, b.id])} />{b.title}</label>)}</fieldset><fieldset><legend>SQL lab</legend>{['duplicate-events', 'unpaid-orders', 'latest-payment', 'net-revenue', 'department-ranking'].map(id => <label key={id}><input type="checkbox" name="sql" value={id} />{id.replaceAll('-', ' ')}</label>)}</fieldset>{error && <p role="alert">{error}</p>}<Button type="submit" disabled={busy}>Publish challenge</Button></form></Modal>;
}
