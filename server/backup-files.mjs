import { mkdirSync, copyFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
export function copyBackupFiles(db, source, destination, manifest = null) {
  const rows = db.prepare('SELECT storage_key,size FROM files').all();
  for (const r of rows) {
    if (!/^[a-f0-9-]+\.bin$/.test(r.storage_key)) throw new Error('Invalid attachment storage key.');
    const path = resolve(source, r.storage_key);
    if (!existsSync(path)) throw new Error('Attachment missing: ' + r.storage_key);
    if (readFileSync(path).length !== r.size) throw new Error('Attachment size mismatch.');
    if (manifest && manifest[r.storage_key] !== digest(path)) throw new Error('Attachment checksum mismatch.');
  }
  if (existsSync(destination) && readdirSync(destination).length) throw new Error('Attachment destination must be empty.');
  mkdirSync(destination, {
    recursive: true
  });
  const hashes = {};
  for (const r of rows) {
    copyFileSync(resolve(source, r.storage_key), resolve(destination, r.storage_key));
    hashes[r.storage_key] = digest(resolve(destination, r.storage_key));
  }
  return hashes;
}
