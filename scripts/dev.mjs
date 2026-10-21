import { spawn } from 'node:child_process';
const processes = [spawn(process.execPath, ['--watch', 'server/index.mjs'], {
  stdio: 'inherit'
}), spawn(process.execPath, ['node_modules/vite/bin/vite.js'], {
  stdio: 'inherit'
})];
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of processes) child.kill();
  process.exit(code);
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
for (const child of processes) child.on('exit', code => {
  if (!closing) stop(code || 0);
});
