import { randomUUID } from 'node:crypto';
import { problems } from '../shared/catalog.js';
import { canonical } from '../shared/assessments.js';
import { addEvidence } from './evidence.mjs';
const extra = {
  'two-sum': [{
    args: [[1, 8, 4, 6], 10],
    expected: [2, 3]
  }, {
    args: [[-3, 4, 3, 90], 0],
    expected: [0, 2]
  }],
  'valid-parentheses': [{
    args: [''],
    expected: true
  }, {
    args: ['((('],
    expected: false
  }, {
    args: ['{}[]()'],
    expected: true
  }],
  'max-profit': [{
    args: [[1]],
    expected: 0
  }, {
    args: [[2, 1, 4]],
    expected: 3
  }],
  'product-array': [{
    args: [[0, 2, 0]],
    expected: [0, 0, 0]
  }, {
    args: [[2, 3]],
    expected: [3, 2]
  }],
  'longest-substring': [{
    args: [''],
    expected: 0
  }, {
    args: ['dvdf'],
    expected: 3
  }, {
    args: ['abba'],
    expected: 2
  }],
  'climbing-stairs': [{
    args: [1],
    expected: 1
  }, {
    args: [10],
    expected: 89
  }]
};
export const judgeLanguages = ['javascript', 'python', 'java', 'cpp'];
export function createJudge({
  db,
  read,
  save,
  broadcast = () => {},
  fetcher = fetch,
  env = process.env
}) {
  db.exec('CREATE TABLE IF NOT EXISTS judge_runs(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL,resource_id TEXT NOT NULL,document TEXT NOT NULL,created_at TEXT NOT NULL); CREATE INDEX IF NOT EXISTS judge_runs_owner ON judge_runs(profile_id,created_at);');
  const locks = new Set(),
    configured = () => Boolean(env.JUDGE_URL && env.JUDGE_TOKEN);
  function status() {
    return {
      configured: configured(),
      languages: judgeLanguages,
      bank: problems.map(p => ({
        id: p.id,
        title: p.title,
        functionName: p.functionName,
        description: p.description,
        tests: p.tests.slice(0, 2)
      }))
    };
  }
  function draft(id, p) {
    const s = read(id);
    validate(s, p);
    s.judgeDrafts ||= {};
    s.judgeDrafts[p.id + ':' + p.language] = {
      code: p.code,
      time: new Date().toISOString()
    };
    s.version++;
    save(s);
    return {
      saved: true
    };
  }
  function validate(s, p) {
    if (s.profile.role !== 'student') throw new Error('Use a student account for coding practice.');
    if (!problems.some(q => q.id === p.id) || !judgeLanguages.includes(p.language) || typeof p.code !== 'string' || !p.code.trim() || p.code.length > 32000) throw new Error('Choose a supported problem, language and a solution under 32,000 characters.');
  }
  async function run(id, p) {
    if (!configured()) throw new Error('The trusted code runner is not connected. Browser JavaScript practice remains available.');
    if (locks.has(id)) throw new Error('Your previous run is still executing.');
    const s = read(id);
    validate(s, p);
    draft(id, p);
    const url = new URL(env.JUDGE_URL);
    if (url.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('The judge must use HTTPS outside loopback.');
    const problem = problems.find(q => q.id === p.id),
      tests = [...problem.tests, ...extra[p.id]];
    locks.add(id);
    try {
      const response = await fetcher(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + env.JUDGE_TOKEN
        },
        body: JSON.stringify({
          version: 1,
          language: p.language,
          source: p.code,
          functionName: problem.functionName,
          tests: tests.map(t => ({
            args: t.args
          })),
          limits: {
            cpuMs: 2000,
            memoryMb: 128,
            outputBytes: 16384,
            network: false,
            filesystem: 'ephemeral'
          }
        }),
        signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) throw new Error('Code runner unavailable (' + response.status + '). Your solution remains saved.');
      const raw = await response.text();
      if (raw.length > 100000) throw new Error('Code runner output exceeded the limit.');
      const data = JSON.parse(raw);
      if (!Array.isArray(data.results) || data.results.length !== tests.length) throw new Error('Code runner returned an incomplete result.');
      const checks = tests.map((t, i) => {
        const actual = p.id === 'two-sum' && Array.isArray(data.results[i].actual) ? data.results[i].actual.toSorted((a, b) => a - b) : data.results[i].actual;
        return {
          name: i < problem.tests.length ? 'Example ' + (i + 1) : 'Additional case ' + (i - problem.tests.length + 1),
          passed: !data.results[i].error && JSON.stringify(canonical(actual)) === JSON.stringify(canonical(t.expected)),
          error: String(data.results[i].error || '').slice(0, 500)
        };
      });
      const result = {
        id: randomUUID(),
        resourceId: p.id,
        language: p.language,
        score: Math.round(checks.filter(c => c.passed).length / checks.length * 100),
        checks,
        time: new Date().toISOString(),
        durationMs: Number.isFinite(data.durationMs) ? data.durationMs : null,
        memoryKb: Number.isFinite(data.memoryKb) ? data.memoryKb : null,
        verification: 'server-runner'
      };
      const fresh = read(id);
      fresh.judgeRuns ||= [];
      fresh.judgeRuns.push(result);
      fresh.judgeRuns = fresh.judgeRuns.slice(-200);
      if (result.score === 100 && addEvidence(fresh, {
        key: 'judge:' + p.id,
        kind: 'assessment',
        resourceId: 'judge:' + p.id,
        skill: 'DSA',
        score: 100,
        verification: 'server-checked',
        xp: 80
      })) {
        fresh.journey.xp += 80;
        const date = new Date().toLocaleDateString('en-CA', {
          timeZone: 'Asia/Kolkata'
        });
        const activity = fresh.activity.find(a => a.date === date);
        if (activity) activity.count++;else fresh.activity.push({
          date,
          count: 1
        });
        if (!fresh.solved.includes(p.id)) fresh.solved.push(p.id);
        for (const task of fresh.tasks) if (task.kind === 'coding' && task.resourceId === p.id && task.date === date) task.status = 'completed';
      }
      fresh.version++;
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare('INSERT INTO judge_runs VALUES(?,?,?,?,?)').run(result.id, id, p.id, JSON.stringify(result), result.time);
        save(fresh);
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
      broadcast(id);
      return result;
    } finally {
      locks.delete(id);
    }
  }
  return {
    status,
    draft,
    run
  };
}
