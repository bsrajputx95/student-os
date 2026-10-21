import { requirePermission } from '../shared/permissions.js';
import { campusKey } from '../shared/staff.js';
export function collegeReport(actor, p, {
  students,
  campus
}) {
  requirePermission(actor.profile, 'academic.read');
  const from = p.from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    to = p.to || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from || Date.parse(to) - Date.parse(from) > 1460 * 86400000) throw new Error('Choose a report range of up to four years.');
  const records = students(campusKey(actor.profile)).filter(s => (!p.year || s.profile.year === Number(p.year)) && (!p.department || s.profile.department === p.department)),
    within = d => String(d || '').slice(0, 10) >= from && String(d || '').slice(0, 10) <= to;
  const events = records.flatMap(s => (s.progressEvents || []).filter(e => within(e.time)).map(e => ({
    ...e,
    year: s.profile.year
  })));
  const verified = events.filter(e => ['server-checked', 'mentor-reviewed', 'ai-reviewed'].includes(e.verification));
  const ids = new Set(records.map(s => s.profile.id));
  const notes = campus(campusKey(actor.profile)).notes.filter(n => ids.has(n.studentId) && within(n.createdAt));
  return {
    from,
    to,
    students: records.length,
    activity: records.reduce((n, s) => n + s.activity.filter(a => within(a.date)).reduce((n, a) => n + a.count, 0), 0),
    verifiedChecks: verified.length,
    assessmentAverage: verified.length ? Math.round(verified.reduce((n, e) => n + e.score, 0) / verified.length) : null,
    cohorts: [1, 2, 3, 4].map(year => {
      const group = records.filter(s => s.profile.year === year),
        checks = verified.filter(e => e.year === year);
      return {
        year,
        students: group.length,
        verifiedChecks: checks.length,
        score: checks.length ? Math.round(checks.reduce((n, e) => n + e.score, 0) / checks.length) : null
      };
    }),
    skills: [...new Set(verified.map(e => e.skill))].map(skill => {
      const checks = verified.filter(e => e.skill === skill);
      return {
        skill,
        checks: checks.length,
        score: Math.round(checks.reduce((n, e) => n + e.score, 0) / checks.length)
      };
    }),
    funnel: ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Not selected'].map(status => ({
      status,
      count: records.reduce((n, s) => n + s.applications.filter(a => a.status === status && within(a.date)).length, 0)
    })),
    interventions: {
      created: notes.length,
      resolved: notes.filter(n => n.resolved).length,
      averageReadinessChange: notes.filter(n => Number.isFinite(n.latestReadiness) && Number.isFinite(n.baselineReadiness)).reduce((r, n) => ({
        ...r,
        total: r.total + n.latestReadiness - n.baselineReadiness,
        count: r.count + 1
      }), {
        total: 0,
        count: 0
      })
    },
    explanation: 'Activity records effort; scored checks reflect the recorded assessment evidence. Placement outcomes include student reports and college updates. Sample histories remain illustrative.'
  };
}
