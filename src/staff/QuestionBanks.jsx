import { useStore } from '../lib/store.jsx';
import { can } from '../../shared/permissions.js';
import React, { useState } from 'react';
import { useCampus } from './context.jsx';
import { Button, Badge, Icon, Empty } from '../components/ui.jsx';
const blank = () => ({
  text: '',
  options: ['', '', '', ''],
  correct: 0,
  explanation: ''
});
export default function QuestionBanks() {
  const {
    state
  } = useStore();
  const {
    data,
    mutate,
    setDialog
  } = useCampus();
  const [form, setForm] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const change = (key, value) => setForm(f => ({
    ...f,
    [key]: value
  }));
  function question(index, key, value) {
    setForm(f => ({
      ...f,
      questions: f.questions.map((q, i) => i === index ? {
        ...q,
        [key]: value
      } : q)
    }));
  }
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await mutate('quiz.save', form, 'Question bank version saved. Existing assignments keep their original questions.');
      setForm(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!can(state.profile, 'content.publish')) return <Empty title="Question authoring requires teaching access." description="Your support workspace can inspect academic progress and help students through Messages." />;
  if (form) return <section className="card bank-editor"><div className="section-head"><div><Badge color="purple">QUESTION BANK EDITOR</Badge><h2>{form.id ? 'Edit the next version' : 'Create an original assessment'}</h2><p>Each save creates a version. Answer keys stay on the server for student attempts.</p></div><Button variant="ghost" onClick={() => setForm(null)}>Back to question banks</Button></div><form className="form-stack" onSubmit={save}><label>Quiz title<input required minLength={3} maxLength={140} value={form.title} onChange={e => change('title', e.target.value)} /></label><div className="staff-form-two"><label>Topic<select value={form.topic} onChange={e => change('topic', e.target.value)}>{['DSA', 'Frontend', 'Backend', 'Databases', 'DevOps', 'Communication', 'Aptitude'].map(topic => <option key={topic}>{topic}</option>)}</select></label><label>Difficulty<select value={form.difficulty} onChange={e => change('difficulty', e.target.value)}>{['Foundation', 'Intermediate', 'Advanced'].map(level => <option key={level}>{level}</option>)}</select></label></div>{form.questions.map((q, index) => <fieldset className="bank-question" key={index}><legend>Question {index + 1}</legend><label>Question or scenario<textarea required minLength={5} maxLength={3000} rows={3} value={q.text} onChange={e => question(index, 'text', e.target.value)} /></label><div className="bank-options">{q.options.map((option, n) => <label key={n}>Choice {String.fromCharCode(65 + n)}<input required maxLength={1000} value={option} onChange={e => question(index, 'options', q.options.map((value, i) => i === n ? e.target.value : value))} /></label>)}</div><label>Correct choice<select value={q.correct} onChange={e => question(index, 'correct', Number(e.target.value))}>{q.options.map((_, n) => <option value={n} key={n}>Choice {String.fromCharCode(65 + n)}</option>)}</select></label><label>Explanation shown after practice<textarea required minLength={10} maxLength={2500} rows={3} value={q.explanation} onChange={e => question(index, 'explanation', e.target.value)} /></label><Button variant="ghost" disabled={form.questions.length === 1} onClick={() => change('questions', form.questions.filter((_, i) => i !== index))}>Remove this question</Button></fieldset>)}<div className="row-actions"><Button variant="secondary" icon="Plus" disabled={form.questions.length >= 100} onClick={() => change('questions', [...form.questions, blank()])}>Add question</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save question bank version'}</Button></div>{error && <p className="error-text" role="alert">{error}</p>}</form></section>;
  return <><div className="section-head"><div><h2>Your college question banks</h2><p>Build topic checks, aptitude sets, and scenario assessments with explanations.</p></div><Button icon="Plus" onClick={() => {
        setForm({
          title: '',
          topic: 'Databases',
          difficulty: 'Foundation',
          questions: [blank()]
        });
        setError('');
      }}>Create a quiz</Button></div><div className="quiz-grid">{data.questionBanks?.map(bank => <section className="card quiz-card" key={bank.id}><Badge>{bank.topic}</Badge><h3>{bank.title}</h3><p>{bank.questions.length} questions · {bank.difficulty} · version {bank.version}</p><small>By {bank.author}</small><div className="row-actions"><Button variant="secondary" onClick={() => {
            const copy = structuredClone(bank);
            if (bank.authorId !== state.profile.id && !can(state.profile, 'institution.manage')) {
              delete copy.id;
              copy.title += ' (copy)';
            }
            setForm(copy);
          }}>{bank.authorId === state.profile.id || can(state.profile, 'institution.manage') ? 'Edit next version' : 'Create my copy'}</Button><Button onClick={() => setDialog({
            type: 'compose',
            kind: 'Quiz',
            quizId: bank.id
          })}>Assign to students</Button></div></section>)}</div>{!data.questionBanks?.length && <Empty icon="ClipboardList" title="Your first college quiz starts here." description="The shared practice bank remains available when composing an assignment." />}</>;
}
