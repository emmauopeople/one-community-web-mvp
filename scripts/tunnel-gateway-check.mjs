// Runs inside the existing skill-api container; no tunnel token or public DNS needed.
import {execFileSync} from 'node:child_process';
const source=`
 const base='http://tunnel-gateway:8080';
 const get=path=>fetch(base+path,{headers:{Host:'servicecam.org','CF-Connecting-IP':'203.0.113.10'}});
 for (const path of ['/','/api/skills/search?q=plumbing']) {
   const r=await get(path);if(r.status!==200)throw Error(path+': '+r.status);
   if(path.includes('search')&&!Array.isArray((await r.json()).results))throw Error('Search JSON missing');
 }
 for(const path of ['/api/admin/providers','/api/metrics','/api/health/db']) {
   const r=await get(path);if(r.status!==404)throw Error('Private path exposed: '+path);
 }
 const wrong=await fetch(base,{headers:{Host:'other.example'}});if(wrong.status!==404)throw Error('Unknown host accepted');
 const redirect=await fetch(base,{headers:{Host:'servicecam.org','X-Forwarded-Proto':'http'},redirect:'manual'});
 if(redirect.status!==308||redirect.headers.get('location')!=='https://servicecam.org/')throw Error('HTTP must redirect to HTTPS');
 console.log('PASS tunnel gateway website/API routing, private paths and unknown host rejection');
`;
execFileSync('docker',['compose','exec','-T','skill-api','node','--input-type=module','-e',source],{stdio:'inherit'});
