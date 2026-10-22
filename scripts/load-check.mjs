import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { writeFileSync, mkdirSync } from 'node:fs';
const port = 5099,
  origin = 'http://127.0.0.1:' + port;
// This always uses a disposable in-memory campus; never a live institution store.
const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'test',
    PORT: String(port),
    STUDENTOS_TEST_DB: 'memory',
    STUDENTOS_SEED_HKBK: '1'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});
let errors = '';
child.stderr.on('data', d => {
  errors = (errors + d).slice(-2000);
});
try {
  let ready = false;
  for (let i = 0; i < 400; i++) {
    if (child.exitCode !== null) throw new Error('Test server stopped: ' + errors);
    try {
      if ((await fetch(origin + '/api/health')).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  if (!ready) throw new Error('Test server did not become ready: ' + errors);
  const login = await fetch(origin + '/api/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      mode: 'login',
      handle: 'bhavanisingh',
      password: '12345678'
    })
  });
  if (!login.ok) throw new Error('Fixture login failed.');
  const cookie = login.headers.get('set-cookie').split(';')[0];
  await login.arrayBuffer();
  const timings = [],
    sizes = [];
  let failures = 0,
    index = 0;
  await Promise.all(Array.from({
    length: 5
  }, async () => {
    for (;;) {
      const n = index++;
      if (n >= 50) return;
      const start = performance.now();
      const r = await fetch(origin + '/api/state', {
        headers: {
          Cookie: cookie
        }
      });
      const text = await r.text();
      timings.push(performance.now() - start);
      sizes.push(Buffer.byteLength(text));
      if (!r.ok) failures++;
    }
  }));
  const catalog = await fetch(origin + '/api/catalog', {
    headers: {
      'Accept-Encoding': 'gzip'
    }
  });
  await catalog.arrayBuffer();
  const etag = catalog.headers.get('etag');
  const cached = await fetch(origin + '/api/catalog', {
    headers: {
      'If-None-Match': etag
    }
  });
  timings.sort((a, b) => a - b);
  const report = {
    scope: 'Disposable 900-person HKBK fixture; local machine only',
    requests: 50,
    concurrency: 5,
    failures,
    p50Ms: Math.round(timings[24]),
    p95Ms: Math.round(timings[47]),
    maxMs: Math.round(timings.at(-1)),
    averageStateBytes: Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length),
    catalogCompressed: catalog.headers.get('content-encoding') === 'gzip',
    catalogConditionalStatus: cached.status
  };
  mkdirSync('.runtime', {
    recursive: true
  });
  writeFileSync('.runtime/load-check.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (failures || cached.status !== 304) process.exitCode = 1;
} finally {
  child.kill();
  await new Promise(r => {
    if (child.exitCode !== null) return r();
    child.once('exit', r);
    setTimeout(r, 3000);
  });
}
