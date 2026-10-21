import test from 'node:test';
import assert from 'node:assert/strict';
import { curriculum, getLesson, publicLesson } from '../shared/curriculum.js';
import { courses } from '../shared/catalog.js';
import { createProfile } from '../server/profiles.mjs';
import { applyAction, dateKey } from '../server/model.mjs';
test('all 158 advertised lessons have distinct instruction, worked examples and valid original checks', () => {
  let total = 0;
  const readings = [];
  for (const course of courses) {
    assert.equal(curriculum[course.id].length, course.lessons);
    for (const [index, lesson] of curriculum[course.id].entries()) {
      assert.equal(lesson.index, index);
      assert.ok(lesson.reading.length > 100);
      assert.ok(lesson.example.trim().length > 0);
      assert.ok(lesson.explanation.length > 30);
      assert.ok(lesson.options[lesson.correct]);
      const visible = publicLesson(course.id, index);
      assert.equal(visible.correct, undefined);
      assert.equal(visible.explanation, undefined);
      readings.push(lesson.reading);
      total++;
    }
  }
  assert.equal(total, 158);
  assert.equal(new Set(readings).size, total);
});
test('lessons require a scored check and explanation, preserve drafts, and complete only the exact task once', () => {
  const s = createProfile({
      name: 'Course Student',
      handle: 'course-student'
    }),
    lesson = getLesson('sql', 0);
  s.tasks = [{
    id: 'lesson-a',
    kind: 'course',
    resourceId: 'sql',
    lesson: 0,
    date: dateKey(),
    status: 'pending'
  }, {
    id: 'lesson-b',
    kind: 'course',
    resourceId: 'sql',
    lesson: 1,
    date: dateKey(),
    status: 'pending'
  }];
  assert.throws(() => applyAction(s, 'course.complete', {
    id: 'sql',
    lesson: 0
  }), /knowledge check/);
  const wrong = (lesson.correct + 1) % lesson.options.length,
    reflection = 'I inspected the example and explained the row grain before writing a query.';
  applyAction(s, 'lesson.draft', {
    id: 'sql',
    lesson: 0,
    answer: wrong,
    reflection
  });
  assert.equal(s.lessonDrafts['sql:0'].reflection, reflection);
  const failed = applyAction(s, 'course.complete', {
    id: 'sql',
    lesson: 0,
    answer: wrong,
    reflection
  });
  assert.equal(failed.passed, false);
  assert.equal(s.courseProgress.sql, 0);
  assert.equal(s.tasks[0].status, 'pending');
  applyAction(s, 'course.complete', {
    id: 'sql',
    lesson: 0,
    answer: lesson.correct,
    reflection
  });
  assert.equal(s.courseProgress.sql, 1);
  assert.equal(s.tasks[0].status, 'completed');
  assert.equal(s.tasks[1].status, 'pending');
  assert.equal(s.journey.xp, 30);
  applyAction(s, 'course.complete', {
    id: 'sql',
    lesson: 0,
    answer: lesson.correct,
    reflection
  });
  assert.equal(s.journey.xp, 30);
  assert.equal(s.progressEvents[0].verification, 'server-checked');
});
test('learning notes and bookmarks persist independently from mastery rewards', () => {
  const s = createProfile({
    name: 'Notebook Student',
    handle: 'notebook-student'
  });
  applyAction(s, 'learning.bookmark', {
    id: 'react',
    lesson: 2
  });
  assert.equal(s.bookmarks.length, 1);
  applyAction(s, 'learning.note', {
    title: 'An important JSX idea',
    body: 'Curly braces evaluate a JavaScript expression inside JSX markup.'
  });
  applyAction(s, 'learning.note', {
    noteId: s.learningNotes[0].id,
    title: 'Updated JSX note',
    body: 'I checked the expression result with two different count values.'
  });
  const restored = JSON.parse(JSON.stringify(s));
  assert.equal(restored.learningNotes[0].title, 'Updated JSX note');
  assert.equal(s.journey.xp, 0);
  applyAction(s, 'learning.bookmark', {
    id: 'react',
    lesson: 2
  });
  assert.equal(s.bookmarks.length, 0);
});
