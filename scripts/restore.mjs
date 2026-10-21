import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { copyBackupFiles } from '../server/backup-files.mjs';

// Restore only into a new file. This command never overwrites the live database.
const [sourceArg, destinationArg] = process.argv.slice(2);
if (!sourceArg || !destinationArg) throw new Error('Usage: node scripts/restore.mjs <backup.sqlite> <new-directory>/studentos.sqlite');
const source = resolve(sourceArg),
  destination = resolve(destinationArg);
if (!existsSync(source)) throw new Error('Backup file not found.');
if (existsSync(destination)) throw new Error('The restore destination already exists. Choose a new directory.');
const check = new DatabaseSync(source, {
  readOnly: true
});
try {
  if (Object.values(check.prepare('PRAGMA integrity_check').get())[0] !== 'ok') throw new Error('Backup integrity check failed.');
  const manifest = existsSync(source + '.json') ? JSON.parse(readFileSync(source + '.json', 'utf8')) : null;
  if (manifest?.sha256 && manifest.sha256 !== createHash('sha256').update(readFileSync(source)).digest('hex')) throw new Error('Database checksum mismatch.');
  const count = check.prepare('SELECT COUNT(*) AS n FROM files').get().n;
  if (count && (!manifest?.attachments || !existsSync(source + '.files'))) throw new Error('This backup is missing attachment custody.');
  if (count) copyBackupFiles(check, source + '.files', resolve(dirname(destination), 'uploads'), manifest.attachments);
} finally {
  check.close();
}
mkdirSync(dirname(destination), {
  recursive: true
});
copyFileSync(source, destination);
const restored = new DatabaseSync(destination, {
  readOnly: true
});
try {
  console.log(JSON.stringify({
    restored: destination,
    profiles: restored.prepare('SELECT COUNT(*) AS count FROM profiles').get().count,
    integrity: Object.values(restored.prepare('PRAGMA integrity_check').get())[0]
  }));
} finally {
  restored.close();
}
console.log('Stop the application, point STUDENTOS_DATA_DIR at this new directory, then restart and verify accounts before changing traffic.');
