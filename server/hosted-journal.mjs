import { get, put } from '@vercel/blob';
import { createHash, randomUUID } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const MAX_BLOB = 24 * 1024 * 1024;

// An immutable checkpoint and small SQLite changesets, published through a tiny
// conditional head. An acknowledged write is always durable; losing writers
// cannot overwrite a newer campus. Old checkpoints remain available for recovery.
export function createJournalStore({
  read = get,
  write = put,
  legacy,
  prefix = 'studentos/journal-v2'
}) {
  const headPath = prefix + '/head.json';
  let cached;
  const objects = new Map();
  function validate(head) {
    const valid = item => item && typeof item.key === 'string' && item.key.startsWith(prefix + '/objects/') && /^[a-f0-9]{64}$/.test(item.hash) && Number.isInteger(item.size) && item.size > 0 && item.size <= MAX_BLOB && (item.inline === undefined || typeof item.inline === 'string' && item.inline.length <= 90000);
    if (head.version !== 2 || !valid(head.base) || !Array.isArray(head.entries) || head.entries.length > 128 || !head.entries.every(valid) || new Set(head.entries.map(e => e.key)).size !== head.entries.length) throw new Error('Invalid campus journal.');
    return head;
  }
  async function loadHead() {
    const found = await read(headPath, {
      access: 'private',
      useCache: false,
      // JSON response compression can produce a weak/variant HTTP ETag, which
      // cannot be used as the storage object's conditional-write version.
      headers: {
        'Accept-Encoding': 'identity'
      },
      ...(cached ? {
        ifNoneMatch: cached.etag
      } : {})
    });
    if (!found) return null;
    if (found.statusCode === 304) {
      if (!cached) throw new Error('Invalid conditional journal response.');
      return cached;
    }
    const bytes = Buffer.from(await new Response(found.stream).arrayBuffer());
    if (bytes.length > 3 * 1024 * 1024 || !found.blob.etag) throw new Error('Invalid campus head.');
    cached = {
      head: validate(JSON.parse(bytes.toString())),
      etag: found.blob.etag
    };
    return cached;
  }
  async function putObject(bytes) {
    if (!bytes.length || bytes.length > MAX_BLOB) throw new Error('Campus change exceeds its storage limit.');
    const item = {
      key: prefix + '/objects/' + randomUUID() + '.gz',
      hash: digest(bytes),
      size: bytes.length
    };
    await write(item.key, bytes, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: 'application/gzip'
    });
    remember(item.key, bytes);
    return item;
  }
  function remember(key, bytes) {
    objects.set(key, bytes);
    let size = [...objects.values()].reduce((n, value) => n + value.length, 0);
    while (objects.size > 130 || size > 32 * 1024 * 1024) {
      const oldest = objects.keys().next().value;
      size -= objects.get(oldest).length;
      objects.delete(oldest);
    }
  }
  async function current() {
    const found = await loadHead();
    if (found) return found;
    // Upgrade the existing live database, never a fresh build's sample seed.
    const previous = await legacy.current();
    const base = await putObject(previous.bytes);
    const head = {
      version: 2,
      revision: randomUUID(),
      base,
      entries: []
    };
    try {
      const result = await write(headPath, JSON.stringify(head), {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: 'application/json'
      });
      return cached = {
        head,
        etag: result.etag
      };
    } catch (error) {
      const winner = await loadHead();
      if (winner) return winner;
      throw error;
    }
  }
  async function object(item) {
    let bytes = item.inline === undefined ? objects.get(item.key) : Buffer.from(item.inline, 'base64');
    if (!bytes) {
      const result = await read(item.key, {
        access: 'private',
        useCache: false
      });
      if (!result || result.statusCode !== 200) throw new Error('Missing campus journal object.');
      bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
    }
    if (bytes.length !== item.size || digest(bytes) !== item.hash) throw new Error('Campus journal integrity check failed.');
    remember(item.key, bytes);
    return gunzipSync(bytes, {
      maxOutputLength: 80 * 1024 * 1024
    });
  }
  async function commit(changes, saved, checkpoint, forceCheckpoint = false) {
    if (!changes.length && !forceCheckpoint) return saved;
    const compressed = gzipSync(changes, {
      level: 1
    });
    const compact = forceCheckpoint || saved.head.entries.length >= 127 || saved.head.entries.reduce((n, e) => n + e.size, compressed.length) > 2 * 1024 * 1024;
    const head = {
      ...saved.head,
      revision: randomUUID()
    };
    if (compact) {
      head.base = await putObject(gzipSync(await checkpoint(), {
        level: 1
      }));
      head.entries = [];
    } else {
      // Small changes are durable in the conditional head itself. This removes
      // a storage round trip for login, bookmarks, drafts and most progress saves,
      // and avoids dozens of network reads when a cold function replays history.
      const entry = compressed.length <= 64 * 1024 ? {
        key: prefix + '/objects/' + randomUUID() + '.gz',
        hash: digest(compressed),
        size: compressed.length,
        inline: compressed.toString('base64')
      } : await putObject(compressed);
      head.entries = [...saved.head.entries, entry];
    }
    const result = await write(headPath, JSON.stringify(head), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      ifMatch: saved.etag,
      contentType: 'application/json'
    });
    return cached = {
      head,
      etag: result.etag
    };
  }
  return {
    current,
    object,
    commit
  };
}
