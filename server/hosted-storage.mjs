import { get, put } from '@vercel/blob';

// A presentation-scale snapshot store. Strong reads + conditional writes avoid
// acknowledging an update that overwrote another function's newer campus.
export function createSnapshotStore({
  read = get,
  write = put,
  seed,
  pathname = 'studentos/campus-v1.sqlite.gz'
} = {}) {
  let cached;
  async function load() {
    const result = await read(pathname, {
      access: 'private',
      useCache: false,
      ...(cached ? {
        ifNoneMatch: cached.etag
      } : {})
    });
    if (!result) return null;
    if (result.statusCode === 304) {
      if (!cached) throw new Error('Storage returned an invalid conditional response.');
      return cached;
    }
    const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
    const etag = result.blob.etag;
    if (!etag || bytes.length > 24 * 1024 * 1024) throw new Error('The campus snapshot is invalid or exceeds its presentation limit.');
    cached = {
      bytes,
      etag
    };
    return cached;
  }
  async function current() {
    const found = await load();
    if (found) return found;
    const bytes = await seed();
    try {
      const result = await write(pathname, bytes, {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: 'application/gzip'
      });
      cached = {
        bytes,
        etag: result.etag
      };
      return cached;
    } catch (error) {
      // Another cold function can initialize first. Never replace its data.
      const winner = await load();
      if (winner) return winner;
      throw error;
    }
  }
  async function commit(bytes, etag) {
    if (!etag || bytes.length > 24 * 1024 * 1024) throw new Error('The campus snapshot exceeds its presentation limit.');
    const result = await write(pathname, bytes, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      ifMatch: etag,
      contentType: 'application/gzip'
    });
    cached = {
      bytes,
      etag: result.etag
    };
  }
  return {
    current,
    commit
  };
}
