import Attachments from '../components/Attachments.jsx';
import React, { useState } from 'react';
import { useStore, today } from '../lib/store.jsx';
import { useCampus } from './context.jsx';
import { Modal, Icon, Button, Badge } from '../components/ui.jsx';
import { matchesStudent, staffKinds } from '../../shared/staff.js';
import { StudentAvatar } from './Students.jsx';
const after = n => {
  const d = new Date(today() + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA');
};
export default function Compose({
  close,
  item,
  kind = 'Assignment',
  studentIds,
  subject,
  jobId,
  quizId
}) {
  const {
    state,
    request
  } = useStore();
  const {
    data,
    mutate
  } = useCampus();
  const job = state.catalog.jobs.find(j => j.id === jobId);
  const [form, setForm] = useState(item ? {
    ...item
  } : {
    kind,
    title: job ? `${job.company} · ${job.title}` : '',
    description: job ? 'This opportunity may be worth exploring based on your preparation. Check the official eligibility, location, and application window before applying.' : '',
    subject: subject || 'College preparation',
    deadline: ['Assignment', 'Quiz', 'Project', 'Event'].includes(kind) ? after(7) : '',
    maxPoints: 100,
    sourceUrl: job?.sourceUrl || '',
    quizId: quizId || state.catalog.quizzes[0]?.id,
    maxAttempts: 1,
    timeLimit: null,
    latePolicy: 'accept',
    skill: 'Databases',
    files: [],
    fileIds: [],
    projectId: '',
    jobId: jobId || state.catalog.jobs[0]?.id,
    rubric: 'Correctness 40% · Implementation 30% · Explanation 20% · Presentation 10%'
  });
  const [audience, setAudience] = useState(item?.audience || (studentIds?.length ? {
      scope: 'selected',
      ids: studentIds
    } : {
      scope: 'filter',
      filters: {
        year: '3'
      }
    })),
    [step, setStep] = useState(0),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(null),
    [search, setSearch] = useState('');
  const work = ['Assignment', 'Quiz', 'Project'].includes(form.kind);
  const fields = (key, value) => {
    setForm(f => ({
      ...f,
      [key]: value
    }));
    setError('');
  };
  const recipients = audience.scope === 'everyone' ? data.students : audience.scope === 'selected' ? data.students.filter(s => audience.ids?.includes(s.id)) : data.students.filter(s => matchesStudent(s, audience.filters));
  function select(id) {
    setAudience(a => ({
      ...a,
      scope: 'selected',
      ids: a.ids?.includes(id) ? a.ids.filter(x => x !== id) : [...(a.ids || []), id]
    }));
  }
  async function next() {
    setError('');
    if (step === 0) {
      if (form.title.trim().length < 3 || form.description.trim().length < 10) {
        setError('Add a clear title and at least 10 characters of instructions or message.');
        return;
      }
      setStep(1);
    } else {
      if (!recipients.length) {
        setError('Choose at least one student.');
        return;
      }
      setBusy(true);
      try {
        setPreview((await request('/api/staff/preview', {
          audience
        })).students);
        setStep(2);
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    }
  }
  async function save(publish) {
    setBusy(true);
    setError('');
    try {
      const finalAudience = publish ? {
        scope: 'selected',
        ids: preview.map(s => s.id)
      } : audience;
      await mutate('item.save', {
        ...form,
        id: item?.id,
        audience: finalAudience,
        publish
      }, publish ? `Published to ${preview.length} student${preview.length === 1 ? '' : 's'}. Their workspace has been updated.` : 'Draft saved. Nothing has been delivered.');
      close();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <Modal wide title={item ? 'Continue your draft' : 'Create something that moves them forward'} subtitle="One student, a cohort, or your whole college. Always review the audience first." onClose={close} className="staff-compose-modal"><div className="staff-compose-steps">{['Create your content', 'Choose the audience', 'Review & publish'].map((label, i) => <div key={label} className={step === i ? 'current' : step > i ? 'done' : ''}><span>{step > i ? <Icon name="Check" size={13} /> : i + 1}</span><strong>{label}</strong></div>)}</div><div className="staff-compose-body">{step === 0 ? <div className="staff-compose-content"><section className="form-stack"><div className="staff-kind-grid">{staffKinds.map(k => <button key={k} className={form.kind === k ? 'selected' : ''} onClick={() => fields('kind', k)}><Icon name={k === 'Assignment' ? 'NotebookPen' : k === 'Quiz' ? 'Brain' : k === 'Project' ? 'Blocks' : k === 'Event' ? 'CalendarDays' : k === 'Announcement' ? 'Megaphone' : k === 'Opportunity' ? 'Briefcase' : k === 'Feedback' ? 'Lightbulb' : 'MessageCircle'} size={18} />{k}</button>)}</div><label>Title<input required maxLength={140} value={form.title} onChange={e => fields('title', e.target.value)} placeholder={work ? 'What will your students work on?' : 'What would you like to share?'} /></label><label>{work ? 'Instructions & expected outcome' : 'Your message'}<textarea required rows={6} maxLength={8000} value={form.description} onChange={e => fields('description', e.target.value)} placeholder={work ? 'Describe the task, deliverables, and what a good result looks like.' : 'Be clear, specific, and useful. Tell students what to do next.'} /></label>{form.kind === 'Quiz' && <label>Assign a quiz<select value={form.quizId} onChange={e => fields('quizId', e.target.value)}>{[...(data.questionBanks || []), ...state.catalog.quizzes].map(q => <option key={q.id} value={q.id}>{q.title} · {q.questions.length} questions</option>)}</select><small>Answers are graded on the server. Results return to the review dashboard.</small></label>}{form.kind === 'Project' && <label>Project template (optional)<select value={form.projectId || ''} onChange={e => fields('projectId', e.target.value)}><option value="">A custom project</option>{state.catalog.projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>}{form.kind === 'Opportunity' && <label>Sourced opportunity<select value={form.jobId} onChange={e => {
              const j = state.catalog.jobs.find(j => j.id === e.target.value);
              setForm(f => ({
                ...f,
                jobId: j.id,
                title: `${j.company} · ${j.title}`.slice(0, 140),
                sourceUrl: j.sourceUrl
              }));
            }}>{state.catalog.jobs.map(j => <option key={j.id} value={j.id}>{j.company} · {j.title} · {j.country}</option>)}</select></label>}<label>Schedule publication (optional)<input type="datetime-local" value={form.scheduleAt ? new Date(Date.parse(form.scheduleAt) - new Date(form.scheduleAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} onChange={e => fields('scheduleAt', e.target.value ? new Date(e.target.value).toISOString() : null)} /></label><div className="staff-form-two"><label>{work ? 'Subject / module' : 'Topic'}<input value={form.subject} onChange={e => fields('subject', e.target.value)} maxLength={100} /></label><label>{form.kind === 'Event' ? 'Event / registration date' : work ? 'Submission deadline' : 'Follow-up date (optional)'}<input type="date" value={form.deadline || ''} onChange={e => fields('deadline', e.target.value)} /></label></div>{work && <><label>Attach an assessment lab (optional)<select value={form.labId || ''} onChange={e => fields('labId', e.target.value)}><option value="">No lab requirement</option>{state.catalog.assessmentLabs.map(l => <option key={l.id} value={l.id}>{l.type} · {l.title}</option>)}</select></label><div className="staff-form-two"><label>Skill assessed<select value={form.skill || 'Databases'} onChange={e => fields('skill', e.target.value)}>{['DSA', 'Frontend', 'Backend', 'Databases', 'DevOps', 'Communication', 'Aptitude'].map(skill => <option key={skill}>{skill}</option>)}</select></label><label>Late policy<select value={form.latePolicy || 'accept'} onChange={e => fields('latePolicy', e.target.value)}><option value="accept">Accept and mark late</option><option value="closed">Close after deadline</option></select></label></div>{form.kind === 'Quiz' && <div className="staff-form-two"><label>Time limit in minutes (optional)<input type="number" min={1} max={180} value={form.timeLimit || ''} onChange={e => fields('timeLimit', e.target.value ? Number(e.target.value) : null)} /></label><label>Allowed attempts<input type="number" min={1} max={5} value={form.maxAttempts || 1} onChange={e => fields('maxAttempts', Number(e.target.value))} /></label></div>}</>}<Attachments value={form.files || []} onChange={files => setForm(f => ({
            ...f,
            files,
            fileIds: files.map(file => file.id)
          }))} /><label>Resource, repository, or event link (optional)<input type="url" value={form.sourceUrl} onChange={e => fields('sourceUrl', e.target.value)} placeholder="https://…" /></label>{work && <div className="staff-form-two"><label>Maximum points<input type="number" min={1} max={1000} value={form.maxPoints} onChange={e => fields('maxPoints', Number(e.target.value))} /></label><label>Review criteria<input value={form.rubric} onChange={e => fields('rubric', e.target.value)} maxLength={1000} /></label></div>}</section><aside className="staff-compose-tip"><span>✧</span><h3>Make the next step clear.</h3><p>A useful assignment tells students what to build, what to submit, and how you’ll review it.</p><ul><li>Give enough context to get started.</li><li>Keep the workload realistic.</li><li>Include examples or a resource.</li><li>Leave room to ask questions.</li></ul><Badge color="mint">{form.kind === 'Message' || form.kind === 'Feedback' ? 'Students can reply in Guidance' : work ? 'Appears in student Assignments' : form.kind === 'Event' ? 'Appears in college event updates' : form.kind === 'Opportunity' ? 'Appears in student Career' : 'Appears in the College feed'}</Badge></aside></div> : step === 1 ? <div className="staff-audience-layout"><section><h2>Who is this for?</h2><p className="staff-muted">Choose a precise group or select students individually.</p><div className="staff-audience-scopes">{[['filter', 'A cohort or filter', 'SlidersHorizontal'], ['selected', 'Individual students', 'Contact'], ['everyone', 'The whole college', 'Users']].map(([scope, label, icon]) => <button key={scope} className={audience.scope === scope ? 'selected' : ''} onClick={() => setAudience(a => ({
              ...a,
              scope,
              filters: a.filters || {},
              ids: a.ids || []
            }))}><Icon name={icon} size={20} /><span>{label}</span></button>)}</div>{audience.scope === 'filter' && <div className="form-stack"><label>Use a saved cohort<select value="" onChange={e => {
                const cohort = data.cohorts.find(c => c.id === e.target.value);
                if (cohort) setAudience({
                  scope: 'filter',
                  filters: cohort.filters
                });
              }}><option value="">Choose a cohort or set filters below</option>{data.cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><div className="staff-form-two"><label>College year<select value={audience.filters?.year || ''} onChange={e => setAudience(a => ({
                  ...a,
                  filters: {
                    ...a.filters,
                    year: e.target.value
                  }
                }))}><option value="">All years</option>{[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}</select></label><label>Department<select value={audience.filters?.department || ''} onChange={e => setAudience(a => ({
                  ...a,
                  filters: {
                    ...a.filters,
                    department: e.target.value
                  }
                }))}><option value="">All departments</option>{[...new Set(data.students.map(s => s.department))].map(d => <option key={d}>{d}</option>)}</select></label></div><label>Learning path<select value={audience.filters?.track || ''} onChange={e => setAudience(a => ({
                ...a,
                filters: {
                  ...a.filters,
                  track: e.target.value
                }
              }))}><option value="">All learning paths</option>{state.catalog.tracks.map(t => <option key={t}>{t}</option>)}</select></label></div>}{audience.scope === 'selected' && <><label className="staff-search"><Icon name="Search" size={16} /><input aria-label="Find assignment recipients" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a student…" /></label><div className="staff-recipient-options">{data.students.filter(s => `${s.name} ${s.studentId}`.toLowerCase().includes(search.toLowerCase())).map(s => <label key={s.id}><input type="checkbox" checked={audience.ids?.includes(s.id) || false} onChange={() => select(s.id)} /><StudentAvatar student={s} /><span><strong>{s.name}</strong><small>Year {s.year} · {s.department}</small></span></label>)}</div></>}{audience.scope === 'everyone' && <div className="staff-all-audience"><Icon name="Users" size={36} /><h3>Everyone in this college.</h3><p>This will reach all {data.students.length} students across years, departments, and learning paths. You’ll review the exact list before publishing.</p></div>}</section><aside className="staff-audience-preview"><span className="staff-section-label">YOUR AUDIENCE</span><strong>{recipients.length}<small>student{recipients.length === 1 ? '' : 's'}</small></strong><div className="staff-recipient-preview">{recipients.slice(0, 10).map(s => <div key={s.id}><StudentAvatar student={s} /><span>{s.name}<small>Year {s.year}</small></span></div>)}{recipients.length > 10 && <p>+{recipients.length - 10} more students</p>}{!recipients.length && <p>Adjust your filters or select a student.</p>}</div><p className="staff-muted">Only students in your college can be selected.</p></aside></div> : <div className="staff-publish-review"><div className="staff-publish-title"><span><Icon name="Send" size={26} /></span><div><Badge color="mint">READY FOR YOUR REVIEW</Badge><h2>A clear next step for {preview.length} student{preview.length === 1 ? '' : 's'}.</h2><p>Publishing updates their workspace and adds an in-app notification.</p></div></div><article className="staff-review-preview"><div><Badge>{form.kind}</Badge><small>{form.subject}{form.deadline ? ' · ' + form.deadline : ''}{work ? ' · ' + form.maxPoints + ' points' : ''}</small></div><h2>{form.title}</h2><p>{form.description}</p>{form.sourceUrl && <a href={form.sourceUrl} target="_blank" rel="noreferrer">Open resource<Icon name="ArrowUpRight" size={14} /></a>}<footer>From {state.profile.name} · {state.profile.role === 'teacher' ? 'Faculty' : 'Placement team'}</footer></article><h3>Reviewed recipients</h3><div className="staff-review-recipients">{preview.map(s => <span key={s.id}><StudentAvatar student={s} />{s.name}<small>Year {s.year}</small></span>)}</div><div className="staff-publish-note"><Icon name="Info" size={17} /><span>Delivery stays inside StudentOS. Students can submit work or reply to guidance in their own workspace.</span></div></div>}</div>{error && <p className="staff-form-error" role="alert">{error}</p>}<footer className="staff-compose-footer"><Button variant="ghost" disabled={busy} onClick={() => step ? setStep(step - 1) : close()}><Icon name="ArrowLeft" size={14} />{step ? 'Back' : 'Cancel'}</Button><div><Button variant="secondary" disabled={busy || !form.title.trim() || !form.description.trim() || !recipients.length} onClick={() => save(false)}>Save draft</Button>{step < 2 ? <Button icon="ArrowRight" disabled={busy} onClick={next}>{busy ? 'Checking audience…' : step === 0 ? 'Choose audience' : 'Review & publish'}</Button> : <Button icon="Send" disabled={busy} onClick={() => save(true)}>{busy ? 'Publishing…' : `Publish to ${preview.length} student${preview.length === 1 ? '' : 's'}`}</Button>}</div></footer></Modal>;
}
