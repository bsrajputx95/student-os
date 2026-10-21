import React, { useState } from 'react';
import { useStore, today, niceDate } from '../lib/store.jsx';
import { Button, Icon, Badge, Modal } from './ui.jsx';
import { defaultPlanDays, addDays, missionFor, calendarDay } from '../../shared/journey.js';
export function PlanSetup({
  close
}) {
  const {
    state,
    act
  } = useStore();
  const [days, setDays] = useState(state.profile.year === 4 ? 150 : defaultPlanDays(state.profile.year)),
    [date, setDate] = useState(''),
    [minutes, setMinutes] = useState(state.profile.dailyMinutes || 75),
    [weekly, setWeekly] = useState(state.profile.weeklyDays || 5),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const duration = date ? Math.floor((new Date(date + 'T12:00:00Z') - new Date(today() + 'T12:00:00Z')) / 86400000) + 1 : Number(days),
    plan = {
      startedAt: today(),
      totalDays: Math.max(7, duration || 150),
      restDays: []
    },
    studyDays = duration > 0 && duration <= 1460 ? Array.from({
      length: duration
    }, (_, i) => missionFor({
      ...state.profile,
      weeklyDays: Number(weekly)
    }, plan, i + 1, state.catalog)).filter(m => !m.rest).length : 0;
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await act('plan.configure', {
        ...(date ? {
          targetDate: date
        } : {
          days: Number(days)
        }),
        dailyMinutes: Number(minutes),
        weeklyDays: Number(weekly)
      }, 'Your preparation window is ready. Skills and achievements are retained.');
      close();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <Modal wide title="A serious plan. Built around your real deadline." subtitle="Start from today, choose a manageable weekly rhythm, and keep your existing skills and achievements." onClose={close}><form className="plan-setup" onSubmit={save}><section className="form-stack"><label>Preparation window<select aria-label="Preparation window" value={days} onChange={e => {
            setDays(Number(e.target.value));
            setDate('');
          }}>{[30, 60, 90, 150, 180, 365, 730, 1095, 1460].map(n => <option key={n} value={n}>{n} calendar days{n === 150 ? ' · recommended for a new final-year student' : ''}</option>)}</select></label><label>Or choose your target assessment / placement date<input aria-label="Preparation target date" type="date" min={addDays(today(), 6)} max={addDays(today(), 1459)} value={date} onChange={e => setDate(e.target.value)} /></label><div className="plan-form-two"><label>Focused minutes per day<select value={minutes} onChange={e => setMinutes(Number(e.target.value))}>{[30, 45, 60, 75, 90, 120, 150, 180].map(n => <option key={n} value={n}>{n} minutes</option>)}</select></label><label>Study days per week<select value={weekly} onChange={e => setWeekly(Number(e.target.value))}>{[3, 5, 6].map(n => <option key={n} value={n}>{n} days</option>)}</select></label></div><p className="quiet-note">This starts a new preparation plan at day 1. Today’s old task list is replaced; your XP, skills, solved problems, projects, assessment results, and previous plan summary are retained. Rest days are included in the deadline.</p>{error && <p className="error-text" role="alert">{error}</p>}<Button type="submit" disabled={busy || !studyDays} icon="Route">{busy ? 'Building your plan…' : 'Build my preparation plan'}</Button></section><aside className="plan-preview"><Badge color="mint">YOUR PREPARATION WINDOW</Badge><strong>{duration > 0 ? duration : '—'}<small>calendar days</small></strong><div><span>{studyDays} study days</span><span>{Math.max(0, duration - studyDays)} recovery days</span></div><p>{Math.round(studyDays * minutes / 60)} focused hours, paced across eight stages. DSA, practical SQL, project debugging, core-CS tests, portfolio work, and interview practice.</p><ol>{['Build or refresh foundations', 'Practise patterns and core-CS concepts', 'Debug projects and investigate data', 'Review, simulate, and prepare to apply'].map(t => <li key={t}>{t}</li>)}</ol><small>Advanced students get revision prompts for completed material. Year 1–3 students also get event exploration; year 4 participation stays optional.</small></aside></form></Modal>;
}
export function DailyReflection({
  id,
  close
}) {
  const {
      state,
      act
    } = useStore(),
    task = state.tasks.find(t => t.resourceId === id && t.kind === 'review' && t.date === today());
  const [form, setForm] = useState({
      explanation: '',
      example: '',
      risk: ''
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return <Modal title={task?.title || 'Review what you learned'} subtitle="Recall, apply, and test your understanding." onClose={close}><form className="form-stack" onSubmit={async e => {
      e.preventDefault();
      setBusy(true);
      try {
        await act('review.complete', {
          id,
          ...form
        }, 'Reflection saved. Your daily plan and skill history are updated.');
        close();
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    }}>{[['explanation', 'Explain the concept in your own words', 40], ['example', 'Give a concrete example or walk through a small case', 20], ['risk', 'What could go wrong? Name an edge case, test, or tradeoff', 20]].map(([key, label, min]) => <label key={key}>{label}<textarea aria-label={label} required minLength={min} maxLength={2000} rows={3} value={form[key]} onChange={e => setForm({
          ...form,
          [key]: e.target.value
        })} /></label>)}{error && <p className="error-text">{error}</p>}<Button type="submit" disabled={busy} icon="Check">Save reflection & complete</Button></form></Modal>;
}
