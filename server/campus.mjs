import { staffRoles, requirePermission, can } from '../shared/permissions.js';
import { validateQuestionBank } from './question-bank.mjs';
import { randomUUID } from 'node:crypto';
import { createProfile } from './profiles.mjs';
import { metrics, dateKey } from './model.mjs';
import { addEvidence } from './evidence.mjs';
import { eligibility, validateEligibility } from '../shared/eligibility.js';
import { catalog, quizzes as privateQuizzes } from '../shared/catalog.js';
import { integer, enumValue } from '../shared/validation.js';
import { campusKey, matchesStudent, staffKinds, pipelineStages } from '../shared/staff.js';
const demoCollege = 'StudentOS Demo Campus',
  demoCollegeId = 'studentos-demo-campus';
const dayAfter = n => dateKey(new Date(Date.now() + n * 86400000));
const now = () => new Date().toISOString();
function required(value, label, max = 3000) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Enter ${label}.`);
  return value.trim().slice(0, max);
}
function link(value) {
  if (!value) return '';
  try {
    const u = new URL(value);
    if (!['http:', 'https:'].includes(u.protocol)) throw 0;
    return u.href;
  } catch {
    throw new Error('Use a full http or https link.');
  }
}
function validDate(value) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(value + 'T12:00:00Z').getTime())) throw new Error('Choose a valid date.');
  if (new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) !== value) throw new Error('Choose a valid date.');
  return value;
}
export function isStaff(profile) {
  return staffRoles.includes(profile?.role);
}
export function createStaffProfile(role) {
  if (!['teacher', 'placement'].includes(role)) throw new Error('Choose teacher or placement.');
  return {
    version: 1,
    profile: {
      id: `demo-${role}`,
      role,
      isDemo: true,
      onboardingDone: true,
      name: role === 'teacher' ? 'Dr. Neha Iyer' : 'Arjun Mehta',
      handle: role === 'teacher' ? 'neha.faculty' : 'arjun.placements',
      college: demoCollege,
      collegeId: demoCollegeId,
      department: role === 'teacher' ? 'Computer Science' : 'Training & Placement',
      designation: role === 'teacher' ? 'Faculty mentor' : 'Placement coordinator'
    },
    notifications: []
  };
}
export function summarizeStudent(state) {
  const m = metrics(state),
    p = state.profile,
    weekAgo = dayAfter(-6);
  const active7 = state.activity.filter(d => d.date >= weekAgo && d.date <= dateKey() && d.count > 0).length;
  const assignments = state.assignments || [],
    pending = assignments.filter(a => ['pending', 'revision requested'].includes(a.status));
  return {
    id: p.id,
    name: p.name,
    handle: p.handle,
    year: p.year,
    track: p.track,
    department: p.department || 'Computer Science',
    section: p.section || 'A',
    studentId: p.studentId,
    college: p.college,
    isDemo: !!p.isDemo,
    cgpa: p.cgpa ?? null,
    backlogs: p.backlogs,
    graduationYear: p.graduationYear,
    placementOptOut: p.placementOptOut,
    targetCompanies: p.targetCompanies || [],
    companyApplications: [...new Set(state.applications.map(a => a.company))],
    skills: m.readinessDetails.skillScores,
    verifiedSkills: m.readinessDetails.skillScores,
    readiness: m.readiness,
    streak: m.streak,
    solved: m.solved,
    quizScore: state.quizAttempts.length ? m.accuracy : 0,
    active7,
    completedProjects: state.resumeProjects.length,
    coursePercent: Math.round(catalog.courses.reduce((sum, c) => sum + (state.courseProgress[c.id] || 0) / c.lessons, 0) / catalog.courses.length * 100),
    pendingAssignments: pending.length,
    overdue: pending.filter(a => a.deadline && a.deadline < dateKey()).length,
    lastActive: state.activity.filter(d => d.count > 0).at(-1)?.date || null,
    needsSupport: active7 < 2 || pending.some(a => a.deadline && a.deadline < dateKey()),
    journeyDay: state.journey.day,
    totalDays: state.journey.totalDays,
    activity: state.activity.slice(-7),
    applications: state.applications.length,
    offers: state.applications.filter(a => a.status === 'Selected').length
  };
}
export function rankJobs(student, jobs = catalog.jobs) {
  return jobs.map(job => {
    const score = Math.round(job.skills.reduce((sum, s) => sum + ((student.verifiedSkills || student.skills)[s] || 0), 0) / job.skills.length);
    return {
      ...job,
      score,
      yearMatch: job.years.includes(student.year),
      gaps: job.skills.filter(s => ((student.verifiedSkills || student.skills)[s] || 0) < 70).map(s => ({
        skill: s,
        value: (student.verifiedSkills || student.skills)[s] || 0,
        target: 70
      }))
    };
  }).sort((a, b) => Number(b.yearMatch) - Number(a.yearMatch) || b.score - a.score || a.company.localeCompare(b.company));
}
export function createCampusService({
  db,
  readProfile,
  saveProfile,
  broadcast = () => {},
  onPublished = () => {},
  onAudit = () => {}
}) {
  db.exec('CREATE TABLE IF NOT EXISTS campuses(id TEXT PRIMARY KEY,document TEXT NOT NULL)');
  const getCampus = id => {
    const row = db.prepare('SELECT document FROM campuses WHERE id=?').get(id);
    return row ? JSON.parse(row.document) : {
      id,
      version: 1,
      items: [],
      cohorts: [],
      notes: [],
      drives: [],
      audit: []
    };
  };
  const saveCampus = c => db.prepare('INSERT INTO campuses VALUES(?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document').run(c.id, JSON.stringify(c));
  const allStudents = collegeId => db.prepare('SELECT document FROM profiles').all().map(r => JSON.parse(r.document)).filter(s => !isStaff(s.profile) && campusKey(s.profile) === collegeId);
  const authorize = actor => {
    if (!isStaff(actor?.profile)) {
      const error = new Error('A teacher or placement session is required.');
      error.status = 403;
      throw error;
    }
    return campusKey(actor.profile);
  };
  function resolveAudience(actor, audience = {}) {
    const students = allStudents(authorize(actor)).map(summarizeStudent);
    if (audience.scope === 'selected') {
      if (!Array.isArray(audience.ids) || !audience.ids.length) throw new Error('Select at least one student.');
      const unique = [...new Set(audience.ids)];
      if (unique.some(id => !students.some(s => s.id === id))) throw new Error('One or more students are outside your college roster.');
      return students.filter(s => unique.includes(s.id));
    }
    if (audience.scope === 'filter') return students.filter(s => matchesStudent(s, audience.filters || {}));
    if (audience.scope === 'everyone') return students;
    throw new Error('Choose an audience.');
  }
  function staffData(actor) {
    const id = authorize(actor),
      campus = getCampus(id),
      records = allStudents(id),
      recordMap = new Map(records.map(s => [s.profile.id, s])),
      students = records.map(summarizeStudent).sort((a, b) => b.readiness - a.readiness);
    const items = campus.items.map(item => {
      const deliveries = item.targetIds.map(studentId => {
        const state = recordMap.get(studentId) || readProfile(studentId),
          assignment = state.assignments?.find(a => a.sourceId === item.id),
          message = state.staffMessages?.find(m => m.sourceId === item.id),
          update = state.campusUpdates?.find(m => m.id === item.id);
        return {
          studentId,
          name: state.profile.name,
          year: state.profile.year,
          status: item.status === 'draft' ? 'draft' : assignment?.status || (message?.read || update?.read ? 'read' : 'delivered'),
          grade: assignment?.grade ?? null,
          maxPoints: assignment?.maxPoints ?? item.maxPoints,
          submission: assignment?.submission || '',
          submissionUrl: assignment?.submissionUrl || '',
          files: assignment?.files || [],
          versions: assignment?.versions || [],
          labAttempt: assignment?.labAttempt || null,
          submittedAt: assignment?.submittedAt || null,
          feedback: assignment?.feedback || '',
          replies: message?.replies || [],
          read: !!(message?.read || update?.read)
        };
      });
      return {
        ...item,
        quiz: can(actor.profile, 'submission.review') ? item.quiz : null,
        deliveries,
        submitted: deliveries.filter(d => ['submitted', 'graded'].includes(d.status)).length,
        reviewed: deliveries.filter(d => d.status === 'graded').length
      };
    });
    const count = students.length;
    return {
      campus: {
        id,
        name: actor.profile.college,
        version: campus.version
      },
      role: actor.profile.role,
      students,
      items,
      cohorts: campus.cohorts,
      questionBanks: can(actor.profile, 'content.publish') ? campus.questionBanks || [] : [],
      notes: campus.notes,
      drives: campus.drives,
      audit: campus.audit.slice(0, 60),
      summary: {
        students: count,
        averageReadiness: count ? Math.round(students.reduce((n, s) => n + s.readiness, 0) / count) : 0,
        ready: students.filter(s => s.readiness >= 75).length,
        needsSupport: students.filter(s => s.needsSupport).length,
        activeThisWeek: students.filter(s => s.active7 > 0).length,
        published: items.filter(i => i.status === 'published').length,
        toReview: items.reduce((n, i) => n + i.deliveries.filter(d => d.status === 'submitted').length, 0),
        offers: students.reduce((n, s) => n + s.offers, 0),
        overdue: students.reduce((n, s) => n + s.overdue, 0)
      },
      skills: Object.keys(catalog.skillColors).map(skill => ({
        skill,
        average: count ? Math.round(students.reduce((n, s) => n + (s.skills[skill] || 0), 0) / count) : 0
      })),
      readinessBands: [['Building foundations', 0, 39], ['Developing skills', 40, 59], ['Almost there', 60, 74], ['Placement ready', 75, 100]].map(([label, min, max]) => ({
        label,
        count: students.filter(s => s.readiness >= min && s.readiness <= max).length
      })),
      preview: true
    };
  }
  function studentDetail(actor, id) {
    const collegeId = authorize(actor),
      s = readProfile(id);
    if (!s || isStaff(s.profile) || campusKey(s.profile) !== collegeId) {
      const e = new Error('Student not found in your college.');
      e.status = 404;
      throw e;
    }
    const {
      profile,
      skills,
      journey,
      activity,
      courseProgress,
      projectProgress,
      quizAttempts,
      assignments,
      resume,
      resumeProjects,
      applications,
      staffMessages,
      skillHistory
    } = s;
    const summary = summarizeStudent(s);
    return {
      profile,
      skills: summary.skills,
      journey,
      activity,
      courseProgress,
      projectProgress,
      quizAttempts,
      assignments: can(actor.profile, 'submission.review') ? assignments : assignments.map(a => ({
        ...a,
        quiz: null
      })),
      resume,
      resumeProjects,
      applications,
      staffMessages: staffMessages || [],
      skillHistory: skillHistory || [],
      projectEvidence: s.projectEvidence || {},
      credentialWallet: s.credentialWallet || [],
      assessmentAttempts: s.assessmentAttempts || [],
      targetCompanies: profile.targetCompanies || [],
      summary,
      jobMatches: rankJobs(summary).slice(0, 12),
      notes: getCampus(collegeId).notes.filter(n => n.studentId === id)
    };
  }
  function deliver(actor, item, target) {
    const s = readProfile(target.id);
    s.notifications.unshift({
      id: `staff-${item.id}`,
      title: item.title,
      text: `${actor.profile.name} · ${item.kind}${item.deadline ? ' · Due ' + item.deadline : ''}`,
      route: ['Assignment', 'Quiz', 'Project'].includes(item.kind) ? '/learn?tab=assignments' : item.kind === 'Opportunity' ? '/career' : item.kind === 'Announcement' ? '/community?tab=college' : item.kind === 'Event' ? '/events' : '/messages?tab=staff',
      read: false
    });
    s.notifications = s.notifications.slice(0, 100);
    if (['Assignment', 'Quiz', 'Project'].includes(item.kind)) {
      if (!s.assignments.some(a => a.sourceId === item.id)) s.assignments.push({
        id: item.id,
        sourceId: item.id,
        kind: item.kind,
        title: item.title,
        teacher: actor.profile.name,
        subject: item.subject || 'College preparation',
        deadline: item.deadline,
        description: item.description,
        status: 'pending',
        submission: '',
        maxPoints: item.maxPoints,
        quizId: item.quizId || null,
        projectId: item.projectId || null,
        labId: item.labId || null,
        sourceUrl: item.sourceUrl,
        createdAt: item.publishedAt,
        rubric: item.rubric,
        skill: item.skill,
        quiz: item.quiz ? structuredClone(item.quiz) : null,
        resourceFiles: item.files || [],
        latePolicy: item.latePolicy || 'accept',
        timeLimit: item.timeLimit,
        maxAttempts: item.maxAttempts || 1
      });
    } else if (['Message', 'Feedback'].includes(item.kind)) {
      s.staffMessages ||= [];
      if (!s.staffMessages.some(m => m.sourceId === item.id)) s.staffMessages.push({
        id: item.id,
        sourceId: item.id,
        title: item.title,
        text: item.description,
        sender: actor.profile.name,
        role: actor.profile.role,
        kind: item.kind,
        date: item.publishedAt,
        read: false,
        replies: [],
        followUp: item.deadline
      });
    } else if (item.kind === 'Opportunity') {
      s.recommendedJobs ||= [];
      if (!s.recommendedJobs.some(j => j.sourceId === item.id)) s.recommendedJobs.push({
        sourceId: item.id,
        jobId: item.jobId,
        message: item.description,
        sender: actor.profile.name,
        date: item.publishedAt
      });
    } else {
      s.campusUpdates ||= [];
      if (!s.campusUpdates.some(u => u.id === item.id)) s.campusUpdates.push({
        id: item.id,
        kind: item.kind,
        title: item.title,
        description: item.description,
        sourceUrl: item.sourceUrl,
        date: item.publishedAt,
        eventDate: item.deadline,
        sender: actor.profile.name,
        read: false
      });
    }
    s.version++;
    saveProfile(s);
    return s.profile.id;
  }
  function mutate(actor, type, p = {}) {
    if (typeof type !== 'string' || !p || typeof p !== 'object' || Array.isArray(p)) throw new Error('Choose a valid staff operation.');
    for (const key of ['publish', 'requestRevision']) if (p[key] !== undefined && typeof p[key] !== 'boolean') throw new Error(key + ' must be true or false.');
    const collegeId = authorize(actor);
    requirePermission(actor.profile, type.startsWith('drive.') ? 'placement.manage' : type.startsWith('submission.') || type === 'project.review' ? 'submission.review' : type.startsWith('note.') ? 'mentor.write' : 'content.publish');
    const campus = getCampus(collegeId);
    const changed = [];
    let result = {};
    db.exec('BEGIN IMMEDIATE');
    try {
      if (type === 'quiz.save') {
        campus.questionBanks ||= [];
        const existing = p.id && campus.questionBanks.find(q => q.id === p.id);
        if (p.id && !existing) throw new Error('Question bank not found in your college.');
        if (existing && existing.authorId !== actor.profile.id && !can(actor.profile, 'institution.manage')) throw new Error('Only the author or college administrator can edit this question bank.');
        const quiz = validateQuestionBank(p, actor.profile, existing);
        if (existing) campus.questionBanks[campus.questionBanks.indexOf(existing)] = quiz;else campus.questionBanks.push(quiz);
        db.prepare('INSERT INTO question_banks VALUES(?,?,?,?,?)').run(quiz.id, collegeId, quiz.version, JSON.stringify(quiz), now());
        result = {
          id: quiz.id,
          version: quiz.version
        };
      } else if (type === 'item.save') {
        if (!staffKinds.includes(p.kind)) throw new Error('Choose a supported content type.');
        if (p.kind === 'Opportunity' && !catalog.jobs.some(j => j.id === p.jobId)) throw new Error('Choose a sourced opportunity.');
        const selectedQuiz = p.kind === 'Quiz' ? [...(campus.questionBanks || []), ...privateQuizzes].find(q => q.id === p.quizId) : null;
        if (p.kind === 'Quiz' && !selectedQuiz) throw new Error('Choose a quiz.');
        if (p.kind === 'Project' && p.projectId && !catalog.projects.some(q => q.id === p.projectId)) throw new Error('Choose a valid project.');
        if (p.labId && p.kind === 'Quiz') throw new Error('Assign a lab as written work, separate from a quiz.');
        if (p.labId && !catalog.assessmentLabs.some(l => l.id === p.labId)) throw new Error('Choose an existing assessment lab.');
        const targets = resolveAudience(actor, p.audience);
        if (!targets.length) throw new Error('No students match that audience.');
        const points = Number(p.maxPoints ?? 100);
        if (!Number.isFinite(points) || points < 1 || points > 1000) throw new Error('Use 1–1,000 maximum points.');
        if (p.timeLimit !== undefined && p.timeLimit !== null && p.timeLimit !== '') integer(p.timeLimit, 1, 180, 'Quiz time limit');
        if (p.maxAttempts !== undefined) integer(p.maxAttempts, 1, 5, 'Allowed attempts');
        if (p.skill) enumValue(p.skill, ['DSA', 'Frontend', 'Backend', 'Databases', 'DevOps', 'Communication', 'Aptitude'], 'assessment skill');
        const existing = p.id && campus.items.find(i => i.id === p.id);
        if (p.id && (!existing || existing.status !== 'draft')) throw new Error('Only a draft can be edited.');
        if (existing && existing.authorId !== actor.profile.id && !can(actor.profile, 'institution.manage')) throw new Error('Only the author or administrator can edit this draft.');
        if (p.scheduleAt && (!Number.isFinite(Date.parse(p.scheduleAt)) || Date.parse(p.scheduleAt) <= Date.now())) throw new Error('Choose a future publication time.');
        const item = {
          id: existing?.id || randomUUID(),
          kind: p.kind,
          title: required(p.title, 'a title', 140),
          description: required(p.description, 'instructions or a message', 8000),
          subject: String(p.subject || 'College preparation').slice(0, 100),
          deadline: validDate(p.deadline),
          sourceUrl: link(p.sourceUrl),
          maxPoints: points,
          rubric: String(p.rubric || 'Correctness 40% · Implementation 30% · Explanation 20% · Presentation 10%').slice(0, 1000),
          skill: p.skill || selectedQuiz?.topic || (p.kind === 'Project' ? 'Backend' : 'Databases'),
          files: p.files || [],
          fileIds: p.fileIds || [],
          latePolicy: p.latePolicy === 'closed' ? 'closed' : 'accept',
          timeLimit: p.timeLimit ? Math.min(180, Math.max(1, Number(p.timeLimit))) : null,
          maxAttempts: Math.min(5, Math.max(1, Number(p.maxAttempts) || 1)),
          quiz: selectedQuiz ? structuredClone(selectedQuiz) : null,
          quizId: p.quizId || null,
          projectId: p.projectId || null,
          labId: p.labId || null,
          jobId: p.jobId || null,
          audience: p.audience,
          targetIds: targets.map(s => s.id),
          status: 'draft',
          author: actor.profile.name,
          authorId: actor.profile.id,
          createdAt: existing?.createdAt || now()
        };
        item.scheduleAt = p.scheduleAt ? new Date(p.scheduleAt).toISOString() : null;
        if (existing) Object.assign(existing, item);else campus.items.unshift(item);
        result = {
          id: item.id,
          recipients: item.targetIds.length
        };
        if (p.publish && !item.scheduleAt) {
          const saved = existing || item;
          saved.status = 'published';
          saved.publishedAt = now();
          for (const target of targets) changed.push(deliver(actor, saved, target));
          result.published = true;
        }
      } else if (type === 'item.publish') {
        const item = campus.items.find(i => i.id === p.id);
        if (!item) throw new Error('Content not found.');
        if (item.status === 'published') {
          result = {
            id: item.id,
            recipients: item.targetIds.length,
            alreadyPublished: true
          };
        } else {
          if (item.status !== 'draft') throw new Error('Only drafts can be published.');
          const targets = resolveAudience(actor, item.audience);
          if (!targets.length) throw new Error('No students match the audience.');
          item.targetIds = targets.map(s => s.id);
          item.status = 'published';
          item.publishedAt = now();
          for (const target of targets) changed.push(deliver(actor, item, target));
          result = {
            id: item.id,
            recipients: targets.length
          };
        }
      } else if (type === 'item.extend') {
        const item = campus.items.find(i => i.id === p.id && i.status === 'published');
        if (!item) throw new Error('Choose published work.');
        const deadline = validDate(p.deadline);
        if (!deadline || deadline < dateKey()) throw new Error('Choose today or a future extension date.');
        const ids = p.studentIds || item.targetIds;
        if (!Array.isArray(ids) || !ids.length || ids.some(id => !item.targetIds.includes(id))) throw new Error('Choose students assigned this work.');
        for (const id of ids) {
          const s = readProfile(id),
            a = s.assignments.find(a => a.sourceId === item.id);
          if (!a) continue;
          if (a.deadline && deadline < a.deadline) throw new Error('An extension cannot shorten a student’s deadline.');
          a.extensions ||= [];
          a.extensions.push({
            previous: a.deadline,
            deadline,
            by: actor.profile.name,
            time: now()
          });
          a.deadline = deadline;
          s.version++;
          saveProfile(s);
          changed.push(id);
        }
        result = {
          id: item.id,
          recipients: changed.length
        };
      } else if (type === 'item.archive') {
        const item = campus.items.find(i => i.id === p.id);
        if (!item) throw new Error('Content not found.');
        item.status = 'archived';
        item.archivedAt = now();
      } else if (type === 'submission.review') {
        const item = campus.items.find(i => i.id === p.itemId && i.targetIds.includes(p.studentId));
        const s = readProfile(p.studentId),
          assignment = s?.assignments.find(a => a.sourceId === p.itemId);
        if (!item || !s || campusKey(s.profile) !== collegeId || !assignment) throw new Error('Submission not found in this college.');
        if (!['submitted', 'graded', 'revision requested'].includes(assignment.status) || !assignment.submission) throw new Error('The student has not submitted this assignment.');
        const grade = Number(p.grade);
        if (!Number.isFinite(grade) || grade < 0 || grade > assignment.maxPoints) throw new Error(`Enter a score from 0 to ${assignment.maxPoints}.`);
        if (p.rubricScores) {
          const limits = {
            correctness: 40,
            implementation: 30,
            explanation: 20,
            presentation: 10
          };
          for (const [key, max] of Object.entries(limits)) integer(p.rubricScores[key], 0, max, key + ' rubric score');
          const total = Object.values(p.rubricScores).reduce((n, v) => n + v, 0);
          if (Object.keys(p.rubricScores).length !== 4 || Math.abs(grade - total / 100 * assignment.maxPoints) > .011) throw new Error('The grade must match the rubric total.');
        }
        assignment.grade = grade;
        assignment.feedback = required(p.feedback, 'feedback', 3000);
        assignment.status = p.requestRevision ? 'revision requested' : 'graded';
        assignment.reviewedBy = actor.profile.name;
        assignment.reviewedAt = now();
        const review = {
          grade,
          feedback: assignment.feedback,
          reviewedBy: actor.profile.name,
          reviewedAt: assignment.reviewedAt,
          revisionRequested: !!p.requestRevision,
          rubricScores: p.rubricScores || null
        };
        assignment.reviewHistory ||= [];
        assignment.reviewHistory.push(review);
        if (assignment.versions?.length) {
          assignment.versions.at(-1).reviews ||= [];
          assignment.versions.at(-1).reviews.push(review);
          assignment.versions.at(-1).review = review;
        }
        s.notifications.unshift({
          id: randomUUID(),
          title: p.requestRevision ? 'A revision will help you improve' : 'Your work has been reviewed',
          text: `${assignment.title} · ${grade}/${assignment.maxPoints}`,
          route: '/learn?tab=assignments',
          read: false
        });
        s.version++;
        saveProfile(s);
        changed.push(p.studentId);
      } else if (type === 'project.review') {
        const s = readProfile(p.studentId),
          e = s?.projectEvidence?.[p.projectId];
        if (!e || campusKey(s.profile) !== collegeId) throw new Error('Project evidence not found in this college.');
        const score = integer(p.score, 0, 100, 'Project score'),
          feedback = required(p.feedback, 'review feedback', 3000);
        e.status = p.requestRevision ? 'revision requested' : 'reviewed';
        e.review = {
          score,
          feedback,
          by: actor.profile.name,
          time: now()
        };
        addEvidence(s, {
          key: 'project-review:' + p.projectId + ':' + e.version,
          kind: 'mentor-review',
          resourceId: 'project:' + p.projectId,
          skill: catalog.projects.find(x => x.id === p.projectId)?.skills[0] || 'Backend',
          score,
          verification: 'mentor-reviewed'
        });
        s.version++;
        saveProfile(s);
        changed.push(s.profile.id);
      } else if (type === 'cohort.save') {
        const filters = p.filters || {};
        const targets = allStudents(collegeId).map(summarizeStudent).filter(s => matchesStudent(s, filters));
        campus.cohorts.push({
          id: randomUUID(),
          name: required(p.name, 'a cohort name', 80),
          filters,
          count: targets.length,
          createdBy: actor.profile.name,
          createdAt: now()
        });
      } else if (type === 'note.add') {
        const s = readProfile(p.studentId);
        if (!s || isStaff(s.profile) || campusKey(s.profile) !== collegeId) throw new Error('Student not found.');
        const note = {
          id: randomUUID(),
          studentId: p.studentId,
          text: required(p.text, 'a mentor note', 2000),
          followUp: validDate(p.followUp),
          author: actor.profile.name,
          createdAt: now(),
          resolved: false
        };
        note.assignedTo = actor.profile.id;
        note.baselineReadiness = metrics(s).readiness;
        note.source = p.source === 'observed' ? 'observed' : 'mentor inference';
        note.status = 'open';
        campus.notes.unshift(note);
        result = {
          id: note.id
        };
      } else if (type === 'note.resolve') {
        const note = campus.notes.find(n => n.id === p.id);
        if (!note) throw new Error('Note not found.');
        note.resolved = !note.resolved;
        note.status = note.resolved ? 'resolved' : 'open';
        note.outcome = String(p.outcome || 'Follow-up reviewed by ' + actor.profile.name).slice(0, 2000);
        note.resolvedAt = note.resolved ? now() : null;
        const learner = readProfile(note.studentId);
        if (learner) note.latestReadiness = metrics(learner).readiness;
      } else if (type === 'drive.create') {
        if (!['placement', 'admin'].includes(actor.profile.role)) {
          const e = new Error('Placement staff manage college recruitment drives.');
          e.status = 403;
          throw e;
        }
        const targets = resolveAudience(actor, p.audience);
        if (!targets.length) throw new Error('Select an audience for the drive.');
        const rules = validateEligibility(p.eligibility || {}),
          excluded = targets.filter(s => !eligibility(s, rules).eligible);
        const eligibleTargets = targets.filter(s => eligibility(s, rules).eligible);
        if (!eligibleTargets.length) throw new Error('No selected students meet the stated eligibility rules.');
        const drive = {
          id: randomUUID(),
          title: required(p.title, 'a drive title', 140),
          company: required(p.company, 'a company', 100),
          description: required(p.description, 'drive details', 5000),
          date: validDate(p.date),
          deadline: validDate(p.deadline),
          sourceUrl: link(p.sourceUrl),
          jobId: p.jobId || null,
          status: 'Open',
          author: actor.profile.name,
          createdAt: now(),
          eligibility: rules,
          rounds: [],
          excluded: excluded.map(s => ({
            studentId: s.id,
            reasons: eligibility(s, rules).reasons
          })),
          applications: eligibleTargets.map(s => ({
            studentId: s.id,
            name: s.name,
            status: 'Invited',
            updatedAt: now()
          }))
        };
        campus.drives.unshift(drive);
        for (const target of eligibleTargets) {
          const s = readProfile(target.id);
          s.campusDrives ||= [];
          s.campusDrives.push({
            id: drive.id,
            title: drive.title,
            company: drive.company,
            description: drive.description,
            date: drive.date,
            deadline: drive.deadline,
            sourceUrl: drive.sourceUrl,
            status: 'Invited',
            driveStatus: 'Open',
            eligibility: rules,
            rounds: []
          });
          s.notifications.unshift({
            id: randomUUID(),
            title: `${drive.company} · College recruitment drive`,
            text: drive.title,
            route: '/career?tab=opportunities',
            read: false
          });
          s.version++;
          saveProfile(s);
          changed.push(target.id);
        }
        result = {
          id: drive.id,
          recipients: eligibleTargets.length
        };
      } else if (type === 'drive.update') {
        const drive = campus.drives.find(d => d.id === p.id);
        if (!drive) throw new Error('Drive not found.');
        if (p.status !== undefined) drive.status = enumValue(p.status, ['Open', 'Closed', 'Cancelled'], 'drive status');
        if (p.rounds) {
          if (!Array.isArray(p.rounds) || p.rounds.length > 10) throw new Error('Keep up to ten recruitment rounds.');
          drive.rounds = p.rounds.map(r => {
            if (!Number.isFinite(Date.parse(r.at))) throw new Error('Choose a valid round time.');
            return {
              id: r.id || randomUUID(),
              name: required(r.name, 'round name', 120),
              at: new Date(r.at).toISOString(),
              location: String(r.location || '').slice(0, 200),
              url: link(r.url)
            };
          });
        }
        drive.history ||= [];
        drive.history.push({
          time: now(),
          by: actor.profile.name,
          text: 'Drive updated · ' + drive.status
        });
        for (const a of drive.applications) {
          const s = readProfile(a.studentId),
            entry = s.campusDrives?.find(d => d.id === drive.id);
          if (entry) {
            entry.driveStatus = drive.status;
            entry.rounds = drive.rounds;
            entry.eligibility = drive.eligibility;
            s.version++;
            saveProfile(s);
            changed.push(s.profile.id);
          }
        }
        result = {
          id: drive.id
        };
      } else if (type === 'drive.stage') {
        const drive = campus.drives.find(d => d.id === p.driveId),
          ids = [...new Set(p.studentIds || [p.studentId])];
        if (!drive || drive.status !== 'Open' || !pipelineStages.includes(p.stage) || !ids.length || ids.length > 500) throw new Error('Choose an open drive, a valid stage and students.');
        const updates = ids.map(id => {
          const a = drive.applications.find(a => a.studentId === id),
            s = readProfile(id);
          if (!a || !s || campusKey(s.profile) !== collegeId) throw new Error('Selected student is not in this drive.');
          if (p.stage === 'Invited' && a.status !== 'Invited') throw new Error('Completed recruitment stages cannot return to an initial invitation.');
          return {
            a,
            s
          };
        });
        for (const {
          a,
          s
        } of updates) {
          if (a.status === p.stage) continue;
          a.history ||= [];
          a.history.push({
            from: a.status,
            to: p.stage,
            time: now(),
            by: actor.profile.name,
            note: String(p.reason || 'Placement team update').slice(0, 1000)
          });
          a.status = p.stage;
          a.updatedAt = now();
          const entry = s.campusDrives?.find(d => d.id === drive.id);
          if (entry) entry.status = p.stage;
          if (p.stage !== 'Invited') {
            let app = s.applications.find(a => a.driveId === drive.id);
            if (!app) s.applications.push(app = {
              id: randomUUID(),
              driveId: drive.id,
              company: drive.company,
              title: drive.title,
              date: dateKey()
            });
            app.status = {
              Applied: 'Applied',
              Assessment: 'Shortlisted',
              Interview: 'Interview',
              Offered: 'Selected',
              'Not selected': 'Not selected'
            }[p.stage];
            app.provenance = 'college placement team';
            app.timeline ||= [];
            app.timeline.push({
              id: randomUUID(),
              time: now(),
              text: drive.company + ' · ' + p.stage + ' · confirmed by ' + actor.profile.name
            });
          }
          s.notifications.unshift({
            id: randomUUID(),
            title: drive.company + ' · ' + p.stage,
            text: drive.title,
            route: '/career?tab=applications',
            read: false
          });
          s.version++;
          saveProfile(s);
          changed.push(s.profile.id);
        }
        result = {
          id: drive.id,
          recipients: changed.length
        };
      } else throw new Error('Unsupported staff action.');
      campus.version++;
      campus.audit.unshift({
        id: randomUUID(),
        action: type,
        actor: actor.profile.name,
        title: p.title || campus.items.find(i => i.id === p.id)?.title || p.name || 'College workspace update',
        recipients: result.recipients || changed.length,
        time: now()
      });
      campus.audit = campus.audit.slice(0, 150);
      saveCampus(campus);
      if (['item.save', 'item.publish'].includes(type)) {
        const item = campus.items.find(i => i.id === result.id);
        if (item?.status === 'published') onPublished(actor, item);
      }
      onAudit(actor, type, p, result);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    for (const id of new Set([...changed, actor.profile.id])) broadcast(id);
    return {
      result
    };
  }
  function studentAction(state, type, p) {
    if (type === 'campus-drive.applied') {
      const campus = getCampus(campusKey(state.profile)),
        drive = campus.drives.find(d => d.id === p.id),
        application = drive?.applications.find(a => a.studentId === state.profile.id);
      if (!application) throw new Error('Drive not found for your workspace.');
      if (drive.status !== 'Open' || drive.deadline && drive.deadline < dateKey()) throw new Error('This drive is closed for applications.');
      const match = eligibility(state.profile, drive.eligibility || {});
      if (!match.eligible) throw new Error(match.reasons.join(' '));
      if (application.status === 'Invited') {
        application.status = 'Applied';
        application.updatedAt = now();
        const local = state.campusDrives?.find(d => d.id === p.id);
        if (local) local.status = 'Applied';
        if (!state.applications.some(a => a.driveId === p.id)) state.applications.push({
          id: randomUUID(),
          driveId: p.id,
          title: drive.title,
          company: drive.company,
          date: dateKey(),
          status: 'Applied'
        });
        campus.version++;
        saveCampus(campus);
      }
      return true;
    }
    return false;
  }
  function ensureDemo() {
    let campus = getCampus(demoCollegeId);
    if (campus.rosterSeeded) return;
    if (!readProfile('demo-bhavanisingh')) saveProfile(createProfile({
      mode: 'demo'
    }));
    const names = ['Ananya Rao', 'Riya Mehta', 'Kabir Sethi', 'Dev Patel', 'Sana Khan', 'Ishaan Reddy', 'Meera Nair', 'Arjun Das', 'Priya Menon', 'Aditya Verma', 'Nisha Gupta', 'Rohan Shah', 'Zoya Ali', 'Karthik Rao', 'Tanya Joshi'];
    for (const [i, name] of names.entries()) {
      const handle = 'campus.' + name.toLowerCase().replaceAll(' ', '.'),
        s = createProfile({
          name,
          handle,
          college: demoCollege
        });
      s.profile = {
        ...s.profile,
        id: 'demo-roster-' + i,
        isDemo: true,
        syntheticRoster: true,
        onboardingDone: true,
        collegeId: demoCollegeId,
        year: 4 - i % 4,
        department: i % 5 === 0 ? 'Information Technology' : i % 7 === 0 ? 'Electronics' : 'Computer Science',
        section: i % 3 === 0 ? 'B' : 'A',
        track: catalog.tracks[i % catalog.tracks.length],
        studentId: `DEMO-${String(i + 2).padStart(3, '0')}`,
        cgpa: Number((6.4 + i * 7 % 29 / 10).toFixed(1))
      };
      const base = [88, 76, 62, 33, 81, 51, 71, 22, 67, 90, 46, 58, 84, 40, 73][i];
      s.skills = Object.fromEntries(Object.keys(s.skills).map((key, n) => [key, Math.max(8, Math.min(98, base + (i + n * 5) % 17 - 8))]));
      s.journey.totalDays = 365 * (5 - s.profile.year);
      s.journey.day = Math.min(s.journey.totalDays, 40 + i * 16);
      s.journey.xp = 2000 + i * 650;
      s.practiceCompleted = catalog.problems.filter(p => p.external).slice(0, 25 + i * 17).map(p => p.id);
      s.activity = s.activity.map((a, n) => ({
        ...a,
        count: i % 6 === 0 && n > 355 ? 0 : n % 7 === 0 ? 0 : (n + i) % 5
      }));
      s.resumeProjects = catalog.projects.slice(0, base >= 75 ? 3 : base >= 50 ? 1 : 0).map(p => p.id);
      s.projectProgress = Object.fromEntries(catalog.projects.map(p => [p.id, p.steps.slice(0, s.resumeProjects.includes(p.id) ? p.steps.length : 2).map((_, i) => i)]));
      s.courseProgress = Object.fromEntries(catalog.courses.map(c => [c.id, Math.floor(c.lessons * base / 100)]));
      s.skillHistory = Array.from({
        length: 6
      }, (_, n) => ({
        date: dayAfter(-(5 - n) * 7),
        skills: Object.fromEntries(Object.entries(s.skills).map(([k, v]) => [k, Math.max(0, v - (5 - n) * 3)]))
      }));
      s.tasks = [];
      s.resume = {
        ...s.resume,
        headline: s.profile.track + ' student',
        education: `Demo college record · Year ${s.profile.year}`,
        summary: `Demo profile exploring ${s.profile.track.toLowerCase()}.`,
        email: '',
        github: ''
      };
      saveProfile(s);
    }
    campus.rosterSeeded = true;
    campus.cohorts = [{
      id: 'final-year',
      name: 'Final-year placement batch',
      filters: {
        year: '4'
      }
    }, {
      id: 'builders',
      name: 'Full-stack builders',
      filters: {
        track: 'Full-stack development'
      }
    }, {
      id: 'check-ins',
      name: 'Mentor check-ins',
      filters: {
        support: true
      }
    }];
    saveCampus(campus);
    const actor = createStaffProfile('teacher');
    const result = mutate(actor, 'item.save', {
      kind: 'Assignment',
      title: 'API design: build, validate, explain',
      description: 'Build a small REST API for a campus event board. Include input validation, clear error responses, a README, and examples of successful and failed requests. Submit your repository link and explain one important design decision.',
      subject: 'Web engineering',
      deadline: dayAfter(5),
      maxPoints: 100,
      audience: {
        scope: 'filter',
        filters: {
          year: '3'
        }
      },
      publish: true
    });
    const published = getCampus(demoCollegeId).items.find(i => i.id === result.result.id);
    for (const [i, id] of published.targetIds.filter(id => id !== 'demo-bhavanisingh').slice(0, 2).entries()) {
      const s = readProfile(id),
        a = s.assignments.find(a => a.id === published.id);
      a.submission = 'Demo submission: implemented CRUD endpoints, validated missing titles, added HTTP 400 responses and a README with examples. My next improvement is integration testing.';
      a.submittedAt = now();
      a.status = i === 0 ? 'submitted' : 'graded';
      if (i) {
        a.grade = 86;
        a.feedback = 'Clear endpoints and useful error handling. Add tests for duplicate registrations.';
        a.reviewedBy = actor.profile.name;
      }
      saveProfile(s);
    }
    mutate(actor, 'item.save', {
      kind: 'Project',
      title: 'A project worth explaining in an interview',
      description: 'Choose one existing project. Document the user problem, sketch the main flow, and build the smallest useful version. Keep your repository and write down your tradeoffs.',
      subject: 'Portfolio lab',
      projectId: 'campus',
      deadline: dayAfter(10),
      audience: {
        scope: 'filter',
        filters: {
          year: '2'
        }
      },
      publish: false
    });
  }
  return {
    publishDue: () => {
      for (const row of db.prepare('SELECT document FROM campuses').all()) {
        const c = JSON.parse(row.document);
        for (const item of c.items.filter(i => i.status === 'draft' && i.scheduleAt && Date.parse(i.scheduleAt) <= Date.now())) {
          const author = readProfile(item.authorId);
          if (!author || author.profile.suspended || !can(author.profile, 'content.publish')) continue;
          try {
            mutate(author, 'item.publish', {
              id: item.id
            });
          } catch (e) {
            console.error(JSON.stringify({
              event: 'publication.failed',
              itemId: item.id,
              message: e.message
            }));
          }
        }
      }
    },
    staffData,
    studentDetail,
    mutate,
    resolveAudience,
    ensureDemo,
    studentAction,
    getCampus,
    allStudents
  };
}
