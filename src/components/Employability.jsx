import React, { useState } from 'react';
import { useStore, niceDate } from '../lib/store.jsx';
import { Button, Badge, Modal, Empty } from './ui.jsx';
export function ProjectEvidence({
  id
}) {
  const {
      state,
      act
    } = useStore(),
    saved = state.projectEvidence?.[id],
    [form, setForm] = useState(saved || {
      repository: '',
      demo: '',
      contribution: '',
      tests: ''
    }),
    [error, setError] = useState('');
  return <details><summary>Repository, contribution & evidence {saved && '· ' + saved.status}</summary><form className="form-stack" onSubmit={async e => {
      e.preventDefault();
      try {
        await act('project.evidence', {
          id,
          ...form
        }, 'Project evidence saved for staff review.');
        setError('');
      } catch (e) {
        setError(e.message);
      }
    }}>{[['repository', 'Repository URL'], ['demo', 'Live demo URL']].map(([key, label]) => <label key={key}>{label}<input type="url" value={form[key] || ''} onChange={e => setForm(f => ({
          ...f,
          [key]: e.target.value
        }))} /></label>)}<label>Your contribution<textarea required minLength={40} value={form.contribution} onChange={e => setForm(f => ({
          ...f,
          contribution: e.target.value
        }))} /></label><label>Tests, decisions and measured results<textarea required value={form.tests} onChange={e => setForm(f => ({
          ...f,
          tests: e.target.value
        }))} /></label>{saved?.review && <p>Staff review: {saved.review.score}% · {saved.review.feedback}</p>}{error && <p role="alert">{error}</p>}<Button type="submit">Save evidence</Button></form></details>;
}
export function ApplicationTimeline({
  application: a,
  close
}) {
  const {
      act
    } = useStore(),
    [form, setForm] = useState(a),
    [error, setError] = useState('');
  return <Modal title={a.company + ' · ' + a.title} subtitle="Application timeline & follow-up" onClose={close}><form className="form-stack" onSubmit={async e => {
      e.preventDefault();
      try {
        await act('application.update', {
          ...form,
          nextActionAt: form.nextActionAt ? new Date(form.nextActionAt).toISOString() : null
        }, 'Application details saved.');
        close();
      } catch (e) {
        setError(e.message);
      }
    }}><label>Official application URL<input type="url" value={form.url || ''} onChange={e => setForm(f => ({
          ...f,
          url: e.target.value
        }))} /></label><label>Notes<textarea value={form.notes || ''} onChange={e => setForm(f => ({
          ...f,
          notes: e.target.value
        }))} /></label><label>Next action<input value={form.nextAction || ''} onChange={e => setForm(f => ({
          ...f,
          nextAction: e.target.value
        }))} /></label><label>Remind me<input type="datetime-local" value={form.nextActionAt ? new Date(Date.parse(form.nextActionAt) - new Date(form.nextActionAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} onChange={e => setForm(f => ({
          ...f,
          nextActionAt: e.target.value
        }))} /></label>{error && <p role="alert">{error}</p>}<Button type="submit">Save next step</Button></form><h3>History</h3>{a.timeline?.map(t => <p key={t.id}>{new Date(t.time).toLocaleString()} · {t.text}</p>)}</Modal>;
}
export function ResumeWorkspace() {
  const {
      state,
      act,
      setModal
    } = useStore(),
    [entry, setEntry] = useState(null),
    [version, setVersion] = useState(false),
    [error, setError] = useState('');
  const sections = [['educationEntries', 'Additional education'], ['experience', 'Experience'], ['customProjects', 'Independent projects'], ['achievements', 'Achievements'], ['certifications', 'Certifications']];
  return <><div className="section-head resume-toolbar"><div><h2>A resume you can stand behind.</h2><p>Your facts, individual contributions, and saved versions for each role.</p></div><div className="row-actions"><Button onClick={() => setModal({
          type: 'resume-ai'
        })}>Edit with Quid AI</Button><Button variant="secondary" onClick={() => setVersion(true)}>Versions</Button><Button variant="secondary" onClick={() => window.print()}>Print / PDF</Button></div></div><div className="resume-layout"><aside className="resume-tools card form-stack"><h3>Contact & profile</h3><form key={JSON.stringify(state.resume)} className="form-stack" onSubmit={async e => {
          e.preventDefault();
          try {
            await act('resume.update', Object.fromEntries(new FormData(e.currentTarget)), 'Resume saved.');
            setError('');
          } catch (e) {
            setError(e.message);
          }
        }}>{[['headline', 'Headline'], ['email', 'Email'], ['location', 'Location'], ['github', 'Portfolio / GitHub'], ['education', 'Education'], ['skills', 'Skills you can explain and demonstrate']].map(([k, l]) => <label key={k}>{l}<input name={k} type={k === 'email' ? 'email' : k === 'github' ? 'url' : 'text'} defaultValue={state.resume[k] || ''} /></label>)}<label>Summary<textarea name="summary" defaultValue={state.resume.summary} /></label><Button type="submit">Save profile</Button></form>{sections.map(([section, label]) => <section key={section}><h3>{label}</h3>{(state.resume[section] || []).map(e => <div key={e.id}><strong>{e.title}</strong><div className="row-actions"><Button variant="ghost" onClick={() => setEntry({
                ...e,
                section
              })}>Edit</Button><Button variant="ghost" onClick={() => act('resume.entry.delete', {
                section,
                id: e.id
              }).catch(() => {})}>Remove</Button></div></div>)}<Button variant="secondary" onClick={() => setEntry({
            section,
            title: '',
            organization: '',
            period: '',
            description: '',
            url: ''
          })}>Add {label.toLowerCase()}</Button></section>)}{error && <p role="alert">{error}</p>}</aside><article className="resume-paper"><header><h1>{state.profile.name}</h1><p>{state.resume.headline}</p><p>{state.resume.email} · {state.resume.location}</p>{state.resume.github && <a href={state.resume.github}>{state.resume.github}</a>}</header><section><h3>Profile</h3><p>{state.resume.summary}</p></section><section><h3>Education</h3><p>{state.resume.education}</p></section>{sections.filter(([key]) => state.resume[key]?.length).map(([key, label]) => <section key={key}><h3>{label}</h3>{state.resume[key].map(e => <div className="resume-project" key={e.id}><h4>{e.title} · {e.organization}</h4><small>{e.period}</small><p>{e.description}</p>{e.url && <a href={e.url}>{e.url}</a>}</div>)}</section>)}<section><h3>Skills</h3><p>{state.resume.skills || Object.entries(state.metrics.readinessDetails.skillScores).filter(([, score]) => score >= 35).map(([skill]) => skill).join(' · ') || 'Add the skills you can demonstrate.'}</p></section><section><h3>StudentOS projects</h3>{state.resumeProjects.map(id => {
            const p = state.catalog.projects.find(p => p.id === id),
              e = state.projectEvidence?.[id];
            return p && <div className="resume-project" key={id}><h4>{p.title}</h4>{e ? <><p>{e.contribution}</p><p>{e.tests}</p><a href={e.repository}>{e.repository}</a>{e.demo && <p><a href={e.demo}>{e.demo}</a></p>}</> : <p>Project milestones recorded. Add your repository and individual contribution in the project workspace.</p>}</div>;
          })}</section>{!!state.courseCertificates?.length && state.profile.autoResume && <section><h3>StudentOS course completion</h3>{state.courseCertificates.map(c => <p key={c.id}>{c.title} · {c.issuer} · {c.lessons} lessons</p>)}</section>}{!!state.credentialWallet?.length && <section><h3>Credentials</h3>{state.credentialWallet.map(c => <p key={c.id}>{c.title} · {c.issuer} · {c.issuedAt} <a href={c.url}>Credential</a></p>)}</section>}</article></div>{entry && <Modal title="Resume entry" onClose={() => setEntry(null)}><form className="form-stack" onSubmit={async e => {
        e.preventDefault();
        try {
          await act('resume.entry', entry, 'Resume entry saved.');
          setEntry(null);
        } catch (e) {
          setError(e.message);
        }
      }}>{[['title', 'Title'], ['organization', 'Organization / issuer'], ['period', 'Dates / period'], ['url', 'Evidence / project URL']].map(([key, label]) => <label key={key}>{label}<input required={key === 'title'} type={key === 'url' ? 'url' : 'text'} value={entry[key]} onChange={e => setEntry(f => ({
            ...f,
            [key]: e.target.value
          }))} /></label>)}<label>What you did and can verify<textarea required value={entry.description} onChange={e => setEntry(f => ({
            ...f,
            description: e.target.value
          }))} /></label>{error && <p role="alert">{error}</p>}<Button type="submit">Save entry</Button></form></Modal>}{version && <Modal title="Role versions" onClose={() => setVersion(false)}><form className="form-stack" onSubmit={async e => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        try {
          await act('resume.version', {
            name: f.get('name'),
            targetRole: f.get('targetRole')
          }, 'Resume version saved.');
        } catch (e) {
          setError(e.message);
        }
      }}><label>Version name<input required name="name" placeholder="Backend graduate · October" /></label><label>Target role<input name="targetRole" /></label><Button type="submit">Save current version</Button></form>{state.resumeVersions?.map(v => <section className="card" key={v.id}><h3>{v.name}</h3><p>{v.targetRole} · {new Date(v.time).toLocaleString()}</p><Button variant="secondary" onClick={() => act('resume.restore', {
          id: v.id
        }, 'Saved version restored.').catch(() => {})}>Restore version</Button></section>)}</Modal>}</>;
}
export function CredentialWallet() {
  const {
      state,
      act
    } = useStore(),
    [open, setOpen] = useState(false),
    [error, setError] = useState('');
  return <section className="card"><div className="section-head"><div><h2>Credential wallet</h2><p>Keep issuer links with the credentials you have actually earned.</p></div><Button onClick={() => setOpen(true)}>Add credential</Button></div>{state.credentialWallet?.length ? state.credentialWallet.map(c => <article className="card" key={c.id}><Badge color="gray">{c.verification}</Badge><h3>{c.title}</h3><p>{c.issuer} · {c.issuedAt}</p>{c.url && <a href={c.url} target="_blank" rel="noreferrer">View credential ↗</a>}<Button variant="ghost" onClick={() => act('certificate.delete', {
        id: c.id
      }).catch(() => {})}>Remove</Button></article>) : <Empty title="Your earned credentials belong here." description="Adding a link records your claim; it does not verify the issuer." />}{open && <Modal title="Add earned credential" onClose={() => setOpen(false)}><form className="form-stack" onSubmit={async e => {
        e.preventDefault();
        try {
          await act('certificate.save', Object.fromEntries(new FormData(e.currentTarget)), 'Credential saved.');
          setOpen(false);
        } catch (e) {
          setError(e.message);
        }
      }}><label>Credential title<input name="title" required /></label><label>Issuer<input name="issuer" required /></label><label>Issue date<input name="issuedAt" type="date" required max={new Date().toISOString().slice(0, 10)} /></label><label>Issuer verification URL<input name="url" type="url" required /></label>{error && <p role="alert">{error}</p>}<Button type="submit">Save credential</Button></form></Modal>}</section>;
}
