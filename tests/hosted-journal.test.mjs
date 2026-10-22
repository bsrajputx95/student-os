import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { BlobPreconditionFailedError } from '@vercel/blob';
import { createJournalStore } from '../server/hosted-journal.mjs';
import { createFastHostedHandler } from '../server/hosted-fast-handler.mjs';
import { BufferedResponse } from '../server/hosted-handler.mjs';
process.env.STUDENTOS_SKIP_ENV = '1';
const {
  createApplication
} = await import('../server/index.mjs');
const env = {
  NODE_ENV: 'production',
  APP_ORIGIN: 'https://studentos.example',
  STUDENTOS_SERVERLESS: '1',
  STUDENTOS_PRESENTATION: '1'
};
function seed() {
  const dir = mkdtempSync(resolve(tmpdir(), 'studentos-journal-test-'));
  const app = createApplication({
    seed: false,
    env: {
      ...env,
      STUDENTOS_DATA_DIR: dir
    }
  });
  app.db.close();
  const bytes = gzipSync(readFileSync(resolve(dir, 'studentos.sqlite')));
  rmSync(dir, {
    recursive: true,
    force: true
  });
  return bytes;
}
function storage() {
  const blobs = new Map(),
    writes = [];
  let n = 0;
  return {
    blobs,
    writes,
    async read(key, options) {
      assert.equal(options.useCache, false);
      const item = blobs.get(key);
      if (!item) return null;
      return {
        statusCode: options.ifNoneMatch === item.etag ? 304 : 200,
        blob: {
          etag: item.etag
        },
        stream: new Response(item.bytes).body
      };
    },
    async write(key, body, options) {
      const current = blobs.get(key);
      if (current && !options.allowOverwrite || options.ifMatch && current?.etag !== options.ifMatch) throw new BlobPreconditionFailedError();
      const bytes = Buffer.from(body),
        etag = String(++n);
      blobs.set(key, {
        bytes,
        etag
      });
      writes.push({
        key,
        size: bytes.length
      });
      return {
        etag
      };
    }
  };
}
const registration = handle => ({
  mode: 'register',
  name: 'Journal Fixture',
  handle,
  password: '12345678',
  year: 4,
  department: 'Computer Science',
  email: handle + '@example.test'
});
function req(path, body, cookie) {
  const r = Readable.from([]);
  Object.assign(r, {
    url: path,
    method: body ? 'POST' : 'GET',
    headers: {
      origin: env.APP_ORIGIN,
      cookie
    },
    socket: {
      remoteAddress: '127.0.0.1'
    },
    ...(body ? {
      body
    } : {})
  });
  return r;
}
const parse = res => JSON.parse(Buffer.concat(res.chunks).toString());
function fixture() {
  const cloud = storage(),
    legacy = {
      current: async () => ({
        bytes: seed(),
        etag: 'legacy'
      })
    };
  const store = () => createJournalStore({
    ...cloud,
    legacy
  });
  return {
    cloud,
    store,
    handler: () => createFastHostedHandler({
      store: store(),
      createApp: createApplication,
      env
    })
  };
}
test('journal upgrades the live checkpoint, validates objects and publishes small conditional deltas', async () => {
  const cloud = storage(),
    db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE data(id INTEGER PRIMARY KEY,value TEXT); INSERT INTO data VALUES(1,\'live record\')');
  const store = createJournalStore({
    ...cloud,
    legacy: {
      current: async () => ({
        bytes: gzipSync(Buffer.from('existing campus')),
        etag: 'legacy'
      })
    }
  });
  const saved = await store.current();
  assert.equal((await store.object(saved.head.base)).toString(), 'existing campus');
  const session = db.createSession();
  db.exec("UPDATE data SET value='new value' WHERE id=1");
  const committed = await store.commit(session.changeset(), saved, () => {
    throw new Error('Small writes must not checkpoint');
  });
  assert.equal(committed.head.entries.length, 1);
  assert.ok(committed.head.entries[0].size < 200);
  assert.ok(committed.head.entries[0].inline);
  assert.equal(cloud.writes.length, 3, 'one checkpoint, initial head, and one small conditional save');
  const cold = createJournalStore({
    ...cloud,
    legacy: {
      current: () => {
        throw new Error('Must not re-seed');
      }
    }
  });
  assert.equal((await cold.current()).etag, committed.etag);
  await assert.rejects(store.commit(session.changeset(), saved, () => null), BlobPreconditionFailedError);
  const entry = committed.head.entries[0];
  await assert.rejects(cold.object({
    ...entry,
    inline: Buffer.from('corrupt').toString('base64')
  }), /integrity/);
  session.close();
  db.close();
});
test('registration survives cold replay and a warm read uploads nothing', async () => {
  const f = fixture(),
    handler = f.handler(),
    response = new BufferedResponse();
  await handler(req('/api/session', registration('journal.saved')), response);
  assert.equal(response.statusCode, 200);
  const cookie = response.getHeader('set-cookie').split(';')[0];
  assert.match(response.getHeader('set-cookie'), /Secure/);
  handler.close();
  const cold = f.handler(),
    state = new BufferedResponse();
  await cold(req('/api/state', undefined, cookie), state);
  assert.equal(state.statusCode, 200);
  assert.equal(parse(state).profile.handle, 'journal.saved');
  const count = f.cloud.writes.length;
  const again = new BufferedResponse();
  await cold(req('/api/state', undefined, cookie), again);
  assert.equal(again.statusCode, 200);
  assert.equal(f.cloud.writes.length, count);
  cold.close();
});
test('failed journal publication withholds cookies and discards unsaved warm changes', async () => {
  const f = fixture(),
    store = f.store();
  await store.current();
  const commit = store.commit;
  store.commit = async () => {
    throw new Error('offline');
  };
  const handler = createFastHostedHandler({
    store,
    createApp: createApplication,
    env
  });
  const failed = new BufferedResponse();
  await handler(req('/api/session', registration('journal.unsaved')), failed);
  assert.equal(failed.statusCode, 503);
  assert.equal(failed.getHeader('set-cookie'), undefined);
  store.commit = commit;
  const login = new BufferedResponse();
  await handler(req('/api/session', {
    mode: 'login',
    handle: 'journal.unsaved',
    password: '12345678'
  }), login);
  assert.notEqual(login.statusCode, 200);
  assert.equal(login.getHeader('set-cookie'), undefined);
  handler.close();
});
test('concurrent functions cannot overwrite the accepted registration', async () => {
  const f = fixture(),
    aStore = f.store(),
    bStore = f.store();
  await aStore.current();
  await bStore.current();
  let entered = 0,
    release;
  const barrier = new Promise(r => release = r);
  for (const store of [aStore, bStore]) {
    const commit = store.commit;
    store.commit = async (...args) => {
      if (++entered === 2) release();
      await barrier;
      return commit(...args);
    };
  }
  const a = createFastHostedHandler({
      store: aStore,
      createApp: createApplication,
      env
    }),
    b = createFastHostedHandler({
      store: bStore,
      createApp: createApplication,
      env
    });
  const ra = new BufferedResponse(),
    rb = new BufferedResponse();
  await Promise.all([a(req('/api/session', registration('journal.one')), ra), b(req('/api/session', registration('journal.two')), rb)]);
  assert.deepEqual([ra.statusCode, rb.statusCode].sort(), [200, 409]);
  const winner = ra.statusCode === 200 ? ra : rb;
  const reader = f.handler(),
    res = new BufferedResponse();
  await reader(req('/api/state', undefined, winner.getHeader('set-cookie').split(';')[0]), res);
  assert.equal(res.statusCode, 200);
  assert.ok(['journal.one', 'journal.two'].includes(parse(res).profile.handle));
  assert.equal((ra.statusCode === 409 ? ra : rb).getHeader('set-cookie'), undefined);
  a.close();
  b.close();
  reader.close();
});
test('checkpoint compaction retains a replayable complete campus and prior recovery objects', async () => {
  const f = fixture(),
    store = f.store(),
    saved = await store.current();
  const previous = saved.head.base.key;
  const compacted = await store.commit(Buffer.from('a delta'), saved, () => Buffer.from('complete campus'), true);
  assert.equal(compacted.head.entries.length, 0);
  assert.equal((await store.object(compacted.head.base)).toString(), 'complete campus');
  assert.ok(f.cloud.blobs.has(previous));
});
