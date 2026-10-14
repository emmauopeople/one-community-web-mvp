import assert from 'node:assert/strict';
const base='https://servicecam.org';
const get=path=>fetch(base+path,{signal:AbortSignal.timeout(15000)});
const home=await get('/');assert.equal(home.status,200,'Public website');
const search=await get('/api/skills/search?q=plumbing');assert.equal(search.status,200,'Public API');
assert(Array.isArray((await search.json()).results),'Expected search JSON');
for(const path of ['/api/admin/providers','/api/metrics','/api/health/db']) {
 const result=await get(path);assert.equal(result.status,404,`${path} must not be published`);
}
const profile=await get('/api/provider/profile');assert.equal(profile.status,401,'Anonymous provider access');
console.log('PASS public HTTPS website/search, private route exclusion and anonymous provider denial.');
console.log('Next: test provider login and GPS from a phone using mobile data.');
