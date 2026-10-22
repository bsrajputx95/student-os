import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createProfile } from '../server/profiles.mjs';
import { metrics } from '../server/model.mjs';
import { createSessions } from '../server/sessions.mjs';
import { BufferedResponse } from '../server/hosted-handler.mjs';
import { savedWorkspace, cacheIdentity, validWorkspace, createWorkspaceCache, CACHE_TTL } from '../src/lib/workspace-cache.js';
import { installPublicCache } from '../src/service-worker.js';
process.env.STUDENTOS_SKIP_ENV = '1';
const { createApplication } = await import('../server/index.mjs');
function student() {
  const state = createProfile({ name: 'Cache Student', handle: 'cache-student' });
  state.profile.collegeId = 'test-college';
  state.metrics = metrics(state);
  return state;
}
test('saved views contain only own learning data and enforce account, TTL and schema boundaries', () => {
  const state = student();
  state.profile.email = 'private@example.test';
  state.profile.password = 'must-not-be-cached';
  state.communityPeople = [{ id: 'other-student', score: 12 }];
  state.communityMessages = [{ text: 'private conversation' }];
  state.quidHistory = ['private AI question'];
  state.resume = { email: 'private@example.test' };
  state.interviewSessions = [{ active: true }];
  const now = Date.now(), record = savedWorkspace(state, now), identity = cacheIdentity(state.profile);
  assert.ok(validWorkspace(record, identity, now));
  assert.equal(validWorkspace(record, identity + '-different', now), false);
  assert.equal(validWorkspace(record, identity, now + CACHE_TTL), false);
  assert.equal(validWorkspace({ ...record, schema: 0 }, identity, now), false);
  assert.equal(validWorkspace({ ...record, view: {} }, identity, now), false);
  assert.ok(!validWorkspace({ ...record, view: { ...record.view, metrics: {} } }, identity, now));
  assert.doesNotMatch(JSON.stringify(record), /private@example|must-not-be-cached|other-student|private conversation|private AI/);
  assert.deepEqual(record.view.interviewSessions, []);
  assert.deepEqual(record.view.solved, state.solved);
  assert.deepEqual(record.view.metrics, state.metrics);
  for (const role of ['teacher', 'placement', 'support', 'admin']) assert.equal(savedWorkspace({ ...state, profile: { ...state.profile, role } }), null);
  assert.equal(savedWorkspace({ ...state, profile: { ...state.profile, enrollmentStatus: 'pending' } }), null);
  assert.equal(savedWorkspace({ ...state, tasks: [{ text: 'x'.repeat(2 * 1024 * 1024) }] }), null);
});
test('clearing a cache defeats pending writes; stale responses cannot replace newer progress', async () => {
  let record = null;
  const cache = createWorkspaceCache({ read: async () => record, write: async value => { record = structuredClone(value); } });
  const state = student();
  const pending = cache.save(state), clearing = cache.clear();
  await Promise.all([pending, clearing]);
  assert.equal(record, null);
  await cache.save({ ...state, version: 8 });
  await cache.save({ ...state, version: 3 });
  assert.equal((await cache.read()).view.version, 8);
  await cache.save({ ...state, profile: { ...state.profile, role: 'teacher' } });
  assert.equal(await cache.read(), null);
  const broken = createWorkspaceCache({ read: async () => { throw new Error('Storage disabled'); }, write: async () => { throw new Error('Quota exceeded'); } });
  assert.equal(await broken.read(), null);
  await broken.save(state);
  await broken.clear();
});
function workerFixture() {
  const listeners = new Map(), stores = new Map(), fetched = [];
  const scope = {
    location: { origin: 'https://studentos.example' },
    addEventListener: (name, handler) => listeners.set(name, handler),
    clients: { claim: async () => {} }, skipWaiting: async () => {},
    caches: {
      open: async name => {
        if (!stores.has(name)) stores.set(name, new Map());
        const store = stores.get(name);
        return { match: async key => store.get(typeof key === 'string' ? key : new URL(key.url).pathname)?.clone(), put: async (key, response) => store.set(typeof key === 'string' ? key : new URL(key.url).pathname, response.clone()) };
      },
      keys: async () => [...stores.keys()],
      delete: async name => stores.delete(name),
      match: async request => {
        for (const store of stores.values()) {
          const response = store.get(new URL(request.url).pathname);
          if (response) return response.clone();
        }
      }
    },
    fetch: async request => {
      fetched.push(typeof request === 'string' ? request : request.url);
      const path = typeof request === 'string' ? request : request.url;
      return new Response('public content', { headers: { 'content-type': path.endsWith('.js') ? 'text/javascript' : 'text/html' } });
    }
  };
  installPublicCache(scope, 'release-two', ['/assets/route-two.js']);
  return { listeners, stores, fetched, scope };
}
test('service worker bypasses APIs, submissions, cross-origin requests and isolated practice runner', async () => {
  const { listeners, fetched } = workerFixture();
  for (const [path, method] of [['/api/state', 'GET'], ['/api/staff', 'GET'], ['/api/quid', 'POST'], ['/api/files/private.png', 'GET'], ['/practice-runner.html', 'GET'], ['https://other.example/assets/file.js', 'GET']]) {
    let intercepted = false;
    listeners.get('fetch')({ request: new Request(new URL(path, 'https://studentos.example'), { method }), respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, false, path);
  }
  assert.equal(fetched.length, 0);
});
test('public files are reused, failed network navigation has a shell, and old route chunks survive updates', async () => {
  const { listeners, fetched, scope, stores } = workerFixture();
  let installed;
  listeners.get('install')({ waitUntil: promise => { installed = promise; } });
  await installed;
  const request = new Request('https://studentos.example/assets/route-two.js');
  let response;
  listeners.get('fetch')({ request, respondWith: promise => { response = promise; } });
  await response;
  const calls = fetched.length;
  listeners.get('fetch')({ request, respondWith: promise => { response = promise; } });
  assert.equal(await (await response).text(), 'public content');
  assert.equal(fetched.length, calls);
  stores.set('studentos-public-release-zero', new Map());
  stores.set('studentos-public-release-one', new Map([['/assets/route-one.js', new Response('old route')]]));
  let activated;
  listeners.get('activate')({ waitUntil: promise => { activated = promise; } });
  await activated;
  assert.ok(!stores.has('studentos-public-release-zero'));
  scope.fetch = async () => { throw new Error('Offline'); };
  listeners.get('fetch')({ request: { url: 'https://studentos.example/learn', method: 'GET', mode: 'navigate' }, respondWith: promise => { response = promise; } });
  assert.equal(await (await response).text(), 'public content');
  listeners.get('fetch')({ request: new Request('https://studentos.example/assets/route-one.js'), respondWith: promise => { response = promise; } });
  assert.equal(await (await response).text(), 'old route');
});
test('HTML error pages and cache quota failures cannot poison or block public file requests', async () => {
  const { scope, listeners, stores } = workerFixture();
  scope.fetch = async () => new Response('<html>Gateway fallback</html>', { headers: { 'content-type': 'text/html' } });
  let response;
  listeners.get('fetch')({ request: new Request('https://studentos.example/assets/missing.js'), respondWith: promise => { response = promise; } });
  await response;
  assert.equal(stores.get('studentos-public-release-two').size, 0);
  scope.caches.open = async () => ({ match: async () => undefined, put: async () => { throw new Error('Quota exceeded'); } });
  scope.fetch = async () => new Response('export default 1;', { headers: { 'content-type': 'text/javascript' } });
  listeners.get('fetch')({ request: new Request('https://studentos.example/assets/file.js'), respondWith: promise => { response = promise; } });
  assert.equal(await (await response).text(), 'export default 1;');
  scope.caches.open = async () => { throw new Error('Storage unavailable'); };
  listeners.get('fetch')({ request: new Request('https://studentos.example/assets/file-two.js'), respondWith: promise => { response = promise; } });
  assert.equal(await (await response).text(), 'export default 1;');
});
test('identity checks are minimal, no-store, session validated and revoked immediately at logout', async () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'studentos-cache-test-')), db = new DatabaseSync(':memory:');
  const app = createApplication({ db, seed: false, env: { APP_ORIGIN: 'http://127.0.0.1:5080', STUDENTOS_DATA_DIR: directory, STUDENTOS_SEED_HKBK: '0' } });
  const call = async (path, cookie, method = 'GET') => {
    const req = Readable.from([]);
    Object.assign(req, { url: path, method, headers: { ...(cookie ? { cookie } : {}) }, socket: { remoteAddress: '127.0.0.1' } });
    if (method === 'POST') req.body = {};
    const res = new BufferedResponse();
    await app.handleRequest(req, res);
    return { res, body: JSON.parse(Buffer.concat(res.chunks).toString()) };
  };
  try {
    assert.equal((await call('/api/session/identity')).body.sessionRequired, true);
    const state = student();
    db.prepare('INSERT INTO profiles VALUES(?,?,?)').run(state.profile.id, state.profile.handle, JSON.stringify(state));
    const cookie = createSessions(db).create(state.profile.id).split(';')[0];
    const { res, body } = await call('/api/session/identity', cookie);
    assert.equal(res.statusCode, 200);
    assert.equal(res.getHeader('cache-control'), 'no-store');
    assert.equal(body.profile.id, state.profile.id);
    assert.deepEqual(Object.keys(body.profile).sort(), ['college', 'collegeId', 'id', 'role']);
    assert.ok(Buffer.byteLength(JSON.stringify(body)) < 300);
    await call('/api/session/end', cookie, 'POST');
    assert.equal((await call('/api/session/identity', cookie)).body.sessionRequired, true);
    const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
    const spa = new RegExp('^' + config.rewrites.find(rule => rule.destination === '/index.html').source + '$');
    assert.equal(spa.test('/sw.js'), false);
    assert.ok(config.headers.find(rule => rule.source === '/sw.js').headers.some(header => header.value.includes('no-cache')));
  } finally { db.close(); rmSync(directory, { recursive: true, force: true }); }
});
