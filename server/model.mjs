import { recordCourseCompletion } from './certificates.mjs';
import { learningResources } from '../shared/learning-library.js';
import { careerAction } from './career.mjs';
import { queueCollegeWork, balanceDay, captureMissedWork, applyRevision, settleRevision, queueRecall, scheduleRecall, completeRecall } from './planning.mjs';
import { randomUUID } from 'node:crypto';
import { courses, quizzes, projects, jobs, events, tracks, problems, legacyJobs, legacyEvents, catalog } from '../shared/catalog.js';
import { missionFor, syncPlan, calendarDay, buildPlan, defaultPlanDays, addDays } from '../shared/journey.js';
import { assessmentLabs } from '../shared/assessments.js';
import { getPath, lessonNames } from '../shared/paths.js';
import { validateProfileUpdate, object } from '../shared/validation.js';
import { addEvidence, evidenceSummary, readinessDetails } from './evidence.mjs';
import { getLesson } from '../shared/curriculum.js';
import { practiceRoles } from '../shared/practice-roles.js';
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});
export function dateKey(date = new Date()) {
  return dateFormatter.format(date);
}
const uid = () => randomUUID();
export function createState() {
  const today = dateKey();
  const activity = Array.from({
    length: 182
  }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (181 - i));
    return {
      date: dateKey(date),
      count: i > 169 ? 2 + i % 4 : i % 7 === 0 || i % 11 === 0 ? 0 : (i * 7 + 3) % 5
    };
  });
  return {
    version: 1,
    profile: {
      name: 'Aarav Shah',
      handle: 'aarav.builds',
      year: 3,
      track: 'Full-stack development',
      level: 'Getting comfortable',
      dailyMinutes: 75,
      weeklyDays: 5,
      onboardingDone: false,
      bio: 'Learning by building. Currently making friends with the backend.',
      studentId: 'NIT23CS047',
      college: 'Northstar Institute of Technology',
      autoResume: true,
      notifications: true
    },
    skills: {
      DSA: 68,
      Frontend: 78,
      Backend: 56,
      Databases: 62,
      DevOps: 35,
      Communication: 74
    },
    journey: {
      day: 48,
      totalDays: 730,
      xp: 1840,
      restDays: []
    },
    tasks: [{
      id: 'daily-code',
      title: 'A little two-pointer practice',
      detail: 'Solve a warm-up and explain your approach.',
      category: 'DSA',
      kind: 'coding',
      minutes: 20,
      xp: 40,
      status: 'completed',
      date: today,
      seeded: true
    }, {
      id: 'daily-learn',
      title: 'Get comfortable with React state',
      detail: 'Continue your course · lesson 15 of 24.',
      category: 'Frontend',
      kind: 'course',
      minutes: 15,
      xp: 30,
      status: 'completed',
      date: today,
      seeded: true
    }, {
      id: 'daily-build',
      title: 'Give your project its first API',
      detail: 'Campus, connected. · Build your event endpoint.',
      category: 'Backend',
      kind: 'project',
      minutes: 30,
      xp: 80,
      status: 'pending',
      date: today
    }, {
      id: 'daily-interview',
      title: 'Tell your story in 90 seconds',
      detail: 'A short interview warm-up. You have got this.',
      category: 'Communication',
      kind: 'interview',
      minutes: 10,
      xp: 40,
      status: 'pending',
      date: today
    }],
    activity,
    courseProgress: Object.fromEntries(courses.map(c => [c.id, c.completed])),
    lessonCompletions: {},
    solved: ['valid-parentheses'],
    quizAttempts: [],
    projectProgress: {
      campus: [0, 1]
    },
    resumeProjects: [],
    registrations: [],
    savedJobs: ['orbit'],
    applications: [{
      id: 'app-1',
      jobId: 'pixel',
      company: 'Pixelworks',
      title: 'Frontend Engineering Intern',
      status: 'Applied',
      date: today
    }, {
      id: 'app-2',
      company: 'Luma Studio',
      title: 'Product Engineering Intern',
      status: 'Interview',
      date: today
    }],
    following: ['riya'],
    likes: [],
    comments: {},
    posts: [{
      id: 'post-1',
      author: 'riya',
      text: 'Shipped my first full-stack project today! A campus lost & found board, built with React and Node. The best part? Someone already found their water bottle. 🥹\n\nSmall projects. Real problems. So much learning.',
      tag: 'Built something',
      likes: 24,
      time: new Date(Date.now() - 3600000).toISOString(),
      project: 'Campus lost & found',
      projectDetail: 'React · Node.js · A little persistence',
      color: 'purple'
    }, {
      id: 'post-2',
      author: 'kabir',
      text: 'Anyone looking for a teammate for the Campus Buildathon? I can help with the backend and I make excellent debugging playlists. 🎧\n\nThinking about something that helps first-year students settle in.',
      tag: 'Finding my team',
      likes: 18,
      time: new Date(Date.now() - 10800000).toISOString()
    }, {
      id: 'post-3',
      author: 'ananya',
      text: 'A tiny SQL tip that finally clicked for me: WHERE filters the rows going in. HAVING filters the groups coming out.\n\nIf you are practising joins this week, happy to exchange questions!',
      tag: 'A little learning',
      likes: 42,
      time: new Date(Date.now() - 21600000).toISOString()
    }],
    messages: [{
      id: uid(),
      thread: 'global',
      author: 'kabir',
      text: 'Buildathon team matching is open! Who is building something for campus?',
      time: new Date(Date.now() - 7200000).toISOString()
    }, {
      id: uid(),
      thread: 'global',
      author: 'riya',
      text: 'I am in! Happy to help with frontend. ✨',
      time: new Date(Date.now() - 7000000).toISOString()
    }, {
      id: uid(),
      thread: 'riya',
      author: 'riya',
      text: 'Hey Aarav! How is your campus project coming along? Would love to see what you are building.',
      time: new Date(Date.now() - 5400000).toISOString()
    }],
    assignments: [{
      id: 'assignment-1',
      title: 'Database design for a campus library',
      teacher: 'Prof. Neha Iyer',
      subject: 'Database management',
      deadline: '2026-10-25',
      description: 'Design tables for books, members, and loans. Include primary and foreign keys. Submit a short explanation and your SQL schema.',
      status: 'pending',
      submission: ''
    }, {
      id: 'assignment-2',
      title: 'A reflection on your first API',
      teacher: 'Prof. Vikram Sen',
      subject: 'Web development',
      deadline: '2026-10-28',
      description: 'Describe an API you built or used. Explain the request, response, and one error case.',
      status: 'pending',
      submission: ''
    }],
    notifications: [{
      id: 'note-1',
      title: 'A good week to build something',
      text: 'Campus Buildathon registration is open. Find your team in Community.',
      route: '/events',
      read: false
    }, {
      id: 'note-2',
      title: 'A new assignment from Prof. Iyer',
      text: 'Database design for a campus library · due 25 Oct',
      route: '/learn?tab=assignments',
      read: false
    }, {
      id: 'note-3',
      title: 'Your next step is ready',
      text: 'A 30-minute project session is waiting in your journey.',
      route: '/journey',
      read: true
    }],
    resume: {
      headline: 'Computer Science student · Aspiring full-stack developer',
      email: 'aarav.shah@example.com',
      location: 'Bengaluru, India',
      github: 'github.com/aarav-builds',
      summary: 'Third-year Computer Science student building thoughtful web applications. Comfortable with React and JavaScript, currently developing backend and database skills.',
      education: 'B.Tech in Computer Science · Northstar Institute of Technology · 2023–2027'
    }
  };
}
export function metrics(state) {
  const values = Object.values(state.skills);
  const detail = readinessDetails(state),
    readiness = detail.score;
  let streak = 0;
  const activityCounts = new Map(state.activity.map(a => [a.date, a.count]));
  let date = new Date();
  if (!activityCounts.get(dateKey(date))) date.setDate(date.getDate() - 1);
  while (activityCounts.get(dateKey(date)) > 0 && streak < 366) {
    streak++;
    date.setDate(date.getDate() - 1);
  }
  return {
    readinessDetails: detail,
    evidence: evidenceSummary(state),
    readiness,
    streak,
    completedToday: state.tasks.filter(t => t.date === dateKey() && t.status === 'completed').length,
    totalToday: state.tasks.filter(t => t.date === dateKey()).length,
    solved: (state.historicalSolved ?? 36) + new Set([...state.solved, ...(state.practiceCompleted || [])]).size,
    accuracy: state.quizAttempts.length ? Math.round(state.quizAttempts.reduce((sum, a) => sum + a.score, 0) / state.quizAttempts.length) : state.profile.isDemo ? 97 : state.profile.id ? 0 : 82,
    xp: state.journey.xp,
    jobMatches: Object.fromEntries([...legacyJobs, ...jobs].map(job => [job.id, Math.round(job.skills.reduce((sum, s) => sum + (detail.skillScores[s] || 0), 0) / job.skills.length)]))
  };
}
function personalizeStep(state, raw) {
  let item = {
    ...raw
  };
  if (item.kind === 'course') {
    const c = courses.find(c => c.id === item.resourceId),
      base = state.courseBaseProgress?.[item.resourceId] || 0;
    const next = c && Array.from({
      length: c.lessons
    }, (_, i) => i).find(i => i >= base && !(state.lessonCompletions[item.resourceId] || []).includes(i));
    if (next !== undefined) {
      item.lesson = next;
      item.title = lessonNames[item.resourceId]?.[next] || c.title;
    }
  }
  if (item.kind === 'course' && (item.lesson < (state.courseBaseProgress?.[item.resourceId] ?? 0) || (state.lessonCompletions[item.resourceId] || []).includes(item.lesson))) item = {
    ...item,
    kind: 'review',
    title: 'Recall: ' + item.title,
    resourceId: 'review-' + item.resourceId + '-' + item.lesson,
    xp: 20
  };
  if (item.kind === 'project') {
    let project = projects.find(p => p.id === item.resourceId);
    if (project && (state.projectProgress[project.id] || []).length === project.steps.length) {
      const candidate = projects.find(p => p.tags?.includes(state.profile.track) && (state.projectProgress[p.id] || []).length < p.steps.length);
      if (candidate) {
        project = candidate;
        item.resourceId = project.id;
      }
    }
    const next = project?.steps.findIndex((_, n) => !(state.projectProgress[project.id] || []).includes(n));
    if (next >= 0) {
      item.title = project.steps[next];
      item.step = next;
    } else item = {
      ...item,
      kind: 'review',
      title: 'Project review: explain a tradeoff and a regression test',
      resourceId: 'review-project-' + item.resourceId,
      xp: 20
    };
  }
  if (item.kind === 'coding' && (state.solved.includes(item.resourceId) || state.practiceCompleted?.includes(item.resourceId))) {
    const problem = catalog.problems.find(p => !state.solved.includes(p.id) && !state.practiceCompleted?.includes(p.id) && p.difficulty === catalog.problems.find(p => p.id === item.resourceId)?.difficulty);
    if (problem) item = {
      ...item,
      title: problem.title,
      resourceId: problem.id
    };else item = {
      ...item,
      kind: 'review',
      title: 'Revisit a problem and explain another approach',
      resourceId: 'review-' + item.resourceId,
      xp: 20
    };
  }
  return item;
}
export function ensureDailyPlan(state, key = dateKey()) {
  let changed = state.profile.id ? syncPlan(state, key) : false;
  if (state.profile.id && state.journey.targetDate < key) return changed;
  if (state.profile.id) {
    changed = captureMissedWork(state, key) || changed;
    const added = queueCollegeWork(state, key);
    const recalled = queueRecall(state, key);
    if (added || recalled) {
      balanceDay(state, key);
      changed = true;
    }
  }
  for (const task of state.tasks.filter(t => t.date === key && t.status !== 'completed' && t.id.includes('-mission-'))) {
    const adapted = personalizeStep(state, task);
    if (adapted.kind !== task.kind || adapted.resourceId !== task.resourceId || adapted.title !== task.title || adapted.step !== task.step) {
      Object.assign(task, adapted);
      changed = true;
    }
  }
  const existing = state.tasks.filter(task => task.date === key);
  if (existing.length && (!state.profile.id || existing.some(t => t.id.includes('-mission-')) || state.journey.advancedDates?.includes(key) || existing.reduce((n, t) => n + (t.minutes || 0), 0) >= state.profile.dailyMinutes)) return changed;
  const day = new Date(key + 'T12:00:00Z').getUTCDay(),
    active = state.profile.weeklyDays === 3 ? [1, 3, 5] : state.profile.weeklyDays === 6 ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
  if (!active.includes(day) || state.journey.restDays.includes(key)) return changed;
  if (state.profile.id) {
    const number = calendarDay(state.journey, key),
      mission = missionFor(state.profile, state.journey, number, catalog);
    for (const [i, raw] of mission.steps.entries()) {
      let item = personalizeStep(state, applyRevision(state, raw, key));
      state.tasks.push({
        ...item,
        id: key + '-mission-' + i,
        detail: mission.chapter,
        planDay: number,
        status: 'pending',
        date: key
      });
    }
    balanceDay(state, key);
    state.version++;
    return true;
  }
  const path = getPath(state.profile.track),
    budget = state.profile.dailyMinutes,
    templates = [['code', 'Practise one useful pattern', 'Explain your approach, then try it.', 'DSA', 'coding', .27, 40, 'two-sum'], ['learn', `Explore a ${path.focus.toLowerCase()} idea`, 'Read, understand, and try a small exercise.', path.focus, 'course', .2, 30, path.course], ['build', path.task, path.detail, path.focus, 'project', .4, 60, path.project], ['interview', 'Tell a little story about what you learned', 'A short interview warm-up.', 'Communication', 'interview', .13, 40, null]];
  for (const [id, title, detail, category, kind, ratio, xp, resourceId] of templates) state.tasks.push({
    id: `${key}-${id}`,
    title,
    detail,
    category,
    kind,
    minutes: Math.max(5, Math.round(budget * ratio)),
    xp,
    resourceId,
    status: 'pending',
    date: key
  });
  state.version++;
  return true;
}
function text(value, max = 2000) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Please enter a value.');
  return value.trim().slice(0, max);
}
function record(state, skill, xp = 20, improvement = 1) {
  const key = dateKey();
  let entry = state.activity.find(a => a.date === key);
  if (!entry) state.activity.push(entry = {
    date: key,
    count: 0
  });
  entry.count++;
  state.journey.xp += xp;
  if (skill in state.skills) state.skills[skill] = Math.min(100, state.skills[skill] + improvement);
}
function award(state, evidence) {
  if (addEvidence(state, evidence)) record(state, evidence.skill, evidence.xp || 0, evidence.improvement || 0);
}
export function applyAction(state, type, p = {}) {
  if (typeof type !== 'string' || type.length > 100) throw new Error('Choose a valid action.');
  object(p, 'Action payload');
  if (type.startsWith('quiz.') && p.answers !== undefined && !Array.isArray(p.answers)) throw new Error('Quiz answers must be a list.');
  if (['lesson.draft', 'learning.bookmark', 'course.complete'].includes(type) && (!Number.isSafeInteger(p.lesson) || p.lesson < 0)) throw new Error('Choose a valid lesson number.');
  if (type === 'project.step' && (!Number.isSafeInteger(p.step) || p.step < 0)) throw new Error('Choose a valid project step.');
  let result = {};
  switch (type) {
    case 'practice.preferences':
      {
        if (!['all', ...practiceRoles.map(r => r.id)].includes(p.roleId) || !['auto', 'All levels', 'Foundation', 'Intermediate', 'Advanced'].includes(p.level) || !['recommended', 'gaps'].includes(p.focus)) throw new Error('Choose a valid practice role, level and focus.');
        state.practicePreferences = {
          roleId: p.roleId,
          level: p.level,
          focus: p.focus
        };
        if (p.roleId !== 'all') state.profile.practiceRole = p.roleId;
        break;
      }
    case 'task.complete':
      {
        const task = state.tasks.find(t => t.id === p.id);
        if (!task) throw new Error('Task not found.');
        if (task.status === 'completed') break;
        if (!['event', 'campus-event', 'manual'].includes(task.kind)) throw new Error('Open this task and complete its linked activity first.');
        if (task.date !== dateKey()) throw new Error('Complete activities from today’s plan.');
        task.status = 'completed';
        award(state, {
          key: 'task:' + task.id,
          kind: task.kind,
          resourceId: task.resourceId || task.id,
          skill: task.category,
          xp: task.xp,
          verification: 'self-reported'
        });
        break;
      }
    case 'profile.update':
      {
        validateProfileUpdate(p, tracks);
        const allowed = ['name', 'bio', 'track', 'level', 'dailyMinutes', 'weeklyDays', 'autoResume', 'notifications', 'onboardingDone'];
        for (const key of allowed) if (p[key] !== undefined) state.profile[key] = typeof p[key] === 'string' ? key === 'bio' ? p[key].trim().slice(0, 300) : text(p[key], 100) : p[key];
        if (p.track && !tracks.includes(p.track)) throw new Error('Choose a supported learning path.');
        if (p.track) {
          const path = getPath(p.track);
          for (const task of state.tasks) {
            if (task.id === 'daily-build' && task.status !== 'completed') {
              task.title = path.task;
              task.detail = path.detail;
              task.category = path.focus;
              task.resourceId = path.project;
            }
            if (task.id === 'daily-learn' && task.status !== 'completed') {
              task.title = `Explore your next ${path.focus.toLowerCase()} idea`;
              task.resourceId = path.course;
            }
          }
        }
        if (p.year !== undefined) {
          if (![1, 2, 3, 4].includes(Number(p.year))) throw new Error('Choose a year from 1 to 4.');
          state.profile.year = Number(p.year);
          state.journey.totalDays = state.journey.fullDegree ? 1460 : state.profile.id ? defaultPlanDays(p.year) : 365 * (5 - Number(p.year));
          state.journey.targetDate = addDays(state.journey.startedAt || dateKey(), state.journey.totalDays - 1);
          state.journey.day = Math.min(state.journey.day, state.journey.totalDays);
        }
        if (Array.isArray(p.onboardingAnswers) && p.onboardingAnswers.length === 12) state.profile.onboardingAnswers = p.onboardingAnswers;
        if (!Number.isFinite(Number(state.profile.dailyMinutes))) throw new Error('Choose valid daily minutes.');
        if (!state.profile.id && state.profile.year < 4 && !state.tasks.some(t => t.kind === 'event')) state.tasks.push({
          id: 'weekly-event',
          title: 'Explore an open-source event',
          detail: 'Find a real event, check requirements, and plan a contribution.',
          category: 'Communication',
          kind: 'event',
          minutes: 20,
          xp: 40,
          status: 'pending',
          date: dateKey()
        });
        if (state.profile.year === 4) state.tasks = state.tasks.filter(t => t.id !== 'weekly-event');
        if (state.profile.id && (p.track || p.year || p.dailyMinutes || p.weeklyDays)) {
          const done = state.tasks.filter(t => t.date === dateKey() && t.status === 'completed');
          state.tasks = state.tasks.filter(t => t.date !== dateKey());
          ensureDailyPlan(state);
          for (const task of state.tasks.filter(t => t.date === dateKey())) if (done.some(t => t.kind === task.kind && t.resourceId === task.resourceId && t.lesson === task.lesson)) task.status = 'completed';
        }
        break;
      }
    case 'plan.configure':
      {
        const plan = buildPlan(state.profile, dateKey(), p);
        state.previousPlans ||= [];
        state.previousPlans.push({
          startedAt: state.journey.startedAt,
          totalDays: state.journey.totalDays,
          day: state.journey.day,
          completedDays: state.journey.completedDays || []
        });
        state.previousPlans = state.previousPlans.slice(-10);
        state.profile.dailyMinutes = Number(p.dailyMinutes || state.profile.dailyMinutes);
        state.profile.weeklyDays = Number(p.weeklyDays || state.profile.weeklyDays);
        state.journey = {
          ...plan,
          revision: (state.journey.revision || 0) + 1,
          xp: state.journey.xp,
          baseline: metrics(state).readiness
        };
        state.tasks = state.tasks.filter(t => t.date !== dateKey());
        ensureDailyPlan(state);
        break;
      }
    case 'review.complete':
      {
        const task = state.tasks.find(t => t.kind === 'review' && t.date === dateKey() && t.resourceId === p.id);
        if (!task) throw new Error('Open a reflection from today’s plan.');
        const explanation = text(p.explanation, 3000),
          example = text(p.example, 2000),
          risk = text(p.risk, 2000);
        if (explanation.length < 40 || example.length < 20 || risk.length < 20) throw new Error('Add a useful explanation, concrete example, and a risk or test.');
        state.reflections ||= [];
        if (task.status !== 'completed') {
          state.reflections.push({
            id: uid(),
            resourceId: p.id,
            date: dateKey(),
            explanation,
            example,
            risk
          });
          task.status = 'completed';
          award(state, {
            key: 'reflection:' + task.id,
            kind: 'review',
            resourceId: p.id,
            skill: task.category,
            xp: task.xp,
            verification: 'self-reported'
          });
          completeRecall(state, p.id, dateKey());
        }
        break;
      }
    case 'assessment.start':
      {
        const lab = assessmentLabs.find(l => l.id === p.id);
        if (!lab) throw new Error('Assessment not found.');
        state.assessmentSessions ||= [];
        const mode = p.mode === 'timed' ? 'timed' : 'practice';
        let session = state.assessmentSessions.find(a => a.labId === p.id && a.mode === mode && !a.submitted && (!a.deadline || a.deadline > Date.now()));
        if (!session) {
          session = {
            id: uid(),
            labId: p.id,
            mode,
            startedAt: Date.now(),
            deadline: mode === 'timed' ? Date.now() + lab.minutes * 60000 : null
          };
          state.assessmentSessions.push(session);
        }
        result = {
          session
        };
        break;
      }
    case 'assessment.draft':
      {
        if (!assessmentLabs.some(l => l.id === p.id) || typeof p.code !== 'string' || p.code.length > 12000) throw new Error('Use a valid lab and a solution under 12,000 characters.');
        state.assessmentDrafts ||= {};
        state.assessmentDrafts[p.id] = {
          code: p.code,
          explanation: String(p.explanation || '').slice(0, 2000),
          updatedAt: new Date().toISOString()
        };
        break;
      }
    case 'rest.add':
      {
        const date = text(p.date, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Choose a valid date.');
        if (new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) !== date || date < dateKey()) throw new Error('Choose today or a future date.');
        if (!state.journey.restDays.includes(date)) state.journey.restDays.push(date);
        state.tasks = state.tasks.filter(t => t.date !== date || t.status === 'completed' || !t.id.includes('-mission-'));
        break;
      }
    case 'rest.period':
      {
        const start = String(p.start || ''),
          end = String(p.end || '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start < dateKey() || end < start || Date.parse(end) - Date.parse(start) > 30 * 86400000 || ![start, end].every(d => Number.isFinite(Date.parse(d + 'T12:00:00Z')) && new Date(d + 'T12:00:00Z').toISOString().slice(0, 10) === d)) throw new Error('Choose a break of 1–31 days starting today or later.');
        for (let d = start; d <= end; d = addDays(d, 1)) {
          if (new Date(d + 'T12:00:00Z').toISOString().slice(0, 10) !== d) throw new Error('Choose valid calendar dates.');
          if (!state.journey.restDays.includes(d)) state.journey.restDays.push(d);
        }
        state.journey.breaks ||= [];
        state.journey.breaks.push({
          start,
          end,
          reason: String(p.reason || 'Exam / recovery break').slice(0, 200)
        });
        state.tasks = state.tasks.filter(t => t.status === 'completed' || t.date < start || t.date > end || !t.id.includes('-mission-'));
        break;
      }
    case 'interview.complete':
      {
        const session = state.interviewSessions?.find(s => s.id === p.sessionId && s.status === 'completed');
        if (!session) throw new Error('Complete a saved interview session first.');
        const key = dateKey();
        state.interviewDays ||= [];
        if (!state.interviewDays.includes(key)) state.interviewDays.push(key);
        award(state, {
          key: 'interview:' + session.id,
          kind: 'interview',
          resourceId: session.id,
          skill: 'Communication',
          score: session.score || 0,
          verification: session.verification || 'guided-practice',
          xp: 40,
          improvement: session.verification === 'ai-reviewed' && session.score >= 67 ? 1 : 0
        });
        const task = state.tasks.find(t => t.kind === 'interview' && t.date === key);
        if (task) task.status = 'completed';
        break;
      }
    case 'lesson.draft':
      {
        const lesson = getLesson(p.id, Number(p.lesson));
        if (!lesson) throw new Error('Lesson not found.');
        if (p.answer !== null && p.answer !== undefined && (!Number.isInteger(p.answer) || p.answer < 0 || p.answer >= lesson.options.length)) throw new Error('Choose a valid answer.');
        state.lessonDrafts ||= {};
        state.lessonDrafts[lesson.id] = {
          answer: p.answer ?? null,
          reflection: String(p.reflection || '').slice(0, 3000),
          updatedAt: new Date().toISOString()
        };
        break;
      }
    case 'learning.note':
      {
        state.learningNotes ||= [];
        const title = text(p.title, 140),
          body = text(p.body, 5000);
        let note = p.noteId && state.learningNotes.find(n => n.id === p.noteId);
        if (p.noteId && !note) throw new Error('Note not found.');
        if (note) Object.assign(note, {
          title,
          body,
          updatedAt: new Date().toISOString()
        });else state.learningNotes.push({
          id: uid(),
          title,
          body,
          courseId: p.courseId || null,
          lesson: p.lesson ?? null,
          updatedAt: new Date().toISOString()
        });
        break;
      }
    case 'learning.resource.save':
      {
        if (!learningResources.some(r => r.id === p.id)) throw new Error('Learning resource not found.');
        state.savedLearningResources ||= [];
        const found = state.savedLearningResources.indexOf(p.id);
        if (found >= 0) state.savedLearningResources.splice(found, 1);else state.savedLearningResources.push(p.id);
        break;
      }
    case 'learning.bookmark':
      {
        const lesson = getLesson(p.id, Number(p.lesson));
        if (!lesson) throw new Error('Lesson not found.');
        state.bookmarks ||= [];
        const index = state.bookmarks.findIndex(b => b.resourceId === lesson.id);
        if (index >= 0) state.bookmarks.splice(index, 1);else state.bookmarks.push({
          resourceId: lesson.id,
          courseId: p.id,
          lesson: Number(p.lesson),
          title: lesson.title,
          date: dateKey()
        });
        break;
      }
    case 'course.complete':
      {
        const course = courses.find(c => c.id === p.id),
          lesson = Number(p.lesson),
          content = getLesson(p.id, lesson);
        if (!course || !content || !Number.isInteger(lesson)) throw new Error('Lesson not found.');
        const base = state.courseBaseProgress?.[p.id] ?? course.completed,
          completed = state.lessonCompletions[p.id] || [];
        if (lesson < base || completed.includes(lesson)) {
          result = {
            passed: true,
            alreadyCompleted: true,
            feedback: content.explanation
          };
          break;
        }
        if (!Number.isInteger(p.answer) || p.answer < 0 || p.answer >= content.options.length) throw new Error('Complete the lesson knowledge check.');
        const reflection = text(p.reflection, 3000);
        if (reflection.length < 20) throw new Error('Explain your reasoning in at least 20 characters.');
        const passed = p.answer === content.correct;
        state.lessonAttempts ||= [];
        state.lessonAttempts.push({
          id: uid(),
          resourceId: content.id,
          answer: p.answer,
          passed,
          reflection,
          date: dateKey(),
          version: content.version
        });
        result = {
          passed,
          feedback: content.explanation
        };
        state.lessonDrafts ||= {};
        state.lessonDrafts[content.id] = {
          answer: p.answer,
          reflection,
          updatedAt: new Date().toISOString()
        };
        if (!passed) break;
        scheduleRecall(state, {
          ...content,
          skill: course.category
        }, dateKey());
        state.lessonCompletions[p.id] ||= [];
        state.lessonCompletions[p.id].push(lesson);
        state.courseProgress[p.id] = Math.min(course.lessons, base + state.lessonCompletions[p.id].length);
        recordCourseCompletion(state, p.id);
        award(state, {
          key: `lesson:${p.id}:${lesson}`,
          kind: 'lesson',
          resourceId: content.id,
          skill: course.category,
          xp: 30,
          improvement: 1,
          verification: 'server-checked',
          detail: 'Lesson concept check with saved learner explanation; not a code execution assessment.'
        });
        break;
      }
    case 'quiz.start':
      {
        const assignment = p.assignmentId && state.assignments.find(a => a.id === p.assignmentId);
        if (p.assignmentId && (!assignment || assignment.kind !== 'Quiz' || assignment.quizId !== p.id)) throw new Error('Assigned quiz not found.');
        const quiz = assignment?.quiz || quizzes.find(q => q.id === p.id) || state.assignments.find(a => a.quizId === p.id && a.quiz)?.quiz;
        if (!quiz) throw new Error('Quiz not found.');
        if (assignment?.status === 'graded') throw new Error('This assignment has a final grade. Open the quiz separately for practice.');
        if (assignment?.deadline && assignment.deadline < dateKey() && assignment.latePolicy === 'closed') throw new Error('This assignment is closed. Ask your teacher for an extension.');
        const previous = state.quizAttempts.filter(a => a.assignmentId === p.assignmentId && p.assignmentId);
        if (assignment && previous.length >= (assignment.maxAttempts || 1) && assignment.status !== 'revision requested') throw new Error('You have used the allowed attempts.');
        state.quizSessions ||= [];
        let session = state.quizSessions.find(s => s.quizId === p.id && (s.assignmentId || null) === (p.assignmentId || null) && !s.submitted && (!s.deadline || s.deadline > Date.now()));
        if (!session) {
          session = {
            id: uid(),
            quizId: p.id,
            assignmentId: p.assignmentId || null,
            startedAt: Date.now(),
            deadline: assignment?.timeLimit ? Date.now() + assignment.timeLimit * 60000 : null,
            answers: Array(quiz.questions.length).fill(null)
          };
          state.quizSessions.push(session);
        }
        result = {
          session
        };
        break;
      }
    case 'quiz.draft':
      {
        const session = state.quizSessions?.find(s => s.id === p.sessionId && !s.submitted);
        if (!session) throw new Error('Start this quiz first.');
        if (!Array.isArray(p.answers) || p.answers.length !== session.answers.length || p.answers.some(a => a !== null && (!Number.isInteger(a) || a < 0 || a > 9))) throw new Error('Invalid quiz answers.');
        session.answers = p.answers;
        break;
      }
    case 'quiz.submit':
      {
        const assignment = p.assignmentId && state.assignments.find(a => a.id === p.assignmentId);
        if (p.assignmentId && (!assignment || assignment.kind !== 'Quiz' || assignment.quizId !== p.id)) throw new Error('Assigned quiz not found.');
        const quiz = assignment?.quiz || quizzes.find(q => q.id === p.id) || state.assignments.find(a => a.quizId === p.id && a.quiz)?.quiz;
        if (!quiz || !Array.isArray(p.answers) || p.answers.length !== quiz.questions.length || p.answers.some((a, i) => !Number.isInteger(a) || a < 0 || a >= quiz.questions[i].options.length)) throw new Error('Answer every question before submitting.');
        const session = p.sessionId && state.quizSessions?.find(s => s.id === p.sessionId && s.quizId === p.id && (s.assignmentId || null) === (p.assignmentId || null));
        if (assignment && !session) throw new Error('Start the assigned quiz before submitting.');
        if (session?.submitted) throw new Error('This attempt is already submitted.');
        if (session?.deadline && session.deadline < Date.now()) throw new Error('This timed attempt has ended.');
        if (assignment?.status === 'graded') throw new Error('This assignment already has a final grade.');
        if (assignment?.deadline && assignment.deadline < dateKey() && assignment.latePolicy === 'closed') throw new Error('This assignment is closed.');
        const correct = quiz.questions.filter((q, i) => q.correct === p.answers[i]).length,
          score = Math.round(correct / quiz.questions.length * 100);
        result = {
          score,
          correct,
          total: quiz.questions.length,
          review: quiz.questions.map((q, i) => ({
            correct: q.correct,
            explanation: q.explanation,
            passed: q.correct === p.answers[i]
          }))
        };
        const best = Math.max(0, ...state.quizAttempts.filter(a => a.quizId === p.id).map(a => a.score));
        const attempt = {
          id: uid(),
          quizId: p.id,
          assignmentId: p.assignmentId || null,
          sessionId: session?.id || null,
          date: dateKey(),
          time: new Date().toISOString(),
          score,
          verification: 'server-checked',
          answers: p.answers
        };
        state.quizAttempts.push(attempt);
        if (session) {
          session.submitted = true;
          session.answers = p.answers;
        }
        if (score > best) award(state, {
          key: `quiz:${p.id}:best:${score}`,
          kind: 'quiz',
          resourceId: p.id,
          skill: quiz.topic,
          score,
          verification: 'server-checked',
          xp: Math.round((score - best) / 2),
          improvement: score >= 67 && best < 67 ? 2 : 0
        });
        if (assignment) {
          assignment.attempts ||= [];
          assignment.attempts.push(attempt.id);
          assignment.submission = `Quiz completed: ${correct}/${result.total} correct (${score}%).`;
          assignment.status = 'graded';
          assignment.grade = Math.round(score / 100 * assignment.maxPoints);
          assignment.feedback = 'Automatically scored from this assignment attempt. Practice attempts do not change this grade.';
          assignment.submittedAt = attempt.time;
          assignment.reviewedBy = 'StudentOS quiz grading';
        }
        break;
      }
    case 'coding.submit':
      {
        if (!problems.some(q => q.id === p.id)) throw new Error('Problem not found.');
        if (!state.solved.includes(p.id)) {
          state.solved.push(p.id);
          award(state, {
            key: 'coding:' + p.id,
            kind: 'coding',
            resourceId: p.id,
            skill: 'DSA',
            xp: 50,
            verification: 'browser-checked'
          });
        }
        break;
      }
    case 'practice.track':
      {
        if (!catalog.problems.some(q => q.id === p.id)) throw new Error('Problem not found.');
        state.practiceCompleted ||= [];
        if (!state.practiceCompleted.includes(p.id) && !state.solved.includes(p.id)) {
          state.practiceCompleted.push(p.id);
          award(state, {
            key: 'external:' + p.id,
            kind: 'external-practice',
            resourceId: p.id,
            skill: 'DSA',
            xp: 30,
            verification: 'self-reported'
          });
        }
        break;
      }
    case 'project.step':
      {
        const project = projects.find(x => x.id === p.id);
        const step = Number(p.step);
        if (!project || !Number.isInteger(step) || step < 0 || step >= project.steps.length) throw new Error('Project step not found.');
        const done = state.projectProgress[p.id] ||= [];
        if (!done.includes(step)) {
          done.push(step);
          award(state, {
            key: `project:${p.id}:${step}`,
            kind: 'project',
            resourceId: p.id + ':' + step,
            skill: project.skills[step % project.skills.length],
            xp: 60,
            verification: 'self-reported'
          });
        }
        if (done.length === project.steps.length && state.profile.autoResume && !state.resumeProjects.includes(p.id)) state.resumeProjects.push(p.id);
        break;
      }
    case 'resume.project':
      {
        const project = projects.find(x => x.id === p.id);
        if (!project || (state.projectProgress[p.id] || []).length !== project.steps.length) throw new Error('Finish your project milestones before adding it to your resume.');
        if (!state.resumeProjects.includes(p.id)) state.resumeProjects.push(p.id);
        break;
      }
    case 'resume.update':
      if (p.github) {
        const u = new URL(p.github);
        if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password) throw new Error('Use a full HTTP or HTTPS portfolio URL.');
      }
      if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) throw new Error('Enter a valid resume email.');
      state.resumeHistory ||= [];
      state.resumeHistory.push({
        resume: structuredClone(state.resume),
        time: new Date().toISOString()
      });
      state.resumeHistory = state.resumeHistory.slice(-30);
      for (const key of ['headline', 'email', 'location', 'github', 'summary', 'education', 'skills']) if (p[key] !== undefined) state.resume[key] = typeof p[key] === 'string' ? p[key].trim().slice(0, key === 'summary' ? 1800 : 200) : state.resume[key];
      break;
    case 'job.save':
      if (![...jobs, ...legacyJobs].some(j => j.id === p.id)) throw new Error('Opportunity not found.');
      state.savedJobs = state.savedJobs.includes(p.id) ? state.savedJobs.filter(x => x !== p.id) : [...state.savedJobs, p.id];
      break;
    case 'job.track':
      {
        const job = [...jobs, ...legacyJobs].find(x => x.id === p.id);
        if (!job) throw new Error('Opportunity not found.');
        if (!state.applications.some(a => a.jobId === p.id)) state.applications.push({
          id: uid(),
          jobId: p.id,
          company: job.company,
          title: job.title,
          status: 'Applied',
          date: dateKey()
        });
        break;
      }
    case 'application.add':
      state.applications.push({
        id: uid(),
        company: text(p.company, 100),
        title: text(p.title, 120),
        status: 'Applied',
        date: dateKey()
      });
      break;
    case 'application.move':
      {
        if (!['Applied', 'Shortlisted', 'Interview', 'Selected', 'Not selected'].includes(p.status)) throw new Error('Choose a valid application stage.');
        const app = state.applications.find(a => a.id === p.id);
        if (!app) throw new Error('Application not found.');
        app.timeline ||= [];
        if (app.status !== p.status) app.timeline.push({
          id: uid(),
          time: new Date().toISOString(),
          text: app.status + ' → ' + p.status
        });
        app.status = p.status;
        break;
      }
    case 'job.prepare':
      {
        const job = [...jobs, ...legacyJobs].find(x => x.id === p.id);
        if (!job) throw new Error('Opportunity not found.');
        for (const skill of job.skills.filter(s => (readinessDetails(state).skillScores[s] || 0) < 70)) {
          const id = `job-${job.id}-${skill}`;
          if (!state.tasks.some(t => t.id === id)) state.tasks.push({
            id,
            title: `Strengthen ${skill} for ${job.company}`,
            detail: 'Targeted preparation from your opportunity match.',
            category: skill,
            kind: skill === 'Communication' ? 'interview' : 'quiz',
            resourceId: {
              DSA: 'dsa-patterns',
              Frontend: 'js-basics',
              Backend: 'network-http',
              Databases: 'dbms-foundations',
              DevOps: 'os-fundamentals',
              Communication: 'aptitude-placement'
            }[skill],
            minutes: 20,
            xp: 40,
            status: 'pending',
            date: dateKey()
          });
        }
        balanceDay(state, dateKey());
        break;
      }
    case 'event.register':
      {
        const event = [...events, ...legacyEvents].find(e => e.id === p.id);
        if (!event) throw new Error('Event not found.');
        if (!state.registrations.includes(p.id)) {
          state.registrations.push(p.id);
          const id = `event-${p.id}`;
          if (state.profile.year < 4 && !state.tasks.some(t => t.id === id)) state.tasks.push({
            id,
            title: `Explore ${event.name}`,
            detail: event.location,
            category: 'Communication',
            kind: 'event',
            minutes: 30,
            xp: 40,
            status: 'pending',
            date: event.date < dateKey() ? dateKey() : event.date
          });
        }
        break;
      }
    case 'social.follow':
      if (p.id === 'me' || !['riya', 'kabir', 'ananya', 'dev'].includes(p.id)) throw new Error('Student not found.');
      state.following = state.following.includes(p.id) ? state.following.filter(x => x !== p.id) : [...state.following, p.id];
      break;
    case 'social.post':
      state.posts.unshift({
        id: uid(),
        author: 'me',
        text: text(p.text),
        tag: 'A little update',
        likes: 0,
        time: new Date().toISOString()
      });
      break;
    case 'social.like':
      if (!state.posts.some(post => post.id === p.id)) throw new Error('Post not found.');
      state.likes = state.likes.includes(p.id) ? state.likes.filter(x => x !== p.id) : [...state.likes, p.id];
      break;
    case 'social.comment':
      if (!state.posts.some(post => post.id === p.id)) throw new Error('Post not found.');
      (state.comments[p.id] ||= []).push({
        id: uid(),
        author: 'me',
        text: text(p.text, 600),
        time: new Date().toISOString()
      });
      break;
    case 'message.send':
      if (!['global', 'riya', 'kabir', 'ananya', 'dev'].includes(p.thread)) throw new Error('Conversation not found.');
      state.messages.push({
        id: uid(),
        thread: p.thread,
        author: 'me',
        text: text(p.text, 2000),
        time: new Date().toISOString()
      });
      break;
    case 'staff-message.read':
      {
        const message = state.staffMessages?.find(m => m.id === p.id);
        if (!message) throw new Error('Guidance not found.');
        message.read = true;
        break;
      }
    case 'staff-message.reply':
      {
        const message = state.staffMessages?.find(m => m.id === p.id);
        if (!message) throw new Error('Guidance not found.');
        message.replies ||= [];
        message.replies.push({
          id: uid(),
          text: text(p.text, 3000),
          time: new Date().toISOString()
        });
        message.read = true;
        break;
      }
    case 'campus-update.read':
      {
        const update = state.campusUpdates?.find(u => u.id === p.id);
        if (!update) throw new Error('College update not found.');
        update.read = true;
        break;
      }
    case 'assignment.draft':
      {
        const assignment = state.assignments.find(a => a.id === p.id);
        if (!assignment || assignment.kind === 'Quiz') throw new Error('Choose a written assignment in your workspace.');
        if (assignment.status === 'graded') throw new Error('This submission is graded. Ask your teacher to request a revision.');
        state.assignmentDrafts ||= {};
        state.assignmentDrafts[p.id] = {
          text: String(p.text || '').slice(0, 6000),
          url: String(p.url || '').slice(0, 2000),
          files: p.files || [],
          fileIds: p.fileIds || [],
          updatedAt: new Date().toISOString()
        };
        break;
      }
    case 'assignment.submit':
      {
        const assignment = state.assignments.find(a => a.id === p.id);
        if (!assignment) throw new Error('Assignment not found.');
        if (assignment.kind === 'Quiz') throw new Error('Complete the assigned quiz to submit it.');
        if (assignment.status === 'graded') throw new Error('This assignment has a final grade. Ask your teacher to request a revision.');
        if (assignment.deadline && assignment.deadline < dateKey() && assignment.latePolicy === 'closed') throw new Error('This assignment is closed. Ask your teacher for an extension.');
        if (p.requestId && assignment.lastSubmissionKey === p.requestId) {
          result = {
            saved: true,
            version: assignment.submissionCount
          };
          break;
        }
        const submission = text(p.text, 6000);
        if (submission.length < 10) throw new Error('Explain your submission in at least 10 characters.');
        const labAttempt = assignment.labId && state.assessmentAttempts?.find(a => a.id === p.labAttemptId && a.labId === assignment.labId && Date.parse(a.time) >= Date.parse(assignment.createdAt));
        if (assignment.labId && !labAttempt) throw new Error('Complete and save an attempt of the assigned lab after this work was published.');
        let submissionUrl = '';
        if (p.url) {
          let url;
          try {
            url = new URL(p.url);
          } catch {
            throw new Error('Use a full submission link.');
          }
          if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Use an http or https submission link.');
          submissionUrl = url.href;
        }
        if (!assignment.submissionCount && assignment.status !== 'submitted') award(state, {
          key: 'assignment:' + assignment.id,
          kind: 'submission',
          resourceId: assignment.id,
          skill: assignment.skill || (assignment.kind === 'Project' ? 'Backend' : 'Databases'),
          xp: 40,
          verification: 'self-reported'
        });
        assignment.versions ||= [];
        if (!assignment.versions.length && assignment.submission) assignment.versions.push({
          id: uid(),
          version: assignment.submissionCount || 1,
          text: assignment.submission,
          url: assignment.submissionUrl || '',
          files: assignment.files || [],
          fileIds: assignment.fileIds || [],
          time: assignment.submittedAt || new Date().toISOString(),
          review: assignment.feedback ? {
            feedback: assignment.feedback,
            grade: assignment.grade,
            reviewedBy: assignment.reviewedBy
          } : null
        });
        const version = Math.max(assignment.submissionCount || 0, ...assignment.versions.map(v => v.version), 0) + 1;
        assignment.submissionCount = version;
        assignment.submission = submission;
        assignment.submissionUrl = submissionUrl;
        assignment.files = p.files || [];
        assignment.fileIds = p.fileIds || [];
        assignment.labAttempt = labAttempt ? structuredClone(labAttempt) : null;
        assignment.status = 'submitted';
        assignment.submittedAt = new Date().toISOString();
        assignment.versions.push({
          id: uid(),
          version,
          text: submission,
          url: assignment.submissionUrl || '',
          files: assignment.files,
          fileIds: assignment.fileIds,
          labAttempt: assignment.labAttempt,
          time: assignment.submittedAt,
          late: !!assignment.deadline && assignment.deadline < dateKey()
        });
        assignment.lastSubmissionKey = p.requestId || null;
        assignment.grade = null;
        assignment.feedback = '';
        if (state.assignmentDrafts) delete state.assignmentDrafts[p.id];
        result = {
          saved: true,
          version
        };
        break;
      }
    case 'notifications.read':
      state.notifications.forEach(n => n.read = true);
      break;
    case 'resume.apply-ai':
      {
        const previous = {
          ...state.resume
        };
        state.resumeHistory ||= [];
        state.resumeHistory.push({
          resume: previous,
          time: new Date().toISOString()
        });
        for (const key of ['headline', 'summary']) if (typeof (p.draft || p)[key] === 'string') state.resume[key] = (p.draft || p)[key].trim().slice(0, key === 'summary' ? 1800 : 200);
        break;
      }
    case 'resume.undo-ai':
      {
        const last = state.resumeHistory?.pop();
        if (last) state.resume = last.resume;
        break;
      }
    default:
      if (!careerAction(state, type, p)) throw new Error('This action is not supported.');
  }
  if (type === 'project.step') {
    const task = state.tasks.find(t => t.kind === 'project' && t.date === dateKey() && t.resourceId === p.id && t.step === Number(p.step));
    if (task) task.status = 'completed';
  }
  if (type === 'course.complete' && result.passed) {
    const task = state.tasks.find(t => t.kind === 'course' && t.date === dateKey() && t.resourceId === p.id && t.lesson === Number(p.lesson));
    if (task) task.status = 'completed';
  }
  if (type === 'coding.submit') {
    const task = state.tasks.find(t => t.kind === 'coding' && t.date === dateKey() && (!t.resourceId || t.resourceId === p.id));
    if (task) task.status = 'completed';
  }
  if (type === 'practice.track') {
    const task = state.tasks.find(t => t.kind === 'coding' && t.resourceId === p.id && t.date === dateKey());
    if (task) task.status = 'completed';
  }
  if (type === 'quiz.submit') {
    const task = state.tasks.find(t => t.kind === 'quiz' && t.resourceId === p.id && t.date === dateKey());
    if (task) task.status = 'completed';
  }
  if (type !== 'course.complete' || result.passed) if (type !== 'quiz.submit' || result.score >= 67) settleRevision(state, type, p);
  if (type === 'assignment.submit') {
    for (const task of state.tasks.filter(t => t.kind === 'assignment' && t.resourceId === p.id && t.date === dateKey())) task.status = 'completed';
  }
  finalizeProgress(state);
  state.version++;
  return result;
}
export function finalizeProgress(state) {
  state.skillHistory ||= [];
  const history = state.skillHistory.find(x => x.date === dateKey());
  if (history) history.skills = {
    ...state.skills
  };else state.skillHistory.push({
    date: dateKey(),
    skills: {
      ...state.skills
    }
  });
  const point = state.skillHistory.find(x => x.date === dateKey()),
    details = readinessDetails(state);
  point.verifiedSkills = details.skillScores;
  point.readiness = details.score;
  state.journey.advancedDates ||= [];
  const tasks = state.tasks.filter(t => t.date === dateKey());
  if (tasks.length && tasks.every(t => t.status === 'completed') && !state.journey.advancedDates.includes(dateKey())) {
    state.journey.advancedDates.push(dateKey());
    const day = state.journey.scheduleVersion ? calendarDay(state.journey, dateKey()) : state.journey.day;
    state.journey.completedDays ||= [];
    if (!state.journey.completedDays.includes(day)) state.journey.completedDays.push(day);
    state.journey.day = Math.min(state.journey.totalDays, day + 1);
  }
}
export function assessmentSession(state, id, sessionId) {
  const session = state.assessmentSessions?.find(s => s.id === sessionId && s.labId === id);
  if (!session) throw new Error('Start this lab before running or submitting it.');
  if (session.deadline && Date.now() > session.deadline) throw new Error('This timed attempt has ended. Start a new attempt or switch to practice.');
  return session;
}
export function recordAssessment(state, id, sessionId, result, code) {
  const lab = assessmentLabs.find(l => l.id === id),
    session = assessmentSession(state, id, sessionId);
  if (!lab) throw new Error('Assessment not found.');
  state.assessmentAttempts ||= [];
  const passed = result.score === 100,
    first = passed && !state.assessmentAttempts.some(a => a.labId === id && a.passed);
  state.assessmentAttempts.push({
    id: uid(),
    labId: id,
    title: lab.title,
    skill: lab.skill,
    type: lab.type,
    mode: session.mode,
    score: result.score,
    passed,
    verification: result.verification,
    explanation: result.explanation || '',
    date: dateKey(),
    time: new Date().toISOString(),
    durationSeconds: Math.round((Date.now() - session.startedAt) / 1000)
  });
  state.assessmentAttempts = state.assessmentAttempts.slice(-300);
  session.submitted = true;
  state.assessmentDrafts ||= {};
  state.assessmentDrafts[id] = {
    code,
    explanation: result.explanation || '',
    updatedAt: new Date().toISOString()
  };
  if (first) award(state, {
    key: 'lab:' + id,
    kind: 'assessment',
    resourceId: id,
    skill: lab.skill,
    score: result.score,
    xp: 80,
    improvement: lab.type === 'SQL' ? 2 : 0,
    verification: lab.type === 'SQL' ? 'server-checked' : 'browser-checked'
  });
  if (passed) for (const task of state.tasks.filter(t => t.kind === 'assessment' && t.resourceId === id && t.date === dateKey())) task.status = 'completed';
  finalizeProgress(state);
  state.version++;
  return {
    passed,
    firstPass: first
  };
}
