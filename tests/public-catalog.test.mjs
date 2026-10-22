import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../shared/catalog.js';
import { mergePublicCatalog } from '../shared/public-catalog.js';
test('the CDN catalog retains content but excludes private quiz answers', () => {
  assert.ok(catalog.problems.length > 1000);
  assert.ok(catalog.courses.length >= 12);
  for (const quiz of catalog.quizzes) for (const question of quiz.questions) {
    assert.equal(Object.hasOwn(question, 'correct'), false);
    assert.equal(Object.hasOwn(question, 'explanation'), false);
  }
});
test('imported jobs override a matching public source without mutating the cached library', () => {
  const base = {
    jobs: [{
      id: 'old',
      sourceUrl: 'https://example.test/one'
    }, {
      id: 'kept',
      sourceUrl: 'https://example.test/two'
    }]
  };
  const updates = {
    jobs: [{
      id: 'new',
      sourceUrl: 'https://example.test/one'
    }]
  };
  assert.deepEqual(mergePublicCatalog(base, updates).jobs.map(job => job.id), ['new', 'kept']);
  assert.equal(base.jobs[0].id, 'old');
  assert.equal(mergePublicCatalog(base, {
    jobs: []
  }), base);
});
