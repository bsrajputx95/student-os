import React, { useEffect, useRef, useState } from 'react';
import { useStore, navigate } from '../lib/store.jsx';
import { Button, Badge, Icon, Modal, CourseArt } from './ui.jsx';
import { lessonNames } from '../../shared/paths.js';
export default function CoursePlayer({
  id,
  initialLesson,
  close
}) {
  const {
      state,
      act,
      setAssistant
    } = useStore(),
    course = state.catalog.courses.find(c => c.id === id);
  const [index, setIndex] = useState(Math.max(0, Math.min(initialLesson ?? state.courseProgress[id] ?? 0, (course?.lessons || 1) - 1))),
    [content, setContent] = useState(null),
    [answer, setAnswer] = useState(null),
    [reflection, setReflection] = useState(''),
    [result, setResult] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [video, setVideo] = useState(false);
  const saved = useRef('');
  useEffect(() => {
    const controller = new AbortController();
    setContent(null);
    setResult(null);
    setError('');
    fetch(`/api/lessons/${id}/${index}`, {
      signal: controller.signal
    }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setContent(data);
      const draft = state.lessonDrafts?.[data.id];
      setAnswer(draft?.answer ?? null);
      setReflection(draft?.reflection || '');
      saved.current = JSON.stringify([draft?.answer ?? null, draft?.reflection || '']);
    }).catch(e => {
      if (e.name !== 'AbortError') setError(e.message);
    });
    return () => controller.abort();
  }, [id, index]);
  useEffect(() => {
    if (!content || result || JSON.stringify([answer, reflection]) === saved.current) return;
    const timer = setTimeout(() => {
      act('lesson.draft', {
        id,
        lesson: index,
        answer,
        reflection
      }).then(() => {
        saved.current = JSON.stringify([answer, reflection]);
      }).catch(e => setError(e.message));
    }, 600);
    return () => clearTimeout(timer);
  }, [content?.id, answer, reflection, result, act]);
  if (!course) return <Modal title="Course unavailable" onClose={close}><p>Choose a course from your learning library.</p></Modal>;
  const done = index < (state.courseBaseProgress?.[id] ?? 0) || (state.lessonCompletions[id] || []).includes(index),
    bookmarked = state.bookmarks?.some(b => b.resourceId === `${id}:${index}`);
  async function submit() {
    setBusy(true);
    setError('');
    try {
      const checked = await act('course.complete', {
        id,
        lesson: index,
        answer,
        reflection
      });
      setResult(checked);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <Modal wide title={course.title} subtitle={`${state.courseProgress[id] || 0}/${course.lessons} lessons complete · Progress is saved`} onClose={close} className="course-modal"><div className="lesson-layout"><aside className="lesson-sidebar"><CourseArt type={id} small /><h4>YOUR LEARNING PATH</h4><div className="lesson-list">{Array.from({
            length: course.lessons
          }, (_, n) => <button key={n} className={index === n ? 'selected' : ''} onClick={() => setIndex(n)}><span>{n < (state.courseBaseProgress?.[id] ?? 0) || (state.lessonCompletions[id] || []).includes(n) ? <Icon name="Check" size={13} /> : String(n + 1).padStart(2, '0')}</span><div>{lessonNames[id]?.[n] || `Lesson ${n + 1}`}<small>Read · work through · explain</small></div></button>)}</div></aside><section className="lesson-content">{error && <p className="error-text" role="alert">{error}</p>}{!content ? <p role="status">Loading your lesson…</p> : <><div className="lesson-content-top"><Badge>LESSON {index + 1}</Badge><Button variant="ghost" icon={bookmarked ? 'BookmarkCheck' : 'Bookmark'} onClick={() => act('learning.bookmark', {
              id,
              lesson: index
            }).catch(e => setError(e.message))}>{bookmarked ? 'Bookmarked' : 'Bookmark'}</Button></div><h1>{content.title}</h1><p className="lesson-lead">{content.objective}</p><p className="lesson-reading">{content.reading}</p><h3>Work through this example</h3><pre className="lesson-code">{content.example}</pre><div className="lesson-callout"><Icon name="Lightbulb" size={21} /><p>Trace the example, then change one input. Predict what changes and identify a boundary or failure case.</p></div>{course.video && <><Button variant="secondary" icon="Play" onClick={() => setVideo(v => !v)}>{video ? 'Close companion video' : 'Watch companion course'}</Button>{video && <div className="video-lesson"><iframe src={`https://www.youtube-nocookie.com/embed/${course.video}`} title="Companion JavaScript course by freeCodeCamp" allow="encrypted-media; picture-in-picture" allowFullScreen /><p className="quiet-note">This full course complements the individual lesson; it is not a tracked lesson-specific video chapter.</p></div>}</>}<h3>Check your understanding</h3><p>{content.question}</p><div className="lesson-check-options">{content.options.map((option, n) => <label key={n}><input type="radio" name="lesson-check" checked={answer === n} onChange={() => {
                setAnswer(n);
                setResult(null);
              }} />{option}</label>)}</div><label className="lesson-reflection-label">Explain your reasoning and one example<textarea className="lesson-exercise" aria-label="Your lesson explanation" rows={4} value={reflection} maxLength={3000} onChange={e => {
              setReflection(e.target.value);
              setResult(null);
            }} placeholder="Explain why your answer follows from the example. Change an input or describe an edge case." /></label>{result && <div className={`lesson-feedback ${result.passed ? 'passed' : 'retry'}`} role="status"><strong>{result.passed ? 'Lesson checked and saved' : 'Review the explanation and try again'}</strong><p>{result.feedback}</p></div>}{done && !result && <Badge color="mint">Previously completed</Badge>}<div className="lesson-actions"><Button variant="secondary" icon="Sparkles" onClick={() => setAssistant({
              topic: `${content.title}: ${content.objective}`
            })}>Explain this topic</Button>{state.courseCertificates?.some(c => c.courseId === id) && <Button variant="secondary" icon="Award" onClick={() => {
              close();
              navigate('/learn?tab=certificates');
            }}>View course certificate</Button>}{done || result?.passed ? <Button disabled={index === course.lessons - 1} onClick={() => setIndex(n => n + 1)}>Next lesson</Button> : <Button disabled={busy || answer === null || reflection.trim().length < 20} onClick={submit}>{busy ? 'Checking…' : 'Check & complete lesson'}</Button>}</div><p className="quiet-note">Your draft saves automatically. This knowledge check is graded on the server; code execution is assessed separately in Practice.</p><a className="text-link" href={content.sourceUrl} target="_blank" rel="noreferrer">Further reading from the official learning resource<Icon name="ArrowUpRight" size={14} /></a></>}</section></div></Modal>;
}
