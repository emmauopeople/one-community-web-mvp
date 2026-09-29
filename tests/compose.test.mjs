import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import YAML from 'yaml';
const compose = YAML.parse(await readFile(new URL('../compose.yaml', import.meta.url), 'utf8'));
test('foundation exposes only loopback ports and no Docker socket', () => {
  for (const service of Object.values(compose.services)) {
    for (const port of service.ports || []) assert.ok(port.startsWith('127.0.0.1:'), port);
    for (const mount of service.volumes || []) assert.ok(!mount.includes('docker.sock'));
    if (service.image) assert.match(service.image, /@sha256:[a-f0-9]{64}$/);
  }
  assert.equal(compose.services.postgres.ports, undefined);
});
test('APIs wait for migrations and seed is opt-in', () => {
  for (const name of ['skill-api','admin-api']) assert.equal(compose.services[name].depends_on.migrate.condition, 'service_completed_successfully');
  assert.deepEqual(compose.services.seed.profiles, ['tools']);
});
