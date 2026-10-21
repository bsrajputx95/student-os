import { addDays } from '../shared/journey.js';
export function queueCollegeWork(state, key) {
  if (!state.profile.id || state.profile.role !== 'student') return false;
  const due = (state.assignments || []).filter(a => ['pending', 'revision requested'].includes(a.status) && a.deadline && a.deadline <= addDays(key, 7)).sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 3);
  let changed = false;
  for (const assignment of due) {
    const attempt = (assignment.submissionCount || 0) + 1,
      id = `college-work-${assignment.id}-${attempt}`;
    if (state.tasks.some(t => t.id === id)) continue;
    const date = state.journey.advancedDates?.includes(key) ? nextStudyDate(state, addDays(key, 1)) : nextStudyDate(state, key);
    state.tasks.push({
      id,
      resourceId: assignment.id,
      source: 'college',
      kind: 'assignment',
      title: assignment.title,
      detail: `${assignment.teacher} · Due ${assignment.deadline}`,
      category: assignment.subject || 'College work',
      minutes: 20,
      xp: 0,
      status: 'pending',
      date,
      deadline: assignment.deadline
    });
    changed = true;
  }
  return changed;
}
export function nextStudyDate(state, key) {
  const active = state.profile.weeklyDays === 3 ? [1, 3, 5] : state.profile.weeklyDays === 6 ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
  let date = key;
  for (let i = 0; i < 60; i++, date = addDays(date, 1)) if (active.includes(new Date(date + 'T12:00:00Z').getUTCDay()) && !state.journey.restDays.includes(date)) return date;
  return key;
}
export function balanceDay(state, key) {
  if (!state.profile.id) return false;
  const today = state.tasks.filter(t => t.date === key),
    done = today.filter(t => t.status === 'completed');
  let available = Math.max(0, (Number(state.profile.dailyMinutes) || 75) - done.reduce((n, t) => n + t.minutes, 0));
  const pending = today.filter(t => t.status !== 'completed'),
    fixed = pending.filter(t => !t.id.includes('-mission-')).sort((a, b) => a.kind === 'event' || a.kind === 'campus-event' ? -1 : b.kind === 'event' || b.kind === 'campus-event' ? 1 : (a.deadline || '9999').localeCompare(b.deadline || '9999'));
  let changed = false;
  for (const task of fixed) {
    const minutes = task.estimatedMinutes || task.minutes || 20;
    task.estimatedMinutes = minutes;
    if (available >= minutes) {
      task.minutes = minutes;
      available -= minutes;
    } else {
      task.date = nextStudyDate(state, addDays(key, 1));
      task.deferredFrom ||= key;
      changed = true;
    }
  }
  const generated = pending.filter(t => t.id.includes('-mission-'));
  const selected = generated.slice(0, Math.min(generated.length, Math.floor(available / 5)));
  const removed = new Set(generated.filter(t => !selected.includes(t)).map(t => t.id));
  if (removed.size) {
    state.tasks = state.tasks.filter(t => !removed.has(t.id));
    changed = true;
  }
  const weight = selected.reduce((n, t) => n + (t.estimatedMinutes || t.minutes), 0),
    pool = available;
  selected.forEach((task, i) => {
    task.estimatedMinutes ||= task.minutes;
    const reserve = (selected.length - i - 1) * 5;
    const minutes = i === selected.length - 1 ? available : Math.min(available - reserve, Math.max(5, Math.floor(task.estimatedMinutes / weight * pool)));
    if (task.minutes !== minutes) changed = true;
    task.minutes = minutes;
    available -= minutes;
  });
  return changed;
}
export function captureMissedWork(state, key) {
  state.revisionQueue ||= [];
  let changed = false;
  for (const task of state.tasks.filter(t => t.date < key && t.date >= addDays(key, -14) && t.status !== 'completed' && ['course', 'coding', 'quiz', 'assessment', 'project'].includes(t.kind))) {
    const resourceKey = `${task.kind}:${task.resourceId}:${task.lesson ?? task.step ?? ''}`;
    if (state.revisionQueue.some(r => r.resourceKey === resourceKey)) continue;
    state.revisionQueue.push({
      ...task,
      id: 'catchup-' + task.id,
      resourceKey,
      source: 'missed',
      dueAt: key,
      missedDate: task.date
    });
    changed = true;
  }
  state.revisionQueue = state.revisionQueue.slice(-100);
  return changed;
}
export function applyRevision(state, item, key) {
  const revision = state.revisionQueue?.find(r => r.kind === item.kind && r.dueAt <= key);
  return revision ? {
    ...item,
    resourceId: revision.resourceId,
    lesson: revision.lesson,
    step: revision.step,
    title: 'Catch up: ' + revision.title.replace(/^Catch up: /, ''),
    catchupKey: revision.resourceKey
  } : item;
}
export function settleRevision(state, type, p) {
  const kind = {
    'course.complete': 'course',
    'coding.submit': 'coding',
    'practice.track': 'coding',
    'quiz.submit': 'quiz',
    'project.step': 'project'
  }[type];
  if (!kind) return;
  state.revisionQueue = (state.revisionQueue || []).filter(r => !(r.kind === kind && r.resourceId === p.id && (r.lesson === undefined || r.lesson === p.lesson) && (r.step === undefined || r.step === p.step)));
}
export function queueRecall(state, key) {
  if (nextStudyDate(state, key) !== key) return false;
  let changed = false;
  for (const r of (state.recallSchedule || []).filter(r => !r.finished && r.dueAt <= key).slice(0, 2)) {
    const id = 'recall-' + r.resourceId + '-' + r.stage;
    if (state.tasks.some(t => t.id === id)) continue;
    state.tasks.push({
      id,
      resourceId: 'recall-' + r.resourceId,
      kind: 'review',
      title: 'Recall: ' + r.title,
      detail: 'Spaced recall · explain, apply and test the idea without copying your notes.',
      category: r.skill,
      minutes: 15,
      xp: 10,
      status: 'pending',
      date: key
    });
    changed = true;
  }
  return changed;
}
export function scheduleRecall(state, lesson, key) {
  state.recallSchedule ||= [];
  if (!state.recallSchedule.some(r => r.resourceId === lesson.id)) state.recallSchedule.push({
    resourceId: lesson.id,
    title: lesson.title,
    skill: lesson.skill || 'Communication',
    stage: 0,
    dueAt: addDays(key, 3),
    finished: false
  });
}
export function completeRecall(state, resourceId, key) {
  const r = state.recallSchedule?.find(r => 'recall-' + r.resourceId === resourceId);
  if (!r || r.finished) return;
  r.stage++;
  if (r.stage >= 4) r.finished = true;else r.dueAt = addDays(key, [3, 7, 21, 60][r.stage]);
}
