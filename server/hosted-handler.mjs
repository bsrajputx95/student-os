import { EventEmitter } from 'node:events';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, basename } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { BlobPreconditionFailedError } from '@vercel/blob';

// The response stays buffered until durable storage accepts the transaction.
// Cookies/success messages must not escape before a snapshot has been saved.
export class BufferedResponse extends EventEmitter {
  constructor() {
    super();
    this.statusCode = 200;
    this.headers = new Map();
    this.chunks = [];
    this.headersSent = false;
    this.writableEnded = false;
  }
  setHeader(key, value) {
    this.headers.set(key.toLowerCase(), value);
    return this;
  }
  getHeader(key) {
    return this.headers.get(key.toLowerCase());
  }
  removeHeader(key) {
    this.headers.delete(key.toLowerCase());
  }
  writeHead(status, headers = {}) {
    this.statusCode = status;
    for (const [key, value] of Object.entries(headers)) this.setHeader(key, value);
    this.headersSent = true;
    return this;
  }
  write(chunk) {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    return true;
  }
  end(chunk) {
    if (chunk !== undefined) this.write(chunk);
    this.writableEnded = true;
    this.emit('finish');
    return this;
  }
  sendTo(res) {
    res.writeHead(this.statusCode, Object.fromEntries(this.headers));
    res.end(Buffer.concat(this.chunks));
  }
}
export function createHostedHandler({
  store,
  createApp,
  env = process.env
}) {
  let queue = Promise.resolve(),
    lastMaintenance = 0;
  async function perform(req, res, attempt = 0) {
    let directory, app;
    try {
      const saved = await store.current();
      const bytes = gunzipSync(saved.bytes, {
        maxOutputLength: 80 * 1024 * 1024
      });
      if (bytes.subarray(0, 16).toString() !== 'SQLite format 3\0') throw new Error('The saved campus database is invalid.');
      directory = mkdtempSync(resolve(tmpdir(), 'studentos-'));
      const databasePath = resolve(directory, 'studentos.sqlite');
      writeFileSync(databasePath, bytes);
      app = createApp({
        databasePath,
        seed: false,
        env: {
          ...env,
          STUDENTOS_DATA_DIR: directory,
          STUDENTOS_SERVERLESS: '1'
        }
      });
      const before = app.db.prepare('SELECT total_changes() AS n').get().n;
      if (Date.now() - lastMaintenance > 30000 && (req.method === 'POST' || req.url.startsWith('/api/state') || req.url.startsWith('/api/staff/'))) {
        await app.maintenance();
        lastMaintenance = Date.now();
      }
      const buffered = new BufferedResponse();
      await app.handleRequest(req, buffered);
      if (!buffered.writableEnded) throw new Error('The request did not finish.');
      const changed = app.db.prepare('SELECT total_changes() AS n').get().n > before;
      app.db.close();
      app = null;
      if (changed) await store.commit(gzipSync(readFileSync(databasePath)), saved.etag);
      buffered.sendTo(res);
    } catch (error) {
      const conflict = error instanceof BlobPreconditionFailedError || error.name === 'BlobPreconditionFailedError';
      if (conflict && req.method === 'GET' && attempt < 2) {
        app?.db.close();
        app = null;
        return perform(req, res, attempt + 1);
      }
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
    } finally {
      app?.db.close();
      // This is a fresh directory owned by this request under the OS temp dir.
      if (directory && dirname(directory) === resolve(tmpdir()) && basename(directory).startsWith('studentos-')) rmSync(directory, {
        recursive: true,
        force: true
      });
    }
  }
  return function handler(req, res) {
    const task = queue.then(() => perform(req, res));
    queue = task.catch(() => {});
    return task;
  };
}
