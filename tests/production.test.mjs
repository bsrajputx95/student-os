import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
test('production enrolls a fresh student into the configured college, hides sample entry points, and enforces secure headers', async () => {
  const origin = 'http://127.0.0.1:5117',
    child = spawn(process.execPath, ['server/index.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        APP_ORIGIN: 'https://college.example',
        COLLEGE_ID: 'production-test-college',
        COLLEGE_NAME: 'Production Test College',
        STUDENTOS_TEST_DB: 'memory',
        STUDENTOS_SEED_HKBK: '0',
        PORT: '5117'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
  let logs = '';
  child.stderr.on('data', d => logs = (logs + d).slice(-1000));
  try {
    let ready = false;
    for (let i = 0; i < 200; i++) {
      try {
        if ((await fetch(origin + '/api/health')).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 50));
    }
    assert.ok(ready, logs);
    const summary = await fetch(origin + '/api/campus-summary').then(r => r.json());
    assert.equal(summary.name, 'Production Test College');
    assert.equal(summary.enabled, false);
    assert.equal(summary.students, 0);
    const register = await fetch(origin + '/api/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mode: 'register',
        name: 'Production Fixture Student',
        handle: 'production-fixture',
        password: 'fixture-password-only',
        email: 'fixture@example.test',
        year: 4
      })
    });
    assert.equal(register.status, 200);
    assert.match(register.headers.get('set-cookie'), /Secure/);
    assert.match(register.headers.get('set-cookie'), /HttpOnly/);
    assert.ok(!register.headers.get('content-security-policy').includes('unsafe-eval'));
    const state = await register.json();
    assert.equal(state.profile.collegeId, 'production-test-college');
    assert.equal(state.profile.enrollmentStatus, 'pending');
    assert.equal(state.communityEnabled, false);
    assert.equal(state.journey.totalDays, 150);
    const cookie = register.headers.get('set-cookie').split(';')[0],
      blocked = await fetch(origin + '/api/staff', {
        headers: {
          Cookie: cookie
        }
      });
    assert.equal(blocked.status, 403);
    const crossOrigin = await fetch(origin + '/api/action', {
      method: 'POST',
      headers: {
        Cookie: cookie,
        Origin: 'https://elsewhere.example',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'profile.update',
        payload: {
          name: 'Not authorized'
        }
      })
    });
    assert.equal(crossOrigin.status, 403);
    assert.deepEqual(await fetch(origin + '/api/workspaces').then(r => r.json()), []);
  } finally {
    child.kill();
    await new Promise(resolve => {
      if (child.exitCode !== null) return resolve();
      child.once('exit', resolve);
      setTimeout(resolve, 2000);
    });
  }
});
