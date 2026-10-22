import SubjectArt from './SubjectArt.jsx';
import ProviderMark from './ProviderMark.jsx';
import React, { useState } from 'react';
import { useStore, navigate } from '../lib/store.jsx';
import { Badge, Button, Empty, Icon, Modal } from './ui.jsx';
import { coursePresentation, learningResources } from '../../shared/learning-library.js';
import { lessonNames } from '../../shared/paths.js';
import { learningVisuals } from '../../shared/learning-visuals.js';
export function CourseCover({
  courseId,
  preview = false
}) {
  const c = coursePresentation[courseId] || coursePresentation.javascript;
  const visual = learningVisuals[courseId] || learningVisuals.javascript;
  const [failed, setFailed] = useState(false);
  return <div className={`learning-cover editorial-cover cover-${courseId}`} style={{
    '--cover-color': c.color,
    '--cover-accent': visual.accent
  }} aria-hidden="true">
    {!failed && <img className="cover-photograph" src={`/learning/${visual.image}-640.webp`} srcSet={`/learning/${visual.image}-640.webp 640w, /learning/${visual.image}-1200.webp 1200w`} sizes="(max-width: 700px) 90vw, 32vw" width="640" height="400" loading="lazy" decoding="async" alt="" onError={() => setFailed(true)} />}
    <div className="cover-shade" /><div className="cover-top"><span>STUDENTOS LEARNING</span><span>{visual.number} / 12</span></div>
    <div className="cover-editorial-body"><span className="cover-subject-mark">{visual.mark === 'javascript' ? <b>JS</b> : visual.mark ? <img src={`/brands/${visual.mark}.svg`} width="36" height="36" alt="" loading="lazy" /> : <Icon name={visual.icon} size={33} />}</span><strong>{visual.title}</strong><span>{visual.subtitle}</span></div>
    <div className="cover-bottom"><span>{preview ? 'COURSE PREVIEW' : 'READ · PRACTISE · BUILD'}</span><span className="cover-arrow"><Icon name={preview ? 'Play' : 'ArrowUpRight'} size={17} /></span></div>
  </div>;
}
export function CoursePreview({
  course,
  close
}) {
  const {
    setModal,
    state
  } = useStore();
  const [lesson, setLesson] = useState(0);
  const c = coursePresentation[course.id];
  return <Modal wide title={course.title} subtitle="Course preview · concepts, lesson outline and a practical outcome" onClose={close} className="learning-preview-modal"><div className="learning-preview-grid"><div><CourseCover courseId={course.id} preview /><div className="preview-topic-list">{c.topics.map(t => <Badge color="blue" key={t}>{t}</Badge>)}</div><h3>What you’ll build</h3><p>{c.outcome}</p></div><section><Badge color="mint">{course.lessons} guided lessons</Badge><h2>{c.short}</h2><p>{course.description}</p><h3>Start with a chapter</h3><div className="preview-chapters">{(lessonNames[course.id] || []).slice(0, 5).map((name, n) => <button key={name} aria-pressed={lesson === n} className={lesson === n ? 'selected' : ''} onClick={() => setLesson(n)}><span>{String(n + 1).padStart(2, '0')}</span><div><strong>{name}</strong><small>Read the concept · work an example · complete the check</small></div><Icon name={lesson === n ? 'CircleCheck' : 'Play'} size={17} /></button>)}</div><Button icon="ArrowUpRight" onClick={() => {
          close();
          if (state.profile.role !== 'student') {
            navigate('/staff/assignments');
            return;
          }
          setModal({
            type: 'course',
            id: course.id,
            lesson
          });
        }}>{state.profile.role === 'student' ? 'Open selected lesson' : 'Plan a learning activity'}</Button><p className="quiet-note">Preview the learning outline here. The lesson workspace contains the reading, worked example and saved knowledge check.{course.video ? ' A companion video is also available inside the course.' : ''}</p></section></div></Modal>;
}
export function VideoLibrary() {
  const {
    state
  } = useStore();
  const [selected, setSelected] = useState(null),
    [query, setQuery] = useState('');
  const courses = state.catalog.courses.filter(c => [c.title, c.category, coursePresentation[c.id]?.topics.join(' ')].join(' ').toLowerCase().includes(query.toLowerCase()));
  return <><div className="section-head"><div><h2>See what you’ll learn.</h2><p>Course previews, practical outcomes and chapter outlines. Start a lesson when you’re ready.</p></div><label className="search-field"><Icon name="Search" size={16} /><input aria-label="Search lesson previews" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search a topic…" /></label></div><div className="learning-video-grid">{courses.map(c => <article className="card learning-video-card" key={c.id}><button className="learning-preview-button" aria-label={'Preview ' + c.title} onClick={() => setSelected(c)}><CourseCover courseId={c.id} preview /></button><div><Badge color="blue">{c.category}</Badge><h3>{c.title}</h3><p>{c.description}</p><footer><span>{c.lessons} lessons · {c.level}</span><button className="text-link" onClick={() => setSelected(c)}>View preview <Icon name="ArrowUpRight" size={14} /></button></footer></div></article>)}</div>{!courses.length && <Empty title="Try a different learning topic." />}{selected && <CoursePreview course={selected} close={() => setSelected(null)} />}</>;
}
export function ResourceLibrary() {
  const {
    state,
    act
  } = useStore();
  const [query, setQuery] = useState(''),
    [category, setCategory] = useState('All topics'),
    [savedOnly, setSavedOnly] = useState(false),
    [error, setError] = useState('');
  const saved = state.savedLearningResources || [];
  const rows = learningResources.filter(r => (category === 'All topics' || r.category === category) && (!savedOnly || saved.includes(r.id)) && [r.title, r.provider, r.description].join(' ').toLowerCase().includes(query.toLowerCase()));
  return <><div className="section-head"><div><h2>Learn from the people who build it.</h2><p>Official resources from MDN, Microsoft, Google, React, Docker and more. Save a path to revisit it.</p></div><Badge color="blue">{learningResources.length} learning paths</Badge></div><div className="resource-filters"><label className="search-field"><Icon name="Search" size={16} /><input aria-label="Search learning resources" placeholder="Topic, provider or skill…" value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label="Learning resource topic" value={category} onChange={e => setCategory(e.target.value)}>{['All topics', ...new Set(learningResources.map(r => r.category))].map(c => <option key={c}>{c}</option>)}</select><label><input type="checkbox" checked={savedOnly} onChange={e => setSavedOnly(e.target.checked)} />Saved paths</label></div>{error && <p role="alert">{error}</p>}<div className="resource-grid">{rows.map(r => <article className="card resource-card" key={r.id}><div className="resource-provider"><ProviderMark provider={r.provider} /><div><strong>{r.provider}</strong><small>{r.category} · {r.level}</small></div><button aria-label={(saved.includes(r.id) ? 'Unsave ' : 'Save ') + r.title} onClick={() => act('learning.resource.save', {
            id: r.id
          }).catch(e => setError(e.message))}><Icon name={saved.includes(r.id) ? 'BookmarkCheck' : 'Bookmark'} size={19} /></button></div><h3>{r.title}</h3><p>{r.description}</p><a className="text-link" href={r.url} target="_blank" rel="noreferrer">Open official learning path <Icon name="ArrowUpRight" size={14} /></a></article>)}</div>{!rows.length && <Empty title="No paths match this view." description="Try another topic or clear Saved paths." />}<p className="quiet-note">Provider progress and credentials follow the provider’s own requirements. Opening a resource does not award StudentOS course completion.</p></>;
}
