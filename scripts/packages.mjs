import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const mode = process.argv[2];
const actions = {
  install: ['services/skill-visibility', 'apps/admin-api', 'apps/public-web', 'apps/admin-web'].map(p => [p, ['ci', '--no-audit', '--no-fund']]),
  test: [['services/skill-visibility', ['test', '--', '--runInBand']], ['apps/admin-api', ['test']], ['apps/admin-web', ['test']]],
  build: [['apps/public-web', ['run', 'build']], ['apps/admin-web', ['run', 'build']]],
};
if (!actions[mode]) throw new Error('Expected install, test or build');
if (!process.env.npm_execpath) throw new Error('Run through npm run');
for (const [directory, args] of actions[mode]) {
  const result = spawnSync(process.execPath, [process.env.npm_execpath, '--prefix', directory, ...args], { cwd: root, stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
