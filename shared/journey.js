import { getPath, lessonNames } from './paths.js';
import { assessmentLabs } from './assessments.js';
export const chapters = ['Foundations', 'Build the basics', 'Problem-solving patterns', 'Portfolio workshop', 'Experience & collaboration', 'Technical depth', 'Interview readiness', 'Launch your next chapter'];
export const defaultPlanDays = year => ({
  1: 1460,
  2: 1095,
  3: 730,
  4: 150
})[Number(year)] || 150;
export const addDays = (date, n) => new Date(new Date(date + 'T12:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);
export const calendarDay = (journey, key) => Math.max(1, Math.min(journey.totalDays, Math.floor((new Date(key + 'T12:00:00Z') - new Date(journey.startedAt + 'T12:00:00Z')) / 86400000) + 1));
export function buildPlan(profile, key, {
  days,
  targetDate,
  dailyMinutes,
  weeklyDays
} = {}) {
  const end = targetDate || addDays(key, (Number(days) || defaultPlanDays(profile.year)) - 1);
  const duration = Math.floor((new Date(end + 'T12:00:00Z') - new Date(key + 'T12:00:00Z')) / 86400000) + 1;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end) || !Number.isInteger(duration) || duration < 7 || duration > 1460 || new Date(end + 'T12:00:00Z').toISOString().slice(0, 10) !== end) throw new Error('Choose a preparation window between 7 and 1,460 days, starting today.');
  if (dailyMinutes !== undefined && (!Number.isInteger(Number(dailyMinutes)) || dailyMinutes < 30 || dailyMinutes > 180)) throw new Error('Choose 30–180 focused minutes per day.');
  if (weeklyDays !== undefined && ![3, 5, 6].includes(Number(weeklyDays))) throw new Error('Choose 3, 5, or 6 study days per week.');
  return {
    day: 1,
    totalDays: duration,
    startedAt: key,
    targetDate: end,
    scheduleVersion: 2,
    completedDays: [],
    advancedDates: [],
    restDays: [],
    fullDegree: false
  };
}
export function syncPlan(state, key) {
  const j = state.journey;
  let changed = false;
  if (!j.scheduleVersion) {
    j.startedAt = j.startedAt || addDays(key, 1 - j.day);
    j.scheduleVersion = 2;
    j.targetDate = addDays(j.startedAt, j.totalDays - 1);
    j.completedDays ||= [];
    if (state.profile.sampleData) {
      const active = new Set(state.activity.filter(a => a.count > 0).map(a => a.date));
      j.completedDays = Array.from({
        length: j.day - 1
      }, (_, i) => i + 1).filter(d => active.has(addDays(j.startedAt, d - 1)));
    }
    changed = true;
  }
  const current = calendarDay(j, key),
    next = j.advancedDates?.includes(key) ? Math.min(j.totalDays, current + 1) : current;
  if (j.day !== next) {
    j.day = next;
    changed = true;
  }
  return changed;
}
const coursePaths = {
  'Full-stack development': ['javascript', 'react', 'sql', 'dsa', 'networks', 'system-design', 'devops'],
  'Data science': ['python', 'sql', 'statistics', 'machine-learning', 'analytics', 'dsa', 'devops'],
  'Data analytics': ['sql', 'python', 'statistics', 'analytics', 'dsa'],
  'DevOps': ['linux', 'networks', 'devops', 'python', 'system-design', 'sql', 'dsa'],
  'Explore my interests': ['javascript', 'python', 'sql', 'dsa']
};
export function missionFor(profile, journey, day, catalog) {
  const number = Math.max(1, Math.min(journey.totalDays, Number(day) || 1)),
    phase = Math.min(7, Math.floor((number - 1) / journey.totalDays * 8)),
    path = getPath(profile.track),
    date = addDays(journey.startedAt || new Date().toISOString().slice(0, 10), number - 1),
    weekday = new Date(date + 'T12:00:00Z').getUTCDay(),
    working = profile.weeklyDays === 3 ? [1, 3, 5] : profile.weeklyDays === 6 ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5],
    rest = !working.includes(weekday) || (journey.restDays || []).includes(date),
    event = profile.year < 4 && number % 28 === 5,
    checkpoint = number % 14 === 0 || number === journey.totalDays;
  const experience = /comfortable|building things/i.test(profile.level || '') ? 65 : /brand new/i.test(profile.level || '') ? 0 : 25,
    baseline = journey.baseline ?? profile.diagnostic?.overall ?? experience,
    effectivePhase = Math.min(7, phase + (baseline >= 80 ? 3 : baseline >= 60 ? 2 : baseline >= 35 ? 1 : 0)),
    difficulty = effectivePhase < 2 ? 'Easy' : effectivePhase < 6 ? 'Medium' : 'Hard',
    bank = catalog.problems.filter(p => p.difficulty === difficulty),
    problem = bank[(number * 7 + phase) % bank.length] || catalog.problems[0],
    sequence = profile.onboardingAnswers?.[3] === 'Python' ? ['python', ...(coursePaths[profile.track] || coursePaths['Explore my interests']).filter(c => c !== 'python')] : coursePaths[profile.track] || coursePaths['Explore my interests'],
    block = Math.floor((number - 1) / 14) + (baseline >= 60 ? 1 : 0),
    course = catalog.courses.find(c => c.id === sequence[block % sequence.length]) || catalog.courses[0],
    lesson = (Math.floor(block / sequence.length) * 14 + (number - 1) % 14) % course.lessons,
    lessonTitle = lessonNames[course.id]?.[lesson] || course.title,
    project = catalog.projects.find(p => p.id === path.project) || catalog.projects[0],
    minutes = Number(profile.dailyMinutes) || 60,
    quotas = [Math.floor(minutes * .3), Math.floor(minutes * .2), Math.floor(minutes * .35)];
  quotas.push(minutes - quotas.reduce((a, b) => a + b, 0));
  let steps = [{
    kind: 'coding',
    title: problem.title,
    category: 'DSA',
    resourceId: problem.id,
    minutes: quotas[0],
    xp: 40
  }, {
    kind: 'course',
    title: lessonTitle,
    category: course.category,
    resourceId: course.id,
    lesson,
    minutes: quotas[1],
    xp: 30
  }, {
    kind: 'project',
    title: project.steps[Math.floor((number - 1) / 3) % project.steps.length],
    category: path.focus,
    resourceId: project.id,
    step: Math.floor((number - 1) / 3) % project.steps.length,
    minutes: quotas[2],
    xp: 60
  }, {
    kind: event ? 'event' : checkpoint ? 'quiz' : 'interview',
    title: event ? 'Explore an event and plan a contribution' : checkpoint ? 'Checkpoint: test your core understanding' : phase < 3 ? 'Explain what you learned today' : 'Practise one interview answer',
    category: checkpoint ? 'Databases' : 'Communication',
    resourceId: event ? catalog.events.filter(e => (e.endDate || e.date) >= date)[Math.floor(number / 28) % Math.max(1, catalog.events.filter(e => (e.endDate || e.date) >= date).length)]?.id : checkpoint ? ['dbms-foundations', 'os-fundamentals', 'network-http', 'dbms-transactions', 'code-output', 'aptitude-placement'][(Math.floor(number / 14) + 5) % 6] : null,
    minutes: quotas[3],
    xp: 40
  }];
  if (!event && !checkpoint && number % 7 === 5) steps[3] = {
    kind: 'challenge',
    title: 'Take the college daily challenge',
    category: 'DSA',
    resourceId: 'daily',
    minutes: quotas[3],
    xp: 50
  };
  // Anchor practical work to a study weekday, shifting within that week when
  // its usual slot is a checkpoint. Join dates must not erase every SQL lab.
  const practicalSlot = Math.min(2, working.length - 1),
    practicalNumber = number + working[practicalSlot] - weekday,
    practicalCheckpoint = practicalNumber % 14 === 0 || practicalNumber === journey.totalDays,
    practicalWeekday = working[practicalCheckpoint ? (practicalSlot + 1) % working.length : practicalSlot];
  if (!event && !checkpoint && weekday === practicalWeekday) {
    const type = Math.floor((practicalNumber - 1) / 7) % 2 === 1 && (phase >= 1 || baseline >= 60) && !['Data science', 'Data analytics'].includes(profile.track) ? 'Project debugging' : 'SQL',
      pool = (catalog.assessmentLabs || assessmentLabs).filter(l => l.type === type),
      foundation = pool.filter(l => l.difficulty === 'Foundation'),
      labs = phase < 2 && baseline < 60 && foundation.length ? foundation : phase < 5 ? pool.filter(l => l.difficulty !== 'Advanced') : pool,
      lab = labs[(Math.floor(number / 7) + phase) % labs.length],
      labMinutes = Math.floor(minutes * .6),
      codeMinutes = Math.floor(minutes * .25);
    steps = [steps[0], {
      kind: 'assessment',
      title: lab.title,
      category: lab.skill,
      resourceId: lab.id,
      minutes: labMinutes,
      xp: 80
    }, {
      kind: 'review',
      title: 'Explain the failure, fix, and regression risk',
      category: 'Communication',
      resourceId: 'reflection-' + lab.id,
      minutes: minutes - labMinutes - codeMinutes,
      xp: 20
    }];
    steps[0].minutes = codeMinutes;
  }
  return {
    number,
    date,
    phase,
    chapter: chapters[phase],
    rest,
    event,
    checkpoint,
    steps: rest ? [] : steps
  };
}
