import { getLesson } from '../shared/curriculum.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, applyAction, metrics, dateKey, ensureDailyPlan } from '../server/model.mjs';
import { projects } from '../shared/catalog.js';
test('year changes create the right duration and keep events optional for final year', () => {
  const s = createState();
  applyAction(s, 'profile.update', {
    year: 1
  });
  assert.equal(s.journey.totalDays, 1460);
  assert.ok(s.tasks.some(t => t.kind === 'event'));
  applyAction(s, 'profile.update', {
    year: 4
  });
  assert.equal(s.journey.totalDays, 365);
  assert.ok(!s.tasks.some(t => t.id === 'weekly-event'));
  assert.throws(() => applyAction(s, 'profile.update', {
    year: 9
  }));
});
test('completing linked learning is idempotent and updates skill, activity and XP once', () => {
  const s = createState(),
    xp = s.journey.xp,
    skill = s.skills.Frontend,
    count = s.activity.find(a => a.date === dateKey()).count;
  s.tasks = [{
    id: 'lesson',
    kind: 'course',
    resourceId: 'react',
    lesson: 14,
    date: dateKey(),
    status: 'pending'
  }];
  assert.throws(() => applyAction(s, 'task.complete', {
    id: 'lesson'
  }), /linked activity/);
  applyAction(s, 'course.complete', {
    id: 'react',
    lesson: 14,
    answer: getLesson('react', 14)?.correct,
    reflection: 'I traced the example and checked a boundary case in my own words.'
  });
  assert.equal(s.tasks[0].status, 'completed');
  assert.equal(s.journey.xp, xp + 30);
  assert.equal(s.skills.Frontend, skill + 1);
  assert.equal(s.activity.find(a => a.date === dateKey()).count, count + 1);
  applyAction(s, 'course.complete', {
    id: 'react',
    lesson: 14,
    answer: getLesson('react', 14)?.correct,
    reflection: 'I traced the example and checked a boundary case in my own words.'
  });
  assert.equal(s.journey.xp, xp + 30);
});
test('the journey advances only once when linked daily work is complete', () => {
  const s = createState(),
    day = s.journey.day;
  Object.assign(s.tasks.find(t => t.id === 'daily-build'), {
    resourceId: 'campus',
    step: 2
  });
  applyAction(s, 'project.step', {
    id: 'campus',
    step: 2
  });
  assert.equal(s.journey.day, day);
  s.interviewSessions ||= [{
    id: 'warmup',
    status: 'completed',
    verification: 'guided-practice',
    score: null
  }], applyAction(s, 'interview.complete', {
    sessionId: 'warmup'
  });
  assert.equal(s.journey.day, day + 1);
  s.interviewSessions ||= [{
    id: 'warmup',
    status: 'completed',
    verification: 'guided-practice',
    score: null
  }], applyAction(s, 'interview.complete', {
    sessionId: 'warmup'
  });
  applyAction(s, 'project.step', {
    id: 'campus',
    step: 2
  });
  assert.equal(s.journey.day, day + 1);
});
test('quiz grading happens on the server and feeds the appropriate skill', () => {
  const s = createState(),
    skill = s.skills.Frontend;
  const result = applyAction(s, 'quiz.submit', {
    id: 'js-basics',
    answers: [1, 2, 1]
  });
  assert.equal(result.score, 100);
  assert.equal(result.correct, 3);
  assert.equal(s.skills.Frontend, skill + 2);
  assert.equal(metrics(s).accuracy, 100);
  assert.throws(() => applyAction(s, 'quiz.submit', {
    id: 'js-basics',
    answers: [1]
  }));
});
test('projects become resume entries only after the complete set of milestones', () => {
  const s = createState(),
    p = projects.find(p => p.id === 'campus');
  assert.throws(() => applyAction(s, 'resume.project', {
    id: p.id
  }));
  for (let i = 0; i < p.steps.length; i++) applyAction(s, 'project.step', {
    id: p.id,
    step: i
  });
  assert.ok(s.resumeProjects.includes(p.id));
  const xp = s.journey.xp;
  applyAction(s, 'project.step', {
    id: p.id,
    step: 5
  });
  assert.equal(s.journey.xp, xp);
  assert.equal(s.resumeProjects.filter(x => x === p.id).length, 1);
});
test('an event registration is idempotent and joins the plan for years 1–3', () => {
  const s = createState();
  applyAction(s, 'event.register', {
    id: 'buildathon'
  });
  applyAction(s, 'event.register', {
    id: 'buildathon'
  });
  assert.equal(s.registrations.length, 1);
  assert.equal(s.tasks.filter(t => t.id === 'event-buildathon').length, 1);
  const final = createState();
  applyAction(final, 'profile.update', {
    year: 4
  });
  applyAction(final, 'event.register', {
    id: 'buildathon'
  });
  assert.equal(final.registrations.length, 1);
  assert.ok(!final.tasks.some(t => t.id === 'event-buildathon'));
});
test('job gaps create useful tasks once and tracking does not claim external applications', () => {
  const s = createState();
  applyAction(s, 'job.prepare', {
    id: 'orbit'
  });
  applyAction(s, 'job.prepare', {
    id: 'orbit'
  });
  assert.equal(s.tasks.filter(t => t.id.startsWith('job-orbit')).length, 2);
  applyAction(s, 'job.track', {
    id: 'orbit'
  });
  applyAction(s, 'job.track', {
    id: 'orbit'
  });
  assert.equal(s.applications.filter(a => a.jobId === 'orbit').length, 1);
  const a = s.applications.find(a => a.jobId === 'orbit');
  applyAction(s, 'application.move', {
    id: a.id,
    status: 'Shortlisted'
  });
  assert.equal(a.status, 'Shortlisted');
});
test('messages and social actions validate destinations and survive a JSON storage round trip', () => {
  const s = createState();
  applyAction(s, 'message.send', {
    thread: 'riya',
    text: 'A little hello.'
  });
  applyAction(s, 'social.post', {
    text: 'Built a small thing today.'
  });
  const post = s.posts[0];
  applyAction(s, 'social.like', {
    id: post.id
  });
  applyAction(s, 'social.comment', {
    id: post.id,
    text: 'One step forward.'
  });
  const restored = JSON.parse(JSON.stringify(s));
  assert.equal(restored.messages.at(-1).text, 'A little hello.');
  assert.equal(restored.comments[post.id][0].text, 'One step forward.');
  assert.ok(restored.likes.includes(post.id));
  assert.throws(() => applyAction(s, 'message.send', {
    thread: 'unknown',
    text: 'test'
  }));
  assert.throws(() => applyAction(s, 'social.post', {
    text: '  '
  }));
});
test('lesson completion awards progress only once and never exceeds the course length', () => {
  const s = createState(),
    xp = s.journey.xp;
  applyAction(s, 'course.complete', {
    id: 'react',
    lesson: 14,
    answer: getLesson('react', 14)?.correct,
    reflection: 'I traced the example and checked a boundary case in my own words.'
  });
  applyAction(s, 'course.complete', {
    id: 'react',
    lesson: 14,
    answer: getLesson('react', 14)?.correct,
    reflection: 'I traced the example and checked a boundary case in my own words.'
  });
  assert.equal(s.courseProgress.react, 15);
  assert.equal(s.journey.xp, xp + 30);
  assert.throws(() => applyAction(s, 'course.complete', {
    id: 'react',
    lesson: 99,
    answer: getLesson('react', 99)?.correct,
    reflection: 'I traced the example and checked a boundary case in my own words.'
  }));
});
test('a new active day receives one balanced plan and planned breaks stay clear', () => {
  const s = createState();
  applyAction(s, 'profile.update', {
    track: 'Data science',
    dailyMinutes: 60
  });
  s.tasks = [];
  assert.equal(ensureDailyPlan(s, '2026-10-20'), true);
  assert.equal(ensureDailyPlan(s, '2026-10-20'), false);
  const tasks = s.tasks.filter(t => t.date === '2026-10-20');
  assert.equal(tasks.length, 4);
  assert.ok(tasks.some(t => t.resourceId === 'insight'));
  assert.ok(tasks.reduce((sum, t) => sum + t.minutes, 0) <= 65);
  s.journey.restDays.push('2026-10-21');
  assert.equal(ensureDailyPlan(s, '2026-10-21'), false);
  assert.equal(ensureDailyPlan(s, '2026-10-25'), false);
});
