import { courseCertificates } from './certificates.mjs';
import { metrics, dateKey } from './model.mjs';
import { courses, projects, quizzes } from '../shared/catalog.js';
import { companies } from '../shared/catalog.js';
import { recommendedRole } from '../shared/practice-roles.js';
import { requirePermission } from '../shared/permissions.js';
import { campusKey } from '../shared/staff.js';
import { academicReport, parseAcademicQuery, isCohortQuestion, studentSupportPlan } from './quid-analysis.mjs';
const compact = (value, max = 700) => String(value || '').slice(0, max);
function skillEvidence(state, details) {
  return Object.fromEntries(Object.keys(details.skillScores).map(skill => {
    const d = details.dimensions?.find(d => d.skill === skill);
    return [skill, {
      assessed: !!state.profile.isDemo || !!d?.checks,
      checks: state.profile.isDemo ? null : d?.checks || 0,
      lastCheckedAt: d?.lastCheckedAt || null,
      source: state.profile.isDemo ? 'Sample history; historical preparation score, not independently verified' : d?.checks ? 'Scored academic evidence' : 'Not assessed',
      coverage: d?.coverage ?? null
    }];
  }));
}
export function studentKnowledge(state, message = '') {
  const m = metrics(state),
    today = dateKey(),
    p = state.profile;
  let query = String(message).toLowerCase();
  if (/dbms|database|sql/.test(query)) query += ' sql database databases query';
  if (/front.?end|ui|ux/.test(query)) query += ' frontend react interface';
  if (/devops|cloud|linux/.test(query)) query += ' devops deployment linux network';
  const words = [...new Set(query.split(/[^a-z0-9]+/).filter(w => w.length > 3 && !['student', 'about', 'their', 'which', 'should', 'progress', 'bhavani'].includes(w)))];
  const relevant = (items, limit) => items.map((item, index) => ({
    item,
    index,
    score: words.reduce((n, w) => n + Number(JSON.stringify(item).toLowerCase().includes(w)), 0)
  })).sort((a, b) => b.score - a.score || b.index - a.index).slice(0, limit).map(r => r.item);
  const since = dateKey(new Date(Date.now() - 29 * 86400000));
  const activity = state.activity.filter(a => a.date >= since && a.date <= today);
  return {
    asOf: new Date().toISOString(),
    source: p.isDemo ? 'Illustrative sample campus history' : 'Recorded StudentOS academic activity',
    profile: {
      name: p.name,
      handle: p.handle,
      studentId: p.studentId,
      year: p.year,
      department: p.department,
      track: p.track,
      practiceRole: recommendedRole(p).name,
      practiceSkills: recommendedRole(p).skills,
      practicePreferences: state.practicePreferences,
      experience: p.level,
      diagnostic: p.diagnostic,
      onboardingPreferences: p.onboardingAnswers?.slice(0, 12),
      dailyMinutes: p.dailyMinutes,
      weeklyDays: p.weeklyDays,
      targetCompanies: p.targetCompanies || []
    },
    preparation: {
      day: state.journey.day,
      totalDays: state.journey.totalDays,
      targetDate: state.journey.targetDate,
      xp: state.journey.xp,
      readiness: m.readiness,
      skills: m.readinessDetails.skillScores,
      skillEvidence: skillEvidence(state, m.readinessDetails),
      readinessExplanation: m.readinessDetails.explanation,
      streak: m.streak,
      solved: m.solved,
      accuracy: m.accuracy
    },
    activity: {
      activeDays30: activity.filter(a => a.count > 0).length,
      contributions30: activity.reduce((n, a) => n + a.count, 0),
      recent: activity.slice(-14)
    },
    today: state.tasks.filter(t => t.date === today).map(t => ({
      title: t.title,
      kind: t.kind,
      status: t.status,
      minutes: t.minutes,
      resourceId: t.resourceId
    })),
    upcomingTasks: state.tasks.filter(t => t.date > today && t.status !== 'completed').slice(0, 10).map(t => ({
      title: t.title,
      date: t.date,
      minutes: t.minutes
    })),
    learning: courses.map(c => ({
      course: c.title,
      completed: state.courseProgress[c.id] || 0,
      total: c.lessons
    })),
    assessments: [...relevant(state.assessmentAttempts || [], 8).map(a => ({
      title: a.title,
      skill: a.skill,
      score: a.score,
      time: a.time,
      verification: a.verification,
      explanation: compact(a.explanation, 450)
    })), ...relevant((state.quizAttempts || []).map(a => ({
      ...a,
      title: quizzes.find(q => q.id === a.quizId)?.title || a.quizId,
      skill: quizzes.find(q => q.id === a.quizId)?.topic
    })), 8).map(a => ({
      title: a.title,
      skill: a.skill,
      quizId: a.quizId,
      score: a.score,
      date: a.date,
      verification: a.verification
    }))],
    assignmentSummary: {
      total: state.assignments.length,
      pending: state.assignments.filter(a => ['pending', 'revision requested'].includes(a.status)).length,
      overdue: state.assignments.filter(a => a.deadline < today && ['pending', 'revision requested'].includes(a.status)).length
    },
    assignments: relevant(state.assignments.map(a => ({
      title: a.title,
      status: a.status,
      deadline: a.deadline,
      grade: a.grade,
      maxPoints: a.maxPoints,
      feedback: compact(a.feedback),
      submission: compact(a.submission, 400)
    })), 14),
    projects: projects.filter(pr => (state.projectProgress[pr.id] || []).length || state.projectEvidence?.[pr.id]).map(pr => ({
      title: pr.title,
      milestones: (state.projectProgress[pr.id] || []).length,
      total: pr.steps.length,
      evidence: state.projectEvidence?.[pr.id] ? {
        contribution: compact(state.projectEvidence[pr.id].contribution),
        tests: compact(state.projectEvidence[pr.id].tests),
        status: state.projectEvidence[pr.id].status,
        review: state.projectEvidence[pr.id].review
      } : null
    })),
    career: {
      courseCertificates: courseCertificates(state),
      resume: {
        headline: state.resume?.headline,
        summary: compact(state.resume?.summary),
        skills: state.resume?.skills,
        experience: state.resume?.experience?.slice(0, 4),
        achievements: state.resume?.achievements?.slice(0, 5)
      },
      applications: relevant(state.applications || [], 12).map(a => ({
        company: a.company,
        title: a.title,
        status: a.status,
        nextAction: a.nextAction,
        provenance: a.provenance
      })),
      interviews: relevant(state.interviewSessions || [], 4).map(s => ({
        role: s.role,
        status: s.status,
        score: s.score,
        verification: s.verification,
        responses: s.responses.map(r => ({
          question: compact(r.question, 250),
          feedback: compact(r.feedback?.summary, 350),
          suggestions: r.feedback?.suggestions?.slice(0, 3)
        }))
      }))
    },
    deliveredGuidance: (state.staffMessages || []).slice(-5).map(s => ({
      title: s.title,
      text: compact(s.text),
      author: s.sender,
      date: s.createdAt
    })),
    evidence: (state.progressEvents || []).slice(-10).map(e => ({
      resource: e.resourceId,
      kind: e.kind,
      skill: e.skill,
      score: e.score,
      verification: e.verification,
      time: e.time
    })),
    limits: 'Only recorded app activity is available. Low activity does not establish personality, intent, effort outside this app or a reason for absence. Readiness is a preparation estimate, not a hiring verdict.'
  };
}
export function staffKnowledge(actor, input, {
  students,
  readCampus
}) {
  requirePermission(actor.profile, 'academic.read');
  const roster = students(campusKey(actor.profile)).filter(s => campusKey(s.profile) === campusKey(actor.profile) && s.profile.role === 'student'),
    q = String(input.message || '').toLowerCase(),
    plan = input.plan || parseAcademicQuery(q);
  let matches = [];
  if (input.studentId) {
    const selected = roster.find(s => s.profile.id === input.studentId);
    if (!selected) {
      const e = new Error('This student is not available in your college scope.');
      e.status = 403;
      throw e;
    }
    if (plan.scope !== 'college' && !isCohortQuestion(q)) matches = [selected];
  }
  {
    // An explicitly named student takes precedence over a stale picker selection.
    const previous = matches;
    matches = roster.filter(s => [s.profile.studentId, s.profile.name, '@' + s.profile.handle].filter(v => v && v.length >= 4).some(v => q.includes(v.toLowerCase())));
    if (!matches.length) matches = roster.filter(s => s.profile.handle.toLowerCase() !== s.profile.name.split(' ')[0].toLowerCase() && q.includes(s.profile.handle.toLowerCase()));
    if (!matches.length) {
      const words = new Set(q.split(/[^a-z0-9]+/));
      matches = roster.filter(s => s.profile.name.split(' ').some(n => n.length >= 4 && words.has(n.toLowerCase())));
    }
    if (!matches.length) matches = previous;
  }
  if (matches.length === 1) {
    const s = matches[0],
      context = studentKnowledge(s, input.message);
    const campus = readCampus(actor.profile.collegeId);
    context.mentorNotes = (campus.notes || []).filter(n => n.studentId === s.profile.id).slice(-5).map(n => ({
      text: compact(n.text),
      status: n.status,
      followUp: n.followUp,
      author: n.author,
      createdAt: n.createdAt
    }));
    return {
      kind: 'student',
      studentId: s.profile.id,
      name: s.profile.name,
      facts: context,
      supportPlan: studentSupportPlan(context, plan.skill),
      sources: ['Academic profile', 'Activity & plan', 'Scored attempts', 'Coursework & projects', 'Career preparation']
    };
  }
  if (matches.length > 1) return {
    kind: 'selection',
    name: 'Choose a student',
    matches: matches.slice(0, 12).map(s => ({
      id: s.profile.id,
      name: s.profile.name,
      handle: s.profile.handle,
      year: s.profile.year
    })),
    sources: ['College student directory']
  };
  const summary = roster.map(s => {
    const m = metrics(s);
    return {
      skills: m.readinessDetails.skillScores,
      evidence: skillEvidence(s, m.readinessDetails),
      department: s.profile.department || '',
      coursework: Object.fromEntries(['pending', 'submitted', 'graded', 'revision requested', 'overdue'].map(status => [status, s.assignments.filter(a => status === 'overdue' ? a.deadline < dateKey() && ['pending', 'revision requested'].includes(a.status) : status === 'pending' ? ['pending', 'revision requested'].includes(a.status) : a.status === status).length])),
      courses: Object.fromEntries(courses.map(c => [c.id, {
        completed: s.courseProgress[c.id] || 0,
        total: c.lessons
      }])),
      companies: [...new Set([...(s.profile.targetCompanies || []), ...s.applications.map(a => a.company)])],
      applications: s.applications.map(a => ({
        company: a.company,
        title: a.title,
        status: a.status,
        provenance: a.provenance
      })).slice(-20),
      id: s.profile.id,
      name: s.profile.name,
      handle: s.profile.handle,
      year: s.profile.year,
      track: s.profile.track || '',
      readiness: m.readiness,
      illustrative: !!s.profile.isDemo,
      active7: s.activity.filter(a => a.date >= dateKey(new Date(Date.now() - 6 * 86400000)) && a.date <= dateKey() && a.count > 0).length,
      overdue: s.assignments.filter(a => a.deadline < dateKey() && ['pending', 'revision requested'].includes(a.status)).length
    };
  });
  const campus = readCampus(actor.profile.collegeId);
  const report = academicReport(summary, plan, {
    college: actor.profile.college,
    asOf: new Date().toISOString(),
    total: summary.length
  });
  const mentioned = companies.filter(c => q.includes(c.name.toLowerCase()));
  const matchingIds = new Set(report.rows.map(r => r.id));
  const candidates = summary.filter(s => matchingIds.has(s.id));
  const skillSummary = Object.keys(summary[0]?.skills || {}).map(skill => ({
    skill,
    average: summary.filter(s => s.evidence[skill].assessed).length ? Math.round(summary.filter(s => s.evidence[skill].assessed).reduce((n, s) => n + s.skills[skill], 0) / summary.filter(s => s.evidence[skill].assessed).length) : null,
    unassessed: summary.filter(s => !s.evidence[skill].assessed).length,
    below40: summary.filter(s => s.evidence[skill].assessed && s.skills[skill] < 40).length,
    atLeast75: summary.filter(s => s.evidence[skill].assessed && s.skills[skill] >= 75).length
  }));
  return {
    kind: 'college',
    name: actor.profile.college,
    sources: ['College academic summaries', 'Published work', 'Placement drives'],
    report,
    facts: {
      asOf: new Date().toISOString(),
      students: summary.length,
      skillSummary,
      matchedCompanies: mentioned.map(c => c.name),
      matchedStudents: report.matched,
      coursework: {
        pending: roster.reduce((n, s) => n + s.assignments.filter(a => ['pending', 'revision requested'].includes(a.status)).length, 0),
        submitted: roster.reduce((n, s) => n + s.assignments.filter(a => a.status === 'submitted').length, 0),
        graded: roster.reduce((n, s) => n + s.assignments.filter(a => a.status === 'graded').length, 0)
      },
      years: [1, 2, 3, 4].map(year => {
        const a = summary.filter(s => s.year === year);
        return {
          year,
          count: a.length,
          averageReadiness: a.length ? Math.round(a.reduce((n, s) => n + s.readiness, 0) / a.length) : 0
        };
      }),
      ready: summary.filter(s => s.readiness >= 75).length,
      published: campus.items.filter(i => i.status === 'published').length,
      drives: campus.drives.map(d => ({
        company: d.company,
        title: d.title,
        status: d.status,
        date: d.date
      })).slice(-10),
      query: plan,
      studentsToReview: report.rows.slice(0, 12).map(r => {
        const s = candidates.find(s => s.id === r.id);
        return {
          id: s.id,
          name: s.name,
          handle: s.handle,
          year: s.year,
          track: s.track,
          skills: s.skills,
          evidence: s.evidence,
          readiness: s.readiness,
          active7: s.active7,
          overdue: s.overdue,
          illustrative: s.illustrative
        };
      }),
      sampleData: roster.some(s => s.profile.isDemo),
      availableResources: {
        courses: courses.filter(c => !plan.skill || c.category === plan.skill).map(c => ({
          id: c.id,
          title: c.title,
          lessons: c.lessons,
          skill: c.category
        })),
        quizzes: quizzes.filter(c => !plan.skill || c.topic === plan.skill).slice(0, 10).map(c => ({
          id: c.id,
          title: c.title,
          skill: c.topic
        }))
      },
      limits: 'Academic records only. Do not infer personal behavior, intent or reasons for absence. Ask for a specific student for a detailed record.'
    }
  };
}
