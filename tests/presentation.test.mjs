import { mergeEmployerOpportunities } from '../shared/opportunity-snapshot.js';
import { eligibleTitle } from '../scripts/import-employer-opportunities.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { spawn } from 'node:child_process';
import { createProfile } from '../server/profiles.mjs';
import { applyAction } from '../server/model.mjs';
import { courseCertificates, certificateSvg } from '../server/certificates.mjs';
import { getLesson } from '../shared/curriculum.js';
import { catalog } from '../shared/catalog.js';
import { coursePresentation, learningResources } from '../shared/learning-library.js';
import { avatarForPerson, avatarAssetCount } from '../shared/avatar-assets.js';
import { createAuth } from '../server/auth.mjs';
import { createCommunity } from '../server/community.mjs';
import { createCampusService } from '../server/campus.mjs';
import { seedHkbk, HKBK_ID } from '../server/hkbk-seed.mjs';
import { enrichPresentationCampus } from '../server/presentation-seed.mjs';
test('course completion unlocks one stable certificate after successful checks, never from resource saves', () => {
  const s = createProfile({
      name: 'Certificate Student',
      handle: 'certificate-student'
    }),
    course = catalog.courses.find(c => c.id === 'statistics');
  assert.deepEqual(courseCertificates(s), []);
  applyAction(s, 'learning.resource.save', {
    id: learningResources[0].id
  });
  assert.equal(s.savedLearningResources.length, 1);
  assert.deepEqual(courseCertificates(s), []);
  for (let n = 0; n < course.lessons; n++) {
    const lesson = getLesson(course.id, n);
    applyAction(s, 'course.complete', {
      id: course.id,
      lesson: n,
      answer: lesson.correct,
      reflection: 'The worked example supports this answer; I checked the boundary condition.'
    });
    assert.equal(courseCertificates(s).length, n === course.lessons - 1 ? 1 : 0);
  }
  const first = courseCertificates(s)[0];
  applyAction(s, 'course.complete', {
    id: course.id,
    lesson: course.lessons - 1
  });
  assert.deepEqual(courseCertificates(s)[0], first);
  assert.ok(first.completedAt);
  assert.equal(first.issuer, 'StudentOS Learning');
});
test('downloaded certificate artwork escapes student text and preserves the actual issuer', () => {
  const s = createProfile({
    name: 'A <script> & "name"',
    handle: 'escape-student'
  });
  s.courseProgress.react = 24;
  const c = courseCertificates(s)[0],
    svg = certificateSvg(c);
  assert.ok(svg.includes('&lt;script&gt;') && svg.includes('&amp;'));
  assert.ok(!svg.includes('<script>'));
  assert.equal(c.completedAt, null);
  assert.equal(c.provenance, 'Recorded learning history');
  assert.ok(svg.includes('StudentOS Learning'));
});
test('every course preview and imported learning resource resolves to a real internal course and source', () => {
  assert.equal(learningResources.length, 24);
  for (const c of catalog.courses) assert.ok(coursePresentation[c.id]?.topics.length === 4);
  const sources = JSON.parse(readFileSync('shared/content/learning-sources.json', 'utf8'));
  for (const r of learningResources) {
    assert.ok(catalog.courses.some(c => c.id === r.courseId));
    assert.equal(new URL(r.url).protocol, 'https:');
    assert.ok(sources.some(s => s.id === r.id && s.status === 200));
  }
  assert.equal(catalog.companies.length, 60);
  assert.equal(new Set(catalog.companies.map(c => c.id)).size, 60);
  const brands = JSON.parse(readFileSync('shared/content/brands.json', 'utf8'));
  assert.ok(brands.length >= 60 && brands.every(b => b.path && existsSync('public' + b.path)));
  assert.equal(avatarAssetCount, 128);
  assert.equal(avatarForPerson({
    id: 'fixed'
  }), avatarForPerson({
    id: 'fixed',
    name: 'Different name'
  }));
  assert.ok(existsSync('public' + avatarForPerson({
    id: 'fixed'
  })));
});
test('campus enrichment is additive, idempotent and preserves student edits and earned progress', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE profiles(id TEXT PRIMARY KEY,handle TEXT UNIQUE,document TEXT)');
  const saveProfile = s => db.prepare('INSERT INTO profiles VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document').run(s.profile.id, s.profile.handle, JSON.stringify(s));
  const readProfile = id => {
    const row = db.prepare('SELECT document FROM profiles WHERE id=?').get(id);
    return row ? JSON.parse(row.document) : null;
  };
  const auth = createAuth(db),
    community = createCommunity({
      db,
      broadcastCampus: () => {}
    }),
    deps = {
      db,
      auth,
      community,
      readProfile,
      saveProfile
    };
  createCampusService({
    db,
    readProfile,
    saveProfile
  });
  seedHkbk(deps);
  const s = readProfile('demo-bhavanisingh');
  s.resume.summary = 'Keep my own summary.';
  saveProfile(s);
  const before = community.read(HKBK_ID),
    oldPosts = before.posts.length,
    oldEvents = before.events.length,
    progress = structuredClone(s.courseProgress);
  const first = enrichPresentationCampus(deps),
    after = community.read(HKBK_ID);
  assert.equal(first.added, true);
  assert.equal(after.posts.length, oldPosts + 44);
  assert.equal(after.events.length, oldEvents + 12);
  assert.equal(readProfile(s.profile.id).resume.summary, 'Keep my own summary.');
  assert.deepEqual(readProfile(s.profile.id).courseProgress, progress);
  assert.ok(after.posts.filter(p => p.id.startsWith('campus-story')).every(p => p.sample && p.resource?.id));
  assert.equal(enrichPresentationCampus(deps).added, false);
  assert.equal(community.read(HKBK_ID).posts.length, after.posts.length);
  db.close();
});
test('certificate HTTP delivery is authenticated and scoped to the signed-in learner', async () => {
  const port = 5117,
    origin = 'http://127.0.0.1:' + port;
  const child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      STUDENTOS_TEST_DB: 'memory',
      STUDENTOS_SEED_HKBK: '0'
    },
    stdio: 'pipe'
  });
  let errors = '';
  child.stderr.on('data', b => errors += b);
  try {
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(origin + '/api/health')).ok) break;
      } catch {}
      await new Promise(r => setTimeout(r, 50));
    }
    const post = async (data, cookie) => fetch(origin + '/api/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? {
          Cookie: cookie
        } : {})
      },
      body: JSON.stringify(data)
    });
    assert.equal((await fetch(origin + '/api/certificates/react.svg')).status, 401);
    const fresh = await post({
        mode: 'new',
        name: 'Fresh Certificate Learner',
        handle: 'fresh-certificate'
      }),
      cookie = fresh.headers.get('set-cookie').split(';')[0];
    assert.equal((await fetch(origin + '/api/certificates/react.svg', {
      headers: {
        Cookie: cookie
      }
    })).status, 404);
    const sample = await post({
        mode: 'demo'
      }),
      sampleCookie = sample.headers.get('set-cookie').split(';')[0];
    const certificate = await fetch(origin + '/api/certificates/react.svg', {
      headers: {
        Cookie: sampleCookie
      }
    });
    assert.equal(certificate.status, 200);
    assert.match(certificate.headers.get('content-type'), /^image\/svg\+xml/);
    assert.ok((await certificate.text()).includes('Bhavani Singh'));
    const state = await (await fetch(origin + '/api/state', {
      headers: {
        Cookie: sampleCookie
      }
    })).json();
    assert.ok(state.courseCertificates.some(c => c.courseId === 'react'));
  } catch (error) {
    error.message += ' ' + errors;
    throw error;
  } finally {
    child.kill('SIGTERM');
  }
});
test('employer snapshots preserve existing application identities and exclude senior titles', () => {
  const base = JSON.parse(readFileSync('shared/content/jobs.json', 'utf8')),
    imported = JSON.parse(readFileSync('shared/content/employer-opportunities.json', 'utf8'));
  const merged = mergeEmployerOpportunities(base, imported);
  assert.equal(imported.length, 60);
  assert.equal(merged.length, 94);
  assert.deepEqual(mergeEmployerOpportunities(merged, imported), merged);
  for (const row of base) assert.equal(merged.find(r => r.id === row.id), row);
  assert.ok(imported.every(r => r.deadline === null && !r.compensation && r.sourcePostingId && r.retrievedAt && r.eligibility.includes('verify')));
  assert.equal(eligibleTitle('Senior Software Engineer, University Platform'), false);
  assert.equal(eligibleTitle('Software Engineer, Intern'), true);
});
