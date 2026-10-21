import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { copyBackupFiles } from '../server/backup-files.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
if (existsSync(resolve(root, '.env'))) process.loadEnvFile(resolve(root, '.env'));
const dataDir = resolve(root, process.env.STUDENTOS_DATA_DIR || 'data');
const source = resolve(dataDir, 'studentos.sqlite');
if (!existsSync(source)) throw new Error('No database exists at the configured data directory.');
const backupDir = resolve(dataDir, 'backups');
mkdirSync(backupDir, {
  recursive: true
});
const destination = resolve(backupDir, `studentos-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`);
const db = new DatabaseSync(source, {
  readOnly: true
});
try {
  await backup(db, destination);
  const restored = new DatabaseSync(destination, {
    readOnly: true
  });
  try {
    const integrity = restored.prepare('PRAGMA integrity_check').get();
    if (Object.values(integrity)[0] !== 'ok') throw new Error('Backup failed integrity verification.');
    const count = restored.prepare('SELECT COUNT(*) AS count FROM profiles').get().count;
    const digest = createHash('sha256').update(await readFile(destination)).digest('hex');
    const attachments = copyBackupFiles(restored, resolve(dataDir, 'uploads'), destination + '.files');
    writeFileSync(destination + '.json', JSON.stringify({
      createdAt: new Date().toISOString(),
      sha256: digest,
      attachments,
      profiles: count,
      integrity: 'ok'
    }, null, 2));
    console.log(JSON.stringify({
      backup: destination,
      profiles: count,
      integrity: 'ok'
    }));
  } finally {
    restored.close();
  }
} finally {
  db.close();
}
