import assert from 'node:assert/strict';
const endpoints = ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:8080/api/health/db', 'http://localhost:8081/api/admin/health', 'http://localhost:8082/health/db'];
for (const endpoint of endpoints) {
  let ok = false;
  for (let i = 0; i < 30; i++) {
    try { const response = await fetch(endpoint, { signal: AbortSignal.timeout(3000) }); if (response.ok) { ok = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.ok(ok, `Not ready: ${endpoint}`);
  console.log(`PASS ${endpoint}`);
}
const search = await fetch('http://localhost:8080/api/skills/search?q=plumbing');
assert.ok(search.ok);
const results = await search.json();
assert.ok(Array.isArray(results.results));
assert.ok(results.results.some(r => r.title === 'SYNTHETIC Plumbing Demo'), 'Run synthetic seed first');
const denied = await fetch('http://localhost:8081/api/admin/providers');
assert.equal(denied.status, 401, 'Admin provider list must reject anonymous access');
console.log('PASS synthetic search and anonymous admin denial. Browser/device acceptance remains manual.');
