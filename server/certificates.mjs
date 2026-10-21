import { createHash } from 'node:crypto';
import { courses } from '../shared/catalog.js';
export function recordCourseCompletion(state, courseId) {
  const course = courses.find(c => c.id === courseId);
  if (!course || (state.courseProgress?.[courseId] || 0) < course.lessons) return null;
  state.courseCompletionRecords ||= {};
  state.courseCompletionRecords[courseId] ||= {
    completedAt: new Date().toISOString(),
    source: 'StudentOS course knowledge checks'
  };
  return state.courseCompletionRecords[courseId];
}
export function courseCertificates(state) {
  if (state.profile.role !== 'student') return [];
  return courses.filter(c => (state.courseProgress?.[c.id] || 0) >= c.lessons).map(c => ({
    id: 'SOS-' + createHash('sha256').update(state.profile.id + ':' + c.id).digest('hex').slice(0, 14).toUpperCase(),
    courseId: c.id,
    title: c.title,
    student: state.profile.name,
    issuer: 'StudentOS Learning',
    lessons: c.lessons,
    completedAt: state.courseCompletionRecords?.[c.id]?.completedAt || null,
    provenance: state.courseCompletionRecords?.[c.id]?.source || 'Recorded learning history',
    url: '/api/certificates/' + c.id + '.svg'
  }));
}
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;'
})[c]);
const wrap = (value, width) => {
  const lines = [''];
  for (const word of String(value).split(/\s+/)) {
    if ((lines.at(-1) + ' ' + word).trim().length > width) lines.push(word);else lines[lines.length - 1] = (lines.at(-1) + ' ' + word).trim();
  }
  return lines;
};
export function certificateSvg(certificate) {
  const c = certificate;
  const title = wrap(c.title, 56).slice(0, 3).map((line, i) => `<text x="750" y="${590 + i * 47}" text-anchor="middle" font-size="34" font-weight="600" fill="#253859">${escape(line)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1060" viewBox="0 0 1500 1060" role="img" aria-label="StudentOS course completion certificate"><defs><linearGradient id="paper" x2="1" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#f0f4ff"/></linearGradient><linearGradient id="accent"><stop stop-color="#6737d9"/><stop offset="1" stop-color="#286ce5"/></linearGradient></defs><rect width="1500" height="1060" fill="url(#paper)"/><path d="M0 0H440L0 440Z" fill="#eee7ff"/><path d="M1500 1060H1100L1500 660Z" fill="#dfe9ff"/><rect x="37" y="37" width="1426" height="986" rx="9" fill="none" stroke="#7e5cce" stroke-width="3"/><rect x="56" y="56" width="1388" height="948" rx="6" fill="none" stroke="#d8dcec"/><g font-family="Arial, Helvetica, sans-serif"><rect x="650" y="108" width="62" height="62" rx="16" fill="url(#accent)"/><text x="669" y="153" fill="white" font-size="48" font-weight="700">S</text><text x="729" y="149" font-size="32" font-weight="700" fill="#293c60">studentos.</text><text x="750" y="247" text-anchor="middle" font-size="17" letter-spacing="6" fill="#6e4ca9">STUDENTOS LEARNING</text><text x="750" y="316" text-anchor="middle" font-size="57" font-weight="700" fill="#263b61">Certificate of Completion</text><text x="750" y="386" text-anchor="middle" font-size="22" fill="#69778d">This learning record recognizes</text><text x="750" y="467" text-anchor="middle" font-size="${Math.min(56, Math.max(22, Math.floor(1120 / (Math.max(1, c.student.length) * .6))))}" font-weight="700" fill="#6537c8">${escape(c.student)}</text><path d="M480 496H1020" stroke="#c9b8ef"/><text x="750" y="532" text-anchor="middle" font-size="20" fill="#69778d">for completing the recorded coursework in</text>${title}<text x="750" y="737" text-anchor="middle" font-size="20" fill="#576b8a">${c.lessons} lessons · reading, worked examples and knowledge checks</text><circle cx="750" cy="839" r="49" fill="#eee8ff" stroke="#bfa8ec"/><path d="M729 839l14 14 30-33" fill="none" stroke="#6537c8" stroke-width="7" stroke-linecap="round"/><text x="177" y="864" font-size="20" fill="#30486a" font-weight="700">StudentOS Learning</text><text x="177" y="896" font-size="16" fill="#72819a">Course completion record</text><text x="1323" y="864" text-anchor="end" font-size="19" fill="#30486a">${escape(c.id)}</text><text x="1323" y="896" text-anchor="end" font-size="16" fill="#72819a">${c.completedAt ? 'Recorded ' + escape(c.completedAt.slice(0, 10)) : 'Learning history on file'}</text><text x="750" y="959" text-anchor="middle" font-size="14" fill="#7a879c">StudentOS coursework record · External provider qualifications are issued separately by their providers.</text></g></svg>`;
}
