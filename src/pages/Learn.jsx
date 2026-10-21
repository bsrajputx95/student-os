import { coursePresentation } from '../../shared/learning-library.js';
import SubjectArt from '../components/SubjectArt.jsx';
import { CourseCover, CoursePreview, VideoLibrary, ResourceLibrary } from '../components/LearningLibrary.jsx';
import CourseCertificates from '../components/CourseCertificates.jsx';
import CertificateRecommendations from '../components/CertificateRecommendations.jsx';
import { CredentialWallet } from '../components/Employability.jsx';
import LearningNotebook from '../components/LearningNotebook.jsx';
import React, { useEffect, useState } from 'react';
import { useStore, niceDate, navigate } from '../lib/store.jsx';
import { PageHead, Button, Icon, Badge, Tabs, Progress, CourseArt, Empty } from '../components/ui.jsx';
import { CollegeAssignments } from '../components/CollegeConnected.jsx';
export default function Learn({
  initialTab
}) {
  const {
    state,
    setModal
  } = useStore();
  const [preview, setPreview] = useState(null);
  const [tab, setTab] = useState(initialTab || 'courses'),
    [filter, setFilter] = useState('All learning'),
    [query, setQuery] = useState('');
  useEffect(() => setTab(initialTab || 'courses'), [initialTab]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('course');
    if (id && state.catalog.courses.some(c => c.id === id)) setModal({
      type: 'course',
      id
    });
  }, []);
  const courses = state.catalog.courses.filter(c => c.title.toLowerCase().includes(query.toLowerCase()) && (filter === 'All learning' || filter === 'For my path' && c.tags.includes(state.profile.track) || filter === 'In progress' && state.courseProgress[c.id] > 0));
  const featured = state.catalog.courses.filter(c => c.tags.includes(state.profile.track) && (state.courseProgress[c.id] || 0) < c.lessons).sort((a, b) => (state.courseProgress[b.id] || 0) / b.lessons - (state.courseProgress[a.id] || 0) / a.lessons)[0] || state.catalog.courses.find(c => c.tags.includes(state.profile.track)) || state.catalog.courses[0];
  const feature = coursePresentation[featured.id];
  return <><PageHead eyebrow="FOLLOW THAT LITTLE SPARK." title="Make room for something new." description="Watch it. Read it. Try it. Find the way you love to learn."><Badge color="blue"><Icon name="BookOpen" size={14} />{Object.values(state.courseProgress).reduce((a, b) => a + b, 0)} lessons explored</Badge></PageHead><Tabs items={[{
      id: 'courses',
      label: 'My learning'
    }, {
      id: 'videos',
      label: 'Videos & previews'
    }, {
      id: 'resources',
      label: 'Explore resources'
    }, {
      id: 'assignments',
      label: 'Assignments',
      count: state.assignments.filter(a => a.status !== 'submitted').length
    }, {
      id: 'certificates',
      label: 'Certificates'
    }, {
      id: 'notes',
      label: 'Notes & bookmarks'
    }]} value={tab} onChange={next => {
      setTab(next);
      navigate('/learn?tab=' + next);
    }} />{tab === 'courses' ? <><div className="learn-feature"><div><Badge color="glass">RECOMMENDED FOR YOUR NEXT STEP</Badge><h2>{feature.short}</h2><p>{feature.outcome}</p><Button icon="ArrowUpRight" onClick={() => setModal({
            type: 'course',
            id: featured.id
          })}>{(state.courseProgress[featured.id] || 0) > 0 ? "Continue learning" : "Explore this course"}</Button></div><div className="learn-feature-art"><SubjectArt type={featured.id} /></div></div><div className="section-head learning-filters"><div className="filter-pills">{['All learning', 'For my path', 'In progress'].map(f => <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>{f}</button>)}</div><label className="search-field"><Icon name="Search" size={16} /><input aria-label="Search courses" placeholder="Find something to learn…" value={query} onChange={e => setQuery(e.target.value)} /></label></div><div className="course-grid">{courses.map(c => <section className="card course-card" key={c.id}><button className="course-cover" aria-label={'Open ' + c.title} onClick={() => setModal({
            type: 'course',
            id: c.id
          })}><CourseCover courseId={c.id} /><Badge color="glass">{c.type === 'Read & do' ? <Icon name="BookOpen" size={12} /> : <Icon name="Play" size={12} />} {c.type}</Badge></button><div className="course-card-body"><div className="course-category"><span>{c.category}</span><span>{c.level}</span></div><button className="heading-button" onClick={() => setModal({
              type: 'course',
              id: c.id
            })}><h3>{c.title}</h3></button><p className="course-card-description">{c.description}</p><p>{c.lessons} lessons · {c.author}</p><Progress value={(state.courseProgress[c.id] || 0) / c.lessons * 100} color={c.color === 'mint' ? 'mint' : 'purple'} /><div className="course-card-bottom"><button className="text-link" onClick={() => setPreview(c)}><Icon name="Play" size={13} />Preview</button><span>{state.courseProgress[c.id] > 0 ? `${state.courseProgress[c.id]} / ${c.lessons} complete` : 'Your next discovery'}</span><button className="text-link" onClick={() => setModal({
                type: 'course',
                id: c.id
              })}>{state.courseProgress[c.id] > 0 ? 'Continue' : 'Explore'}<Icon name="ArrowUpRight" size={14} /></button></div></div></section>)}</div>{!courses.length && <Empty title="A different search might spark something." description="Try another topic or browse all learning." />}</> : tab === 'videos' ? <VideoLibrary /> : tab === 'resources' ? <ResourceLibrary /> : tab === 'assignments' ? <CollegeAssignments /> : tab === 'notes' ? <LearningNotebook /> : <><CourseCertificates /><CredentialWallet /><div className="certificate-banner"><Icon name="Award" size={52} /><div><h2>Learn something. Have something to show.</h2><p>Find certificates that complement the skills you are building.</p></div></div><CertificateRecommendations /></>}{preview && <CoursePreview course={preview} close={() => setPreview(null)} />}</>;
}
