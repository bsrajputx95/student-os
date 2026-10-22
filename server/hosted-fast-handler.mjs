import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, basename } from 'node:path';
import { BlobPreconditionFailedError } from '@vercel/blob';
import { BufferedResponse } from './hosted-handler.mjs';
export function createFastHostedHandler({
  store,
  createApp,
  env = process.env
}) {
  let queue = Promise.resolve(),
    warm,
    lastMaintenance = 0;
  function discard() {
    warm?.db.close();
    const directory = warm?.directory;
    warm = null;
    if (directory && dirname(directory) === resolve(tmpdir()) && basename(directory).startsWith('studentos-fast-')) rmSync(directory, {
      recursive: true,
      force: true
    });
  }
  async function perform(req, res, attempt = 0) {
    let session;
    try {
      const saved = await store.current();
      const entries = saved.head.entries;
      if (warm && (warm.base !== saved.head.base.key || warm.applied.length > entries.length || warm.applied.some((key, i) => key !== entries[i]?.key))) discard();
      if (!warm) {
        const bytes = await store.object(saved.head.base);
        if (bytes.subarray(0, 16).toString() !== 'SQLite format 3\0') throw new Error('Invalid campus checkpoint.');
        const directory = mkdtempSync(resolve(tmpdir(), 'studentos-fast-'));
        const databasePath = resolve(directory, 'studentos.sqlite');
        writeFileSync(databasePath, bytes);
        warm = {
          directory,
          databasePath,
          db: new DatabaseSync(databasePath),
          base: saved.head.base.key,
          applied: []
        };
      }
      for (const entry of entries.slice(warm.applied.length)) {
        if (!warm.db.applyChangeset(await store.object(entry))) throw new Error('Campus changeset could not be applied.');
        warm.applied.push(entry.key);
      }
      const schema = warm.db.prepare('PRAGMA schema_version').get().schema_version;
      session = warm.db.createSession();
      const app = createApp({
        db: warm.db,
        databasePath: warm.databasePath,
        seed: false,
        env: {
          ...env,
          STUDENTOS_DATA_DIR: warm.directory,
          STUDENTOS_SERVERLESS: '1'
        }
      });
      const maintain = Date.now() - lastMaintenance > 30000 && (req.method === 'POST' || req.url.startsWith('/api/state') || req.url.startsWith('/api/staff/'));
      if (maintain) await app.maintenance();
      const buffered = new BufferedResponse();
      await app.handleRequest(req, buffered);
      if (!buffered.writableEnded) throw new Error('The request did not finish.');
      const changes = session.changeset();
      session.close();
      session = null;
      const schemaChanged = schema !== warm.db.prepare('PRAGMA schema_version').get().schema_version;
      const committed = await store.commit(changes, saved, () => {
        warm.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
        return readFileSync(warm.databasePath);
      }, schemaChanged);
      warm.base = committed.head.base.key;
      warm.applied = committed.head.entries.map(e => e.key);
      if (maintain) lastMaintenance = Date.now();
      buffered.sendTo(res);
    } catch (error) {
      session?.close();
      discard(); // Never reuse local changes that were not accepted by storage.
      const conflict = error instanceof BlobPreconditionFailedError || error.name === 'BlobPreconditionFailedError';
      if (conflict && req.method === 'GET' && attempt < 2) return perform(req, res, attempt + 1);
      console.error(JSON.stringify({
        event: 'hosted.request.error',
        kind: conflict ? 'conflict' : 'storage',
        message: String(error.message).slice(0, 180)
      }));
      res.writeHead(conflict ? 409 : 503, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify({
        error: conflict ? 'The campus changed while this request was running. Refresh and try again.' : 'The campus could not be saved right now. Please try again shortly.'
      }));
    }
  }
  const handler = (req, res) => {
    const task = queue.then(() => perform(req, res));
    queue = task.catch(() => {});
    return task;
  };
  handler.close = discard;
  return handler;
}
