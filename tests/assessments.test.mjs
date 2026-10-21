import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { projectLabs, projectFiles, assessmentLabs, canonical } from '../shared/assessments.js';
import { zipFiles } from '../shared/zip.js';
import { catalog } from '../shared/catalog.js';
import { evaluateSql, referenceSql, validateSql } from '../server/sql-labs.mjs';
import { runSqlLab } from '../server/assessment-service.mjs';
import { createProfile } from '../server/profiles.mjs';
import { applyAction, ensureDailyPlan, dateKey, recordAssessment, assessmentSession } from '../server/model.mjs';
import { buildPlan, missionFor, defaultPlanDays, addDays } from '../shared/journey.js';
const solutions = {
  'webhook-replay': `export function handleWebhook(s,e){if(e.type!=='payment.succeeded'||!Number.isInteger(e.amountCents)||e.amountCents<=0||s.seen.includes(e.id))return {...s,seen:[...s.seen]};return {balanceCents:s.balanceCents+e.amountCents,seen:[...s.seen,e.id]};}`,
  'refund-boundary': `export function refundPayment(p,n){if(p.status!=='captured')return {ok:false,error:'NOT_CAPTURED'};if(!Number.isInteger(n)||n<=0)return {ok:false,error:'INVALID_REFUND'};if(p.refundedCents+n>p.capturedCents)return {ok:false,error:'EXCEEDS_CAPTURED'};return {ok:true,totalRefundedCents:p.refundedCents+n};}`,
  'inventory-atomicity': `export function reserveStock(stock,cart){const demand={};for(const i of cart){if(!Number.isInteger(i.qty)||i.qty<=0||!Object.hasOwn(stock,i.sku))return {ok:false,stock:{...stock}};demand[i.sku]=(demand[i.sku]||0)+i.qty;}if(Object.entries(demand).some(([k,n])=>stock[k]<n))return {ok:false,stock:{...stock}};const next={...stock};for(const [k,n] of Object.entries(demand))next[k]-=n;return {ok:true,stock:next};}`,
  'retry-storm': `export function retryPlan(s,n,h){if(n>=3||n<0||!(s===429||s>=500&&s<=599))return {retry:false,delayMs:0};return {retry:true,delayMs:s===429&&h>0?h*1000:1000*2**n};}`,
  'tenant-isolation': `export function listOrders(orders,tenantId,cursor,limit){if(limit<1)return [];return orders.filter(o=>o.tenant===tenantId&&o.id>cursor).sort((a,b)=>a.id-b.id).slice(0,limit);}`
};
test('all five original starter projects reproduce bugs and known repairs pass every check without mutation', () => {
  for (const lab of projectLabs) {
    const compile = code => new Function(code.replace(/\bexport\s+/g, '') + ';return ' + lab.fn)();
    const fixed = compile(solutions[lab.id]),
      broken = compile(lab.starter);
    let failures = 0;
    for (const item of lab.tests) {
      const args = structuredClone(item.args),
        before = structuredClone(args);
      assert.deepEqual(canonical(fixed(...args)), canonical(item.expected), lab.id + ' / ' + item.name);
      assert.deepEqual(args, before);
      const badArgs = structuredClone(item.args);
      try {
        if (JSON.stringify(canonical(broken(...badArgs))) !== JSON.stringify(canonical(item.expected)) || JSON.stringify(badArgs) !== JSON.stringify(item.args)) failures++;
      } catch {
        failures++;
      }
    }
    assert.ok(failures > 0, lab.id);
  }
});
test('downloadable ZIPs contain a real module, Node test runner, fixtures, and runnable instructions', () => {
  for (const lab of projectLabs) {
    const files = projectFiles(lab),
      bytes = zipFiles(files),
      view = new DataView(bytes.buffer);
    assert.equal(view.getUint32(0, true), 0x04034b50);
    let offset = 0;
    const decoded = {};
    while (view.getUint32(offset, true) === 0x04034b50) {
      const size = view.getUint32(offset + 18, true),
        nameLength = view.getUint16(offset + 26, true),
        extra = view.getUint16(offset + 28, true),
        name = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameLength)),
        start = offset + 30 + nameLength + extra;
      decoded[name] = new TextDecoder().decode(bytes.slice(start, start + size));
      offset = start + size;
    }
    assert.deepEqual(decoded, files);
    assert.ok(files['README.md'].includes('npm test'));
    assert.ok(files['test/assessment.test.js'].includes('Do not mutate inputs'));
  }
});
test('all SQL references pass three fresh datasets; wrong results and unsafe statements cannot pass', () => {
  for (const [id, query] of Object.entries(referenceSql)) {
    const result = evaluateSql(id, query);
    assert.equal(result.score, 100, id);
    assert.equal(result.checks.length, 3);
  }
  assert.equal(evaluateSql('net-revenue', 'SELECT 0 AS customer_id,0 AS net_cents').score, 0);
  for (const sql of ["ATTACH DATABASE 'private.sqlite' AS secret", 'SELECT 1; DROP TABLE payments', 'WITH RECURSIVE x(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM x) SELECT * FROM x', "SELECT load_extension('anything')", 'PRAGMA database_list']) assert.throws(() => validateSql(sql));
  assert.equal(evaluateSql('unpaid-orders', referenceSql['unpaid-orders']).score, 100);
});
test('SQL runs in a disposable process with results isolated from the application database', async () => {
  const result = await runSqlLab('duplicate-events', referenceSql['duplicate-events']);
  assert.equal(result.score, 100);
  await assert.rejects(runSqlLab('duplicate-events', 'SELECT FROM broken'), /syntax/);
});
test('a new fourth-year plan has 150 calendar days, balanced budgets, rest, and practical assessments', () => {
  const s = createProfile({
    name: 'New Final Year',
    handle: 'new-final-year'
  });
  s.profile.year = 4;
  assert.equal(defaultPlanDays(4), 150);
  const plan = buildPlan(s.profile, dateKey(), {
    days: 150
  });
  let active = 0,
    sql = 0,
    project = 0;
  const courses = new Set();
  for (let day = 1; day <= 150; day++) {
    const m = missionFor(s.profile, plan, day, catalog);
    if (m.rest) {
      assert.equal(m.steps.length, 0);
      continue;
    }
    active++;
    assert.equal(m.steps.reduce((n, t) => n + t.minutes, 0), s.profile.dailyMinutes);
    assert.equal(m.event, false);
    for (const t of m.steps) {
      if (t.kind === 'course') courses.add(t.resourceId);
      if (t.kind === 'assessment') {
        assert.ok(assessmentLabs.some(l => l.id === t.resourceId));
        if (t.category === 'Databases') sql++;else project++;
      }
    }
  }
  assert.ok(active >= 100 && active <= 110);
  assert.ok(sql > 5 && project > 2);
  assert.ok(courses.size >= 4);
  assert.equal(plan.targetDate, addDays(dateKey(), 149));
  assert.throws(() => buildPlan(s.profile, dateKey(), {
    days: 3
  }));
  assert.throws(() => buildPlan(s.profile, dateKey(), {
    targetDate: '2026-11-31'
  }));
});
test('calendar rollover and recovery do not claim missed days as completed', () => {
  const s = createProfile({
    name: 'Calendar Student',
    handle: 'calendar-student'
  });
  s.journey = {
    ...buildPlan(s.profile, '2026-10-20', {
      days: 150
    }),
    xp: 0
  };
  s.tasks = [];
  ensureDailyPlan(s, '2026-10-20');
  ensureDailyPlan(s, '2026-10-25');
  assert.equal(s.journey.day, 6);
  assert.ok(!s.tasks.some(t => t.date === '2026-10-25'));
  assert.deepEqual(s.journey.completedDays, []);
  ensureDailyPlan(s, '2026-10-26');
  assert.equal(s.journey.day, 7);
  assert.deepEqual(s.journey.completedDays, []);
  ensureDailyPlan(s, '2027-04-01');
  assert.ok(!s.tasks.some(t => t.date === '2027-04-01'));
});
test('replanning preserves earned records, completed material becomes review, and lab rewards are idempotent', () => {
  const s = createProfile({
    name: 'Working Student',
    handle: 'working-student'
  });
  s.profile.year = 4;
  s.journey.xp = 900;
  s.skills.Databases = 50;
  s.courseProgress.javascript = 18;
  s.courseBaseProgress.javascript = 18;
  applyAction(s, 'plan.configure', {
    days: 150,
    dailyMinutes: 75,
    weeklyDays: 6
  });
  assert.equal(s.journey.totalDays, 150);
  assert.equal(s.journey.xp, 900);
  assert.equal(s.skills.Databases, 50);
  assert.ok(s.tasks.some(t => t.kind === 'review'));
  const result = applyAction(s, 'assessment.start', {
    id: 'net-revenue',
    mode: 'practice'
  });
  s.tasks = [{
    id: 'a',
    kind: 'assessment',
    resourceId: 'net-revenue',
    category: 'Databases',
    date: dateKey(),
    status: 'pending'
  }];
  assert.throws(() => applyAction(s, 'task.complete', {
    id: 'a'
  }), /linked activity/);
  recordAssessment(s, 'net-revenue', result.session.id, {
    score: 100,
    verification: 'Server SQL checks'
  }, referenceSql['net-revenue']);
  assert.equal(s.tasks[0].status, 'completed');
  const xp = s.journey.xp;
  recordAssessment(s, 'net-revenue', result.session.id, {
    score: 100,
    verification: 'Server SQL checks'
  }, referenceSql['net-revenue']);
  assert.equal(s.journey.xp, xp);
  assert.equal(s.skills.Databases, 52);
  s.assessmentSessions[0].deadline = Date.now() - 1000;
  assert.throws(() => assessmentSession(s, 'net-revenue', result.session.id), /ended/);
});
test('public quiz metadata excludes answer keys and includes DBMS, OS, networks and aptitude', () => {
  for (const id of ['dbms-foundations', 'dbms-transactions', 'os-fundamentals', 'network-http', 'code-output', 'aptitude-placement']) {
    const q = catalog.quizzes.find(q => q.id === id);
    assert.ok(q.questions.length >= 5);
    assert.ok(q.questions.every(q => q.correct === undefined));
  }
});
test('existing daily tasks for already-completed material become actionable reflections', () => {
  const s = createProfile({
    name: 'Advanced Student',
    handle: 'advanced-student'
  });
  s.courseProgress.javascript = 18;
  s.courseBaseProgress.javascript = 18;
  s.tasks = [{
    id: dateKey() + '-mission-1',
    date: dateKey(),
    kind: 'course',
    resourceId: 'javascript',
    lesson: 0,
    title: 'Values',
    status: 'pending',
    minutes: 20,
    category: 'Frontend',
    xp: 30
  }];
  ensureDailyPlan(s);
  assert.equal(s.tasks[0].kind, 'review');
  applyAction(s, 'review.complete', {
    id: s.tasks[0].resourceId,
    explanation: 'A JavaScript binding gives a value a name, and the binding can be read later in its lexical scope.',
    example: 'For example, const total = 12 binds the numeric value 12 to total.',
    risk: 'Check whether a reassignment is valid; a const binding cannot be reassigned.'
  });
  assert.equal(s.tasks[0].status, 'completed');
  const xp = s.journey.xp;
  applyAction(s, 'review.complete', {
    id: s.tasks[0].resourceId,
    explanation: 'A JavaScript binding gives a value a name, and the binding can be read later in its lexical scope.',
    example: 'For example, const total = 12 binds the numeric value 12 to total.',
    risk: 'Check whether a reassignment is valid; a const binding cannot be reassigned.'
  });
  assert.equal(s.journey.xp, xp);
});
test('HTTP SQL submissions persist server-checked progress and enforce the attempt owner and staff role', async () => {
  const child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: '5096',
      STUDENTOS_TEST_DB: 'memory'
    },
    stdio: 'pipe'
  });
  try {
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch('http://127.0.0.1:5096/api/health')).ok) break;
      } catch {}
      await new Promise(r => setTimeout(r, 50));
    }
    const call = async (path, payload, cookie) => {
      const r = await fetch('http://127.0.0.1:5096/api/' + path, {
        method: payload ? 'POST' : 'GET',
        headers: {
          ...(payload ? {
            'Content-Type': 'application/json'
          } : {}),
          ...(cookie ? {
            Cookie: cookie
          } : {})
        },
        ...(payload ? {
          body: JSON.stringify(payload)
        } : {})
      });
      return {
        status: r.status,
        data: await r.json(),
        cookie: r.headers.get('set-cookie')?.split(';')[0]
      };
    };
    const registered = await call('session', {
      mode: 'register',
      name: 'Final Year Joiner',
      handle: 'final-year-joiner',
      password: 'practice-password',
      year: 4
    });
    assert.equal(registered.data.journey.totalDays, 150);
    const a = await call('session', {
        mode: 'new',
        name: 'Lab Student',
        handle: 'lab-student'
      }),
      b = await call('session', {
        mode: 'new',
        name: 'Other Student',
        handle: 'other-student'
      }),
      start = await call('action', {
        type: 'assessment.start',
        payload: {
          id: 'unpaid-orders',
          mode: 'timed'
        }
      }, a.cookie),
      sessionId = start.data.result.session.id;
    const payload = {
      id: 'unpaid-orders',
      sessionId,
      code: referenceSql['unpaid-orders'],
      submit: true,
      explanation: 'I used NOT EXISTS to exclude orders with any captured payment, while keeping orders without payments.'
    };
    assert.equal((await call('labs/sql', payload, b.cookie)).status, 400);
    const grade = await call('labs/sql', payload, a.cookie);
    assert.equal(grade.status, 200, JSON.stringify(grade.data));
    assert.equal(grade.data.score, 100);
    const saved = await call('state', null, a.cookie);
    assert.equal(saved.data.assessmentAttempts[0].verification, 'Server SQL checks');
    assert.equal(saved.data.skills.Databases, 2);
    const staff = await call('session', {
      mode: 'staff',
      role: 'teacher'
    });
    assert.equal((await call('labs/sql', payload, staff.cookie)).status, 403);
  } finally {
    child.kill('SIGTERM');
  }
});
