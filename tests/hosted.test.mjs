import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { createHostedHandler, BufferedResponse } from '../server/hosted-handler.mjs';
import { createSnapshotStore } from '../server/hosted-storage.mjs';
import { readJsonBody } from '../server/http-body.mjs';
import { createFiles } from '../server/files.mjs';
import { loadConfig } from '../server/config.mjs';
process.env.STUDENTOS_SKIP_ENV = '1';
const {
  createApplication
} = await import('../server/index.mjs');
const environment = {
  NODE_ENV: 'production',
  APP_ORIGIN: 'https://studentos.example',
  STUDENTOS_SERVERLESS: '1',
  STUDENTOS_PRESENTATION: '1'
};
function request(url, payload, cookie) {
  const req = Readable.from([]);
  req.url = url;
  req.method = payload ? 'POST' : 'GET';
  req.headers = {
    origin: environment.APP_ORIGIN,
    ...(cookie ? {
      cookie
    } : {})
  };
  req.socket = {
    remoteAddress: '127.0.0.1'
  };
  if (payload) req.body = payload;
  return req;
}
function reply(res) {
  return JSON.parse(Buffer.concat(res.chunks).toString());
}
function blankSeed() {
  const directory = mkdtempSync(resolve(tmpdir(), 'studentos-hosted-test-'));
  const app = createApplication({
    seed: false,
    env: {
      ...environment,
      STUDENTOS_DATA_DIR: directory
    }
  });
  app.db.close();
  const bytes = gzipSync(readFileSync(resolve(directory, 'studentos.sqlite')));
  rmSync(directory, {
    recursive: true,
    force: true
  });
  return bytes;
}
function memoryStore() {
  let bytes = blankSeed(),
    etag = '1';
  return {
    async current() {
      return {
        bytes,
        etag
      };
    },
    async commit(next, previous) {
      if (previous !== etag) {
        const e = new Error('conflict');
        e.name = 'BlobPreconditionFailedError';
        throw e;
      }
      bytes = next;
      etag = String(Number(etag) + 1);
    }
  };
}
const registration = handle => ({
  mode: 'register',
  name: 'Hosted Fixture',
  handle,
  password: '12345678',
  year: 4,
  department: 'Computer Science',
  email: handle + '@example.test'
});
test('hosted parsing accepts platform-parsed JSON while retaining byte limits', async () => {
  assert.deepEqual(await readJsonBody({
    body: {
      hello: 'world'
    }
  }), {
    hello: 'world'
  });
  assert.deepEqual(await readJsonBody({
    body: Buffer.from('{"n":2}')
  }), {
    n: 2
  });
  await assert.rejects(readJsonBody({
    body: {
      text: 'é'.repeat(20)
    }
  }, 25), {
    status: 413
  });
  await assert.rejects(readJsonBody({
    body: 'not JSON'
  }), SyntaxError);
});
test('private snapshot reads bypass cache and writes require the exact current ETag', async () => {
  const calls = [],
    bytes = Buffer.from('snapshot');
  let reads = 0;
  const store = createSnapshotStore({
    seed: () => {
      throw new Error('not needed');
    },
    read: async (path, options) => {
      calls.push(options);
      reads++;
      return reads === 1 ? {
        statusCode: 200,
        stream: new Response(bytes).body,
        blob: {
          etag: 'one'
        }
      } : {
        statusCode: 304,
        stream: null,
        blob: {
          etag: 'one'
        }
      };
    },
    write: async (path, body, options) => {
      calls.push(options);
      assert.equal(options.ifMatch, 'one');
      return {
        etag: 'two'
      };
    }
  });
  assert.deepEqual((await store.current()).bytes, bytes);
  assert.deepEqual((await store.current()).bytes, bytes);
  await store.commit(Buffer.from('changed'), 'one');
  assert.equal(calls[0].access, 'private');
  assert.equal(calls[0].useCache, false);
  assert.equal(calls[1].ifNoneMatch, 'one');
  assert.equal(calls[2].allowOverwrite, true);
});
test('cold initialization never overwrites the winning function snapshot', async () => {
  let reads = 0;
  const store = createSnapshotStore({
    seed: () => Buffer.from('initial'),
    read: async () => ++reads === 1 ? null : {
      statusCode: 200,
      stream: new Response('winner').body,
      blob: {
        etag: 'winner'
      }
    },
    write: async (path, bytes, options) => {
      assert.equal(options.allowOverwrite, false);
      throw new Error('already exists');
    }
  });
  assert.equal((await store.current()).bytes.toString(), 'winner');
});
test('hosted registration, secure login and activity survive a fresh handler instance', async () => {
  const store = memoryStore(),
    handler = createHostedHandler({
      store,
      createApp: createApplication,
      env: environment
    });
  const created = new BufferedResponse();
  await handler(request('/api/session', registration('hosted.fixture')), created);
  assert.equal(created.statusCode, 200);
  assert.equal(reply(created).profile.year, 4);
  assert.equal(reply(created).profile.enrollmentStatus, 'approved');
  assert.match(created.getHeader('Set-Cookie'), /Secure/);
  const cookie = created.getHeader('Set-Cookie').split(';')[0];
  const cold = createHostedHandler({
    store,
    createApp: createApplication,
    env: environment
  });
  const state = new BufferedResponse();
  await cold(request('/api/state', undefined, cookie), state);
  assert.equal(reply(state).profile.handle, 'hosted.fixture');
  assert.equal(reply(state).realtimeTransport, 'poll');
  const login = new BufferedResponse();
  await cold(request('/api/session', {
    mode: 'login',
    handle: 'hosted.fixture',
    password: '12345678'
  }), login);
  assert.equal(login.statusCode, 200);
  assert.equal(reply(login).profile.id, reply(created).profile.id);
});
test('storage failure does not acknowledge a registration or leak its session cookie', async () => {
  const store = memoryStore();
  store.commit = async () => {
    throw new Error('storage unavailable');
  };
  const handler = createHostedHandler({
      store,
      createApp: createApplication,
      env: environment
    }),
    res = new BufferedResponse();
  await handler(request('/api/session', registration('unsaved.fixture')), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.getHeader('Set-Cookie'), undefined);
  const login = new BufferedResponse();
  await handler(request('/api/session', {
    mode: 'login',
    handle: 'unsaved.fixture',
    password: '12345678'
  }), login);
  assert.equal(login.getHeader('Set-Cookie'), undefined);
});
test('concurrent cold writers return a conflict instead of losing an accepted account', async () => {
  const store = memoryStore(),
    commit = store.commit;
  let entered = 0,
    release;
  const barrier = new Promise(r => release = r);
  store.commit = async (...args) => {
    entered++;
    if (entered === 2) release();
    await barrier;
    await commit(...args);
  };
  const a = createHostedHandler({
      store,
      createApp: createApplication,
      env: environment
    }),
    b = createHostedHandler({
      store,
      createApp: createApplication,
      env: environment
    });
  const ra = new BufferedResponse(),
    rb = new BufferedResponse();
  await Promise.all([a(request('/api/session', registration('writer.one')), ra), b(request('/api/session', registration('writer.two')), rb)]);
  assert.deepEqual([ra.statusCode, rb.statusCode].sort(), [200, 409]);
  assert.equal((ra.statusCode === 409 ? ra : rb).getHeader('Set-Cookie'), undefined);
  const found = new BufferedResponse();
  await a(request('/api/state', undefined, (ra.statusCode === 200 ? ra : rb).getHeader('Set-Cookie').split(';')[0]), found);
  assert.equal(found.statusCode, 200);
  assert.equal(reply(found).profile.handle, ra.statusCode === 200 ? 'writer.one' : 'writer.two');
});
test('hosted attachments store private bytes with the database and retain ownership checks', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE files(id TEXT PRIMARY KEY,owner_id TEXT,college_id TEXT,name TEXT,mime TEXT,size INTEGER,storage_key TEXT,created_at TEXT,context_kind TEXT,context_id TEXT,deleted_at TEXT)');
  const directory = mkdtempSync(resolve(tmpdir(), 'studentos-hosted-files-'));
  const actor = {
    profile: {
      id: 'learner',
      role: 'student',
      collegeId: 'test'
    },
    assignments: [{
      id: 'work'
    }]
  };
  const files = createFiles({
    db,
    dataDir: directory,
    inline: true,
    readProfile: () => actor,
    readCampus: () => ({
      items: []
    })
  });
  const file = files.upload(actor, {
    name: 'solution.txt',
    assignmentId: 'work',
    base64: Buffer.from('A saved solution').toString('base64')
  });
  assert.equal(files.get(actor, file.id).bytes.toString(), 'A saved solution');
  assert.throws(() => files.get({
    profile: {
      id: 'other',
      role: 'student',
      collegeId: 'different'
    }
  }, file.id));
  db.close();
  rmSync(directory, {
    recursive: true,
    force: true
  });
});
test('presentation hosting keeps production security and does not enable samples implicitly', () => {
  const config = loadConfig('.', environment);
  assert.equal(config.production, true);
  assert.equal(config.presentation, true);
  assert.equal(loadConfig('.', {
    NODE_ENV: 'production',
    APP_ORIGIN: environment.APP_ORIGIN
  }).presentation, false);
  assert.equal(config.allowedOrigins.has('https://attacker.example'), false);
});
