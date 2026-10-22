import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
process.env.STUDENTOS_SKIP_ENV = '1';
const {
  createApplication
} = await import('../server/index.mjs');
mkdirSync('.runtime', {
  recursive: true
});
const directory = mkdtempSync(resolve('.runtime', 'hosted-seed-'));
const app = createApplication({
  env: {
    NODE_ENV: 'development',
    STUDENTOS_DATA_DIR: directory,
    APP_ORIGIN: 'http://127.0.0.1:5080'
  }
});
const people = app.db.prepare('SELECT COUNT(*) AS n FROM profiles').get().n;
if (people !== 900) throw new Error('A fresh hosted seed must contain exactly 800 fictional students and 100 fictional staff.');
app.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
app.db.close();
const bytes = gzipSync(readFileSync(resolve(directory, 'studentos.sqlite')));
writeFileSync('server/presentation-campus.sqlite.gz', bytes);
console.log(JSON.stringify({
  freshPresentationPeople: people,
  compressedBytes: bytes.length
}));
