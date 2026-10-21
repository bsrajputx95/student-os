import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assessmentLabs } from '../shared/assessments.js';
let running = 0;
export function runSqlLab(id, query) {
  if (!assessmentLabs.some(l => l.id === id && l.type === 'SQL')) throw new Error('SQL lab not found.');
  if (running >= 4) throw new Error('SQL labs are busy. Try again in a moment.');
  return new Promise((resolve, reject) => {
    running++;
    const child = fork(fileURLToPath(new URL('./sql-runner.mjs', import.meta.url)), [], {
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      execArgv: ['--max-old-space-size=64']
    });
    let settled = false;
    const end = (error, result) => {
      if (settled) return;
      settled = true;
      running--;
      clearTimeout(timer);
      child.kill('SIGKILL');
      if (error) reject(new Error(error));else resolve(result);
    };
    const timer = setTimeout(() => end('The query exceeded the 2-second limit. Simplify the query and check its joins.'), 2000);
    child.on('message', m => {
      if (m?.type === 'studentos-sql-result') end(m.error, m.result);
    });
    child.on('error', e => end(e.message));
    child.on('exit', code => {
      if (!settled) end('The query process stopped before returning a result.');
    });
    child.send({
      id,
      query
    });
  });
}
