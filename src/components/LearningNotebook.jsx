import React, { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Button, Badge, Empty } from './ui.jsx';
export default function LearningNotebook() {
  const {
    state,
    act,
    setModal
  } = useStore();
  const [form, setForm] = useState({
      title: '',
      body: ''
    }),
    [query, setQuery] = useState(''),
    [error, setError] = useState('');
  async function save(e) {
    e.preventDefault();
    try {
      await act('learning.note', form, 'Note saved.');
      setForm({
        title: '',
        body: ''
      });
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }
  const notes = (state.learningNotes || []).filter(n => (n.title + ' ' + n.body).toLowerCase().includes(query.toLowerCase()));
  return <div className="notebook-layout"><section className="card notebook-editor"><h2>Your learning notebook</h2><p>Keep explanations, questions, and revision notes in your own words.</p><form className="form-stack" onSubmit={save}><label>Title<input required value={form.title} maxLength={140} onChange={e => setForm({
            ...form,
            title: e.target.value
          })} /></label><label>Note<textarea required rows={8} maxLength={5000} value={form.body} onChange={e => setForm({
            ...form,
            body: e.target.value
          })} /></label><Button type="submit">{form.noteId ? 'Save changes' : 'Save note'}</Button>{form.noteId && <Button variant="ghost" onClick={() => setForm({
          title: '',
          body: ''
        })}>New note</Button>}{error && <p role="alert" className="error-text">{error}</p>}</form><h3>Bookmarked lessons</h3>{state.bookmarks?.map(b => <Button key={b.resourceId} variant="ghost" onClick={() => setModal({
        type: 'course',
        id: b.courseId,
        lesson: b.lesson
      })}>{b.title}</Button>)}</section><section><label className="search-field"><input aria-label="Search learning notes" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your notes" /></label>{notes.map(note => <article className="card notebook-note" key={note.id}><Badge color="gray">{new Date(note.updatedAt).toLocaleDateString('en-IN')}</Badge><h3>{note.title}</h3><p>{note.body}</p><Button variant="ghost" onClick={() => setForm({
          title: note.title,
          body: note.body,
          noteId: note.id
        })}>Edit note</Button></article>)}{!notes.length && <Empty title="Make room for your own understanding." description="Your saved notes will appear here." />}</section></div>;
}
