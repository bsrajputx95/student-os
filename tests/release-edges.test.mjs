import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readApiResponse } from '../src/lib/http-response.js';
import { learningVisuals } from '../shared/learning-visuals.js';
import { catalog } from '../shared/catalog.js';
import { parseAcademicQuery, validateAcademicPlan } from '../server/quid-analysis.mjs';
import { quidReply } from '../server/quid.mjs';
test('gateway errors and invalid JSON produce actionable save-safe messages, while server errors remain intact', async () => {
  await assert.rejects(readApiResponse(new Response('<html>Gateway timeout</html>', {
    status: 504
  })), /Refresh to check your saved work/);
  await assert.rejects(readApiResponse(new Response('', {
    status: 409
  })), /Refresh before trying again/);
  await assert.rejects(readApiResponse(new Response('', {
    status: 401
  })), /session has expired/);
  await assert.rejects(readApiResponse(new Response('not JSON')), /incomplete response/);
  await assert.rejects(readApiResponse(new Response(JSON.stringify({
    error: 'Choose a valid course.'
  }), {
    status: 400
  })), /Choose a valid course/);
  assert.deepEqual(await readApiResponse(new Response(JSON.stringify({
    state: {
      version: 3
    }
  }))), {
    state: {
      version: 3
    }
  });
});
test('all course photographs, local product icons and their attribution survive hosting route rewrites', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const spa = new RegExp('^' + config.rewrites.find(r => r.destination === '/index.html').source + '$');
  const images = JSON.parse(readFileSync('shared/content/learning-images.json', 'utf8'));
  for (const course of catalog.courses) {
    const visual = learningVisuals[course.id];
    assert.ok(visual?.title && visual?.image);
    for (const width of [640, 1200]) {
      const path = `/learning/${visual.image}-${width}.webp`;
      const item = images.find(i => i.path === path);
      assert.ok(item?.source.startsWith('https://unsplash.com/photos/'));
      assert.equal(spa.test(path), false);
      assert.equal(createHash('sha256').update(readFileSync('public' + path)).digest('hex'), item.sha256);
    }
    if (visual.mark && visual.mark !== 'javascript') assert.ok(existsSync(`public/brands/${visual.mark}.svg`));
  }
  assert.equal(spa.test('/icons/product.svg'), false);
  assert.equal(spa.test('/learn'), true);
  assert.equal(spa.test('/practice'), true);
  const sprite = readFileSync('public/icons/product.svg', 'utf8');
  assert.equal((sprite.match(/<symbol /g) || []).length, 25);
  assert.ok(!/<script|foreignObject|\bon\w+=/i.test(sprite));
  assert.ok(readFileSync('public/icons/LICENSE.txt', 'utf8').includes('MIT'));
});
test('Quid recognizes all campus departments and validates career-role filters', () => {
  assert.equal(parseAcademicQuery('Which mechanical students are weak in DSA?').department, 'Mechanical Engineering');
  assert.equal(parseAcademicQuery('Show AI department students with pending assignments').department, 'Artificial Intelligence');
  assert.equal(parseAcademicQuery('Which DevOps engineers are below 40 in DSA?').roleId, 'devops-engineer');
  assert.equal(parseAcademicQuery('Show UI UX designers in second year').roleId, 'ui-ux-designer');
  assert.equal(validateAcademicPlan({
    roleId: 'invented-role'
  }).roleId, undefined);
});
test('an unknown named student asks for a valid directory record without calling the AI provider', async () => {
  const reply = await quidReply({
    message: 'How can I help @hkbk.y4.999?',
    grounding: {
      kind: 'selection',
      name: 'Student not found',
      matches: [],
      sources: ['College student directory']
    }
  }, {
    profile: {
      role: 'teacher'
    }
  }, {
    configured: true,
    generate: () => {
      throw new Error('Provider should not be called');
    }
  });
  assert.match(reply.text, /could not find that username/);
  assert.equal(reply.mode, 'records');
  assert.equal(reply.report, undefined);
});
