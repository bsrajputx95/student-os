import { readFileSync } from 'node:fs';
process.env.STUDENTOS_SERVERLESS = '1';
process.env.STUDENTOS_SKIP_ENV = '1';
const [{
  createApplication
}, {
  createSnapshotStore
}, {
  createHostedHandler
}] = await Promise.all([import('../server/index.mjs'), import('../server/hosted-storage.mjs'), import('../server/hosted-handler.mjs')]);
const store = createSnapshotStore({
  pathname: process.env.VERCEL_ENV === 'preview' ? 'studentos/preview-campus-v1.sqlite.gz' : 'studentos/campus-v1.sqlite.gz',
  seed: () => readFileSync(new URL('../server/presentation-campus.sqlite.gz', import.meta.url))
});
export default createHostedHandler({
  store,
  createApp: createApplication
});
