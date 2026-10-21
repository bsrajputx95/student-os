import { getLesson } from '../shared/curriculum.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile } from '../server/profiles.mjs';
import { applyAction, metrics, dateKey } from '../server/model.mjs';
import { missionFor } from '../shared/journey.js';
import { catalog } from '../shared/catalog.js';
import { quidReply, resumeAssist } from '../server/quid.mjs';
import { spawn } from 'node:child_process';
test('unrelated practice does not complete an assigned lesson or coding task', () => {
  const s = createProfile({
    name: 'Connected Student',
    handle: 'connected-student'
  });
  s.tasks = [{
    id: 'assigned-code',
    kind: 'coding',
    resourceId: 'lc-2',
    category: 'DSA',
    xp: 40,
    date: dateKey(),
    status: 'pending'
  }, {
    id: 'assigned-course',
    kind: 'course',
    resourceId: 'react',
    lesson: 4,
    category: 'Frontend',
    xp: 30,
    date: dateKey(),
    status: 'pending'
  }];
  applyAction(s, 'coding.submit', {
    id: 'two-sum'
  });
  assert.equal(s.tasks[0].status, 'pending');
  applyAction(s, 'course.complete', {
    id: 'react',
    lesson: 0,
    answer: getLesson('react', 0)?.correct,
    reflection: 'I traced the example and checked a boundary case in my own words.'
  });
  assert.equal(s.tasks[1].status, 'pending');
  applyAction(s, 'course.complete', {
    id: 'react',
    lesson: 4,
    answer: getLesson('react', 4)?.correct,
    reflection: 'I traced the example and checked a boundary case in my own words.'
  });
  assert.equal(s.tasks[1].status, 'completed');
});
test('new workspaces start empty and demo achievements remain isolated', () => {
  const fresh = createProfile({
      name: 'New Student',
      handle: 'new-student'
    }),
    demo = createProfile({
      mode: 'demo'
    });
  assert.equal(metrics(fresh).readiness, 0);
  assert.equal(metrics(fresh).solved, 0);
  assert.equal(fresh.posts.length, 0);
  assert.equal(fresh.applications.length, 0);
  assert.ok(!fresh.profile.onboardingDone);
  assert.equal(demo.profile.handle, 'bhavanisingh');
  assert.equal(metrics(demo).solved, 426);
  assert.ok(metrics(demo).readiness >= 95);
  fresh.skills.DSA = 50;
  assert.equal(demo.skills.DSA, 96);
});
test('every year has a complete journey with balanced daily budgets and rest', () => {
  const s = createProfile({
    name: 'Student One',
    handle: 'student-one'
  });
  for (let year = 1; year <= 4; year++) {
    s.profile.year = year;
    s.journey.totalDays = 365 * (5 - year);
    s.journey.startedAt = '2026-10-19';
    let rest = 0,
      events = 0;
    for (let day = 1; day <= s.journey.totalDays; day++) {
      const m = missionFor(s.profile, s.journey, day, catalog);
      assert.equal(m.number, day);
      if (m.rest) {
        rest++;
        assert.equal(m.steps.length, 0);
      } else {
        assert.equal(m.steps.reduce((sum, t) => sum + t.minutes, 0), s.profile.dailyMinutes);
        for (const item of m.steps) if (item.kind === 'coding') assert.ok(catalog.problems.some(p => p.id === item.resourceId));
        events += Number(m.event);
      }
    }
    assert.ok(rest > 80);
    assert.equal(missionFor(s.profile, s.journey, s.journey.totalDays, catalog).phase, 7);
    assert.equal(year === 4 ? events === 0 : events > 0, true);
  }
});
test('external practice is idempotent and connects to its daily task', () => {
  const s = createProfile({
    name: 'Student Two',
    handle: 'student-two'
  });
  s.tasks = [{
    id: 'assigned',
    kind: 'coding',
    resourceId: 'lc-2',
    category: 'DSA',
    xp: 40,
    date: dateKey(),
    status: 'pending'
  }, {
    id: 'next',
    kind: 'interview',
    date: dateKey(),
    status: 'pending'
  }];
  applyAction(s, 'practice.track', {
    id: 'lc-2'
  });
  assert.equal(s.tasks[0].status, 'completed');
  const xp = s.journey.xp;
  applyAction(s, 'practice.track', {
    id: 'lc-2'
  });
  assert.equal(s.journey.xp, xp);
  assert.equal(metrics(s).solved, 1);
});
test('reviewed resume edits can be applied and undone without losing originals', () => {
  const s = createProfile({
      mode: 'demo'
    }),
    original = structuredClone(s.resume);
  applyAction(s, 'resume.apply-ai', {
    draft: {
      headline: 'A clearer headline',
      summary: 'A reviewed summary.'
    }
  });
  assert.equal(s.resume.headline, 'A clearer headline');
  assert.equal(s.resume.email, original.email);
  applyAction(s, 'resume.undo-ai');
  assert.deepEqual(s.resume, original);
});
test('unconnected Quid provides navigation and honest local resume suggestions', async () => {
  const s = createProfile({
    mode: 'demo'
  });
  const reply = await quidReply({
    message: 'edit my resume'
  }, s);
  assert.equal(reply.mode, 'app-guide');
  assert.ok(reply.actions.some(a => a.route === '/career?tab=resume'));
  const result = await resumeAssist({
    targetRole: 'Software Engineer'
  }, s);
  assert.equal(result.aiConnected, false);
  assert.equal(result.draft.summary, s.resume.summary);
});
test('HTTP sessions persist changes and isolate fresh and demo workspaces', async () => {
  const child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: '5097',
      STUDENTOS_TEST_DB: 'memory'
    },
    stdio: 'pipe'
  });
  let output = '';
  child.stderr.on('data', d => output += d);
  try {
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch('http://127.0.0.1:5097/api/health')).ok) break;
      } catch {}
      await new Promise(r => setTimeout(r, 50));
    }
    const call = async (path, data, cookie) => {
      const res = await fetch('http://127.0.0.1:5097/api/' + path, {
        method: data ? 'POST' : 'GET',
        headers: {
          ...(data ? {
            'Content-Type': 'application/json'
          } : {}),
          ...(cookie ? {
            Cookie: cookie
          } : {})
        },
        ...(data ? {
          body: JSON.stringify(data)
        } : {})
      });
      return {
        res,
        data: await res.json(),
        cookie: res.headers.get('set-cookie')?.split(';')[0]
      };
    };
    assert.equal((await call('state')).data.sessionRequired, true);
    const demo = await call('session', {
        mode: 'demo'
      }),
      fresh = await call('session', {
        mode: 'new',
        name: 'Fresh Student',
        handle: 'fresh-student'
      });
    assert.ok(demo.cookie);
    assert.equal(fresh.data.metrics.readiness, 0);
    await call('action', {
      type: 'social.post',
      payload: {
        text: 'Only in the fresh workspace'
      }
    }, fresh.cookie);
    assert.equal((await call('state', null, fresh.cookie)).data.posts.length, 1);
    assert.equal((await call('state', null, demo.cookie)).data.posts.length, 3);
    const ai = await call('resume/assist', {
      instruction: 'Polish'
    }, demo.cookie);
    assert.equal(ai.data.mode, 'local-edit');
    const saved = await call('session', {
      mode: 'existing',
      id: fresh.data.profile.id
    });
    assert.equal(saved.data.posts[0].text, 'Only in the fresh workspace');
  } catch (e) {
    e.message += ' ' + output;
    throw e;
  } finally {
    child.kill('SIGTERM');
  }
});
