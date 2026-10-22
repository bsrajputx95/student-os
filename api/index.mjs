import { readFileSync } from 'node:fs';
process.env.STUDENTOS_SERVERLESS = '1';
process.env.STUDENTOS_SKIP_ENV = '1';
const [{
  createApplication
}, {
  createSnapshotStore
}, {
  createFastHostedHandler
}, {
  createJournalStore
}] = await Promise.all([import('../server/index.mjs'), import('../server/hosted-storage.mjs'), import('../server/hosted-fast-handler.mjs'), import('../server/hosted-journal.mjs')]);
const legacy = createSnapshotStore({
  pathname: process.env.VERCEL_ENV === 'preview' ? 'studentos/preview-campus-v1.sqlite.gz' : 'studentos/campus-v1.sqlite.gz',
  seed: () => readFileSync(new URL('../server/presentation-campus.sqlite.gz', import.meta.url))
});
const store = createJournalStore({
  legacy,
  prefix: process.env.VERCEL_ENV === 'preview' ? 'studentos/preview-journal-v2' : 'studentos/journal-v2'
});
export default createFastHostedHandler({
  store,
  createApp: createApplication
});
