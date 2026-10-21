export function taskLocation(task) {
  if (task.kind === 'challenge') return {
    route: '/practice?tab=challenges'
  };
  if (task.kind === 'assignment') return {
    type: 'college-assignment',
    id: task.resourceId
  };
  if (task.kind === 'assessment') return {
    route: '/practice?tab=assessments&lab=' + encodeURIComponent(task.resourceId)
  };
  if (task.kind === 'review') return {
    type: 'reflection',
    id: task.resourceId
  };
  if (task.kind === 'campus-event') return {
    type: 'info',
    title: task.title,
    text: task.detail
  };
  if (task.kind === 'coding') return {
    type: task.resourceId?.startsWith('lc-') ? 'external-problem' : 'coding',
    id: task.resourceId || 'two-sum'
  };
  if (task.kind === 'course') return {
    type: 'course',
    id: task.resourceId || 'react',
    lesson: task.lesson
  };
  if (task.kind === 'project') return {
    type: 'project',
    id: task.resourceId || 'campus',
    step: task.step
  };
  if (task.kind === 'event') return {
    route: '/events'
  };
  if (task.kind === 'quiz') return {
    type: 'quiz',
    id: task.resourceId || (task.category === 'DSA' ? 'dsa-patterns' : task.category === 'Databases' ? 'sql-check' : 'js-basics')
  };
  return {
    route: '/career?tab=interview'
  };
}
