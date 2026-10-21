import { matchesPracticeProblem } from '../../shared/practice-roles.js';
import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Button, Badge, Empty } from './ui.jsx';
export default function TrustedPractice({
  scope
} = {}) {
  const {
      state,
      request,
      refresh
    } = useStore(),
    [info, setInfo] = useState(null),
    [id, setId] = useState('two-sum'),
    [language, setLanguage] = useState('javascript'),
    [code, setCode] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [result, setResult] = useState(null);
  const saved = useRef('');
  useEffect(() => {
    fetch('/api/judge/status').then(r => r.json()).then(setInfo).catch(e => setError(e.message));
  }, []);
  useEffect(() => {
    const value = state.judgeDrafts?.[id + ':' + language]?.code || '';
    setCode(value);
    saved.current = value;
    setResult(null);
  }, [id, language]);
  useEffect(() => {
    if (!code.trim() || code === saved.current) return;
    const timer = setTimeout(() => request('/api/judge/draft', {
      id,
      language,
      code
    }).then(() => {
      saved.current = code;
    }).catch(e => setError(e.message)), 700);
    return () => clearTimeout(timer);
  }, [code, id, language]);
  const bank = (info?.bank || []).filter(p => !scope || matchesPracticeProblem(state.catalog.problems.find(q => q.id === p.id) || {
    ...p,
    topics: ['Array']
  }, scope));
  useEffect(() => {
    if (bank.length && !bank.some(p => p.id === id)) setId(bank[0].id);
  }, [scope?.roleId, scope?.level, scope?.focus, info]);
  const problem = bank.find(p => p.id === id);
  return <section className="card form-stack"><div className="section-head"><div><h2>Trusted coding practice</h2><p>Six bounded exercises · four language contracts · saved drafts and submission history.</p></div><Badge color={info?.configured ? 'mint' : 'gray'}>{info?.configured ? 'Runner configured' : 'Runner connection needed'}</Badge></div>{!info?.configured && <p>Connect the isolated code runner in server settings to execute Python, Java, C++ and JavaScript. The Assessment lab and browser JavaScript editor are available now.</p>}{!bank.length && info && <Empty title="No matching server exercises." description="Explore the SQL labs and role quizzes, or choose All practice." />}<div className="staff-form-two"><label>Problem<select value={id} onChange={e => setId(e.target.value)}>{bank.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label><label>Language<select value={language} onChange={e => setLanguage(e.target.value)}>{info?.languages?.map(l => <option key={l}>{l}</option>)}</select></label></div>{problem && <><h3>{problem.title}</h3><p>{problem.description}</p><p>Implement <code>{problem.functionName}</code>. Arguments and return values use the runner’s JSON value contract.</p><details><summary>Examples</summary><pre>{JSON.stringify(problem.tests, null, 2)}</pre></details></>}<label>Your solution<textarea className="code-editor" rows={16} value={code} onChange={e => setCode(e.target.value)} spellCheck={false} /></label>{error && <p role="alert">{error}</p>}<Button disabled={busy || !info?.configured || !problem || !code.trim()} onClick={async () => {
      setBusy(true);
      setError('');
      try {
        setResult(await request('/api/judge/run', {
          id,
          language,
          code
        }));
        await refresh();
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    }}>{busy ? 'Running in isolated service…' : 'Run server checks'}</Button>{result && <section><h3>{result.score}% · {result.verification}</h3>{result.checks.map(c => <p key={c.name}>{c.passed ? '✓' : '×'} {c.name} {c.error}</p>)}<p>{result.durationMs ?? '—'} ms · {result.memoryKb ?? '—'} KB</p></section>}<h3>Saved submissions</h3>{state.judgeRuns?.length ? state.judgeRuns.toReversed().map(r => <p key={r.id}>{r.resourceId} · {r.language} · {r.score}% · {new Date(r.time).toLocaleString()}</p>) : <Empty title="Your first server run will appear here." />}</section>;
}
