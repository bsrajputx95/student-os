import { createState, dateKey, ensureDailyPlan } from './model.mjs';
import { catalog } from '../shared/catalog.js';
import { randomUUID } from 'node:crypto';
export function createProfile({
  mode = 'new',
  name,
  handle,
  college
} = {}) {
  const state = createState();
  const demo = mode === 'demo';
  if (!demo) {
    if (typeof name !== 'string' || name.trim().length < 2) throw new Error('Enter your name.');
    if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(handle || '')) throw new Error('Use a username with 3–30 lowercase letters, numbers, dots, or underscores.');
  }
  state.profile = {
    ...state.profile,
    role: 'student',
    department: 'Computer Science',
    section: 'A',
    id: demo ? 'demo-bhavanisingh' : randomUUID(),
    isDemo: demo,
    name: demo ? 'Bhavani Singh' : name.trim().slice(0, 80),
    handle: demo ? 'bhavanisingh' : handle,
    college: demo ? 'StudentOS Demo Campus' : college?.trim().slice(0, 120) || 'Independent student',
    studentId: demo ? 'DEMO-CS-001' : 'Not linked yet',
    year: 3,
    track: 'Full-stack development',
    onboardingDone: demo,
    bio: demo ? 'Full-stack builder. DSA enthusiast. Learning in public.' : '',
    followers: demo ? 1840 : 0,
    followingCount: demo ? 326 : 0
  };
  state.activity = Array.from({
    length: 366
  }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (365 - i));
    return {
      date: dateKey(d),
      count: demo ? i > 220 ? 3 + i * 7 % 12 : i % 11 === 0 ? 0 : 1 + i * 3 % 10 : 0
    };
  });
  state.skills = Object.fromEntries(Object.keys(state.skills).map((s, i) => [s, demo ? [96, 98, 94, 95, 91, 97][i] : 0]));
  state.journey = {
    day: demo ? 486 : 1,
    totalDays: 730,
    xp: demo ? 128450 : 0,
    restDays: [],
    startedAt: dateKey(new Date(Date.now() - (demo ? 485 : 0) * 86400000))
  };
  state.historicalSolved = 0;
  state.practiceCompleted = demo ? catalog.problems.filter(p => p.external).slice(0, 420).map(p => p.id) : [];
  state.solved = demo ? catalog.problems.filter(p => !p.external).map(p => p.id) : [];
  state.courseBaseProgress = Object.fromEntries(catalog.courses.map((c, i) => [c.id, demo ? Math.floor(c.lessons * (i < 2 ? 1 : .8)) : 0]));
  state.courseProgress = {
    ...state.courseBaseProgress
  };
  state.lessonCompletions = {};
  state.projectProgress = demo ? Object.fromEntries(catalog.projects.map(p => [p.id, p.steps.map((_, i) => i)])) : {};
  state.resumeProjects = demo ? catalog.projects.map(p => p.id) : [];
  state.registrations = demo ? [catalog.events[0].id] : [];
  state.savedJobs = demo ? catalog.jobs.slice(0, 5).map(j => j.id) : [];
  state.applications = demo ? catalog.jobs.slice(0, 9).map((j, i) => ({
    id: randomUUID(),
    jobId: j.id,
    company: j.company,
    title: j.title,
    status: ['Applied', 'Shortlisted', 'Interview', 'Selected'][i % 4],
    date: dateKey()
  })) : [];
  state.quizAttempts = demo ? catalog.quizzes.map((q, i) => ({
    id: randomUUID(),
    quizId: q.id,
    date: dateKey(),
    score: i === 3 ? 92 : 100
  })) : [];
  state.following = demo ? ['riya', 'kabir', 'ananya', 'dev'] : [];
  state.likes = [];
  state.comments = {};
  state.posts = demo ? state.posts.map(p => ({
    ...p,
    text: p.text.replaceAll('the Campus Buildathon', 'a hackathon').replaceAll('Campus Buildathon', 'a hackathon')
  })) : [];
  state.messages = demo ? state.messages.map(m => ({
    ...m,
    text: m.text.replaceAll('Aarav', 'Bhavani').replaceAll('Buildathon team matching', 'Hackathon team matching')
  })) : [];
  state.assignments = [];
  state.notifications = [{
    id: 'welcome',
    title: demo ? 'Your demo workspace is ready' : 'Welcome to StudentOS',
    text: demo ? 'This populated profile lets you explore every part of the experience.' : 'Complete setup to personalize your preparation plan.',
    route: '/journey',
    read: false
  }, {
    id: 'real-library',
    title: '3,300 problems to explore',
    text: 'Public LeetCode links, searchable by topic and difficulty.',
    route: '/practice',
    read: false
  }];
  state.resume = {
    headline: demo ? 'Computer Science student · Full-stack developer' : 'Student · Building my next chapter',
    email: demo ? 'bhavanisingh@example.com' : '',
    location: 'India',
    github: demo ? 'github.com/bhavanisingh' : '',
    summary: demo ? 'Computer Science student focused on full-stack engineering, data structures, and shipping complete projects. Built campus tools, analytical dashboards, and deployment workflows.' : '',
    education: demo ? 'Computer Science · Demo education record · 2024–2028' : ''
  };
  state.skillHistory = demo ? Array.from({
    length: 12
  }, (_, i) => ({
    date: dateKey(new Date(Date.now() - (11 - i) * 7 * 86400000)),
    skills: Object.fromEntries(Object.entries(state.skills).map(([k, n]) => [k, Math.max(0, n - (11 - i) * 2)]))
  })) : [{
    date: dateKey(),
    skills: {
      ...state.skills
    }
  }];
  state.tasks = [];
  ensureDailyPlan(state);
  if (demo) state.tasks.slice(0, 2).forEach(t => t.status = 'completed');
  return state;
}
