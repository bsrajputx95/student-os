import { randomUUID } from 'node:crypto';
import { projects } from '../shared/catalog.js';
function text(v, max = 3000) {
  if (typeof v !== 'string' || !v.trim()) throw new Error('Enter a value.');
  return v.trim().slice(0, max);
}
function link(v) {
  if (!v) return '';
  const u = new URL(v);
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) throw new Error('Use an HTTP or HTTPS link.');
  return u.href.slice(0, 1000);
}
export function careerAction(state, type, p) {
  if (type === 'project.evidence') {
    if (!projects.some(x => x.id === p.id)) throw new Error('Project not found.');
    const contribution = text(p.contribution);
    if (contribution.length < 40) throw new Error('Explain your contribution in at least 40 characters.');
    state.projectEvidence ||= {};
    const old = state.projectEvidence[p.id];
    state.projectEvidence[p.id] = {
      id: randomUUID(),
      version: (old?.version || 0) + 1,
      repository: link(p.repository),
      demo: link(p.demo),
      contribution,
      tests: text(p.tests),
      status: 'pending',
      time: new Date().toISOString(),
      history: [...(old?.history || []), ...(old ? [old.review ? {
        version: old.version,
        review: old.review
      } : {
        version: old.version,
        status: old.status
      }] : [])]
    };
    return true;
  }
  if (type === 'resume.entry') {
    if (!['experience', 'educationEntries', 'achievements', 'customProjects', 'certifications'].includes(p.section)) throw new Error('Choose a resume section.');
    const entries = state.resume[p.section] || [];
    if (entries.length >= 25 && !p.id) throw new Error('Keep up to 25 entries per section.');
    const entry = {
      id: p.id || randomUUID(),
      title: text(p.title, 180),
      organization: String(p.organization || '').slice(0, 180),
      period: String(p.period || '').slice(0, 100),
      description: text(p.description, 2000),
      url: link(p.url)
    };
    if (p.id && !entries.some(e => e.id === p.id)) throw new Error('Entry not found.');
    state.resume[p.section] = p.id ? entries.map(e => e.id === p.id ? entry : e) : [...entries, entry];
    return true;
  }
  if (type === 'resume.entry.delete') {
    if (!['experience', 'educationEntries', 'achievements', 'customProjects', 'certifications'].includes(p.section)) throw new Error('Choose a resume section.');
    state.resume[p.section] = (state.resume[p.section] || []).filter(e => e.id !== p.id);
    return true;
  }
  if (type === 'resume.version') {
    state.resumeVersions ||= [];
    state.resumeVersions.unshift({
      id: randomUUID(),
      name: text(p.name, 120),
      targetRole: String(p.targetRole || '').slice(0, 120),
      resume: structuredClone(state.resume),
      projects: [...state.resumeProjects],
      time: new Date().toISOString()
    });
    state.resumeVersions = state.resumeVersions.slice(0, 30);
    return true;
  }
  if (type === 'resume.restore') {
    const version = state.resumeVersions?.find(v => v.id === p.id);
    if (!version) throw new Error('Saved version not found.');
    state.resumeVersions.unshift({
      id: randomUUID(),
      name: 'Before restoring ' + version.name,
      resume: structuredClone(state.resume),
      projects: [...state.resumeProjects],
      time: new Date().toISOString()
    });
    state.resume = structuredClone(version.resume);
    state.resumeProjects = [...version.projects];
    state.resumeVersions = state.resumeVersions.slice(0, 30);
    return true;
  }
  if (type === 'certificate.save') {
    const date = String(p.issuedAt || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > new Date().toISOString().slice(0, 10)) throw new Error('Choose the actual issue date.');
    const item = {
      id: p.id || randomUUID(),
      title: text(p.title, 180),
      issuer: text(p.issuer, 180),
      url: link(p.url),
      issuedAt: date,
      verification: 'self-reported credential link'
    };
    state.credentialWallet ||= [];
    if (p.id && !state.credentialWallet.some(c => c.id === p.id)) throw new Error('Credential not found.');
    state.credentialWallet = p.id ? state.credentialWallet.map(c => c.id === p.id ? item : c) : [...state.credentialWallet, item];
    return true;
  }
  if (type === 'certificate.delete') {
    state.credentialWallet = (state.credentialWallet || []).filter(c => c.id !== p.id);
    return true;
  }
  if (type === 'application.update') {
    const a = state.applications.find(a => a.id === p.id);
    if (!a) throw new Error('Application not found.');
    if (p.nextActionAt && !Number.isFinite(Date.parse(p.nextActionAt))) throw new Error('Choose a valid follow-up time.');
    const update = {
      notes: String(p.notes || '').slice(0, 5000),
      nextAction: String(p.nextAction || '').slice(0, 500),
      nextActionAt: p.nextActionAt ? new Date(p.nextActionAt).toISOString() : null,
      url: link(p.url)
    };
    a.timeline ||= [];
    if (a.notes !== update.notes || a.nextAction !== update.nextAction || a.nextActionAt !== update.nextActionAt) a.timeline.push({
      id: randomUUID(),
      time: new Date().toISOString(),
      text: 'Follow-up updated: ' + (update.nextAction || 'Notes saved')
    });
    Object.assign(a, update);
    return true;
  }
  if (type === 'interview.plan') {
    const session = state.interviewSessions?.find(s => s.id === p.sessionId),
      response = session?.responses?.find(r => r.id === p.responseId),
      suggestion = response?.feedback?.suggestions?.[p.index];
    if (!suggestion) throw new Error('Choose saved interview feedback.');
    const id = 'interview-tip-' + response.id + '-' + p.index;
    if (!state.tasks.some(t => t.id === id)) state.tasks.push({
      id,
      title: suggestion,
      detail: 'Follow-up from your saved interview review.',
      kind: 'manual',
      category: 'Communication',
      minutes: 15,
      xp: 10,
      status: 'pending',
      date: new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata'
      })
    });
    return true;
  }
  return false;
}
