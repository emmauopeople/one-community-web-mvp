// Runs inside the existing skill-api container; no tunnel token or public DNS needed.
import {execFileSync} from 'node:child_process';
const source=`
 import http from 'node:http';
 const get=(path,headers={})=>new Promise((resolve,reject)=>{
   const req=http.get({hostname:'tunnel-gateway',port:8080,path,headers:{Host:'servicecam.org','CF-Connecting-IP':'203.0.113.10',...headers}},res=>{
     let body='';res.setEncoding('utf8');res.on('data',chunk=>body+=chunk);
     res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,json:()=>JSON.parse(body)}));
     res.on('error',reject);
   });req.on('error',reject);req.setTimeout(15000,()=>req.destroy(new Error('Gateway timeout')));
 });
 for (const path of ['/','/api/skills/search?q=plumbing']) {
   const r=await get(path);if(r.status!==200)throw Error(path+': '+r.status);
   if(path.includes('search')&&!Array.isArray((await r.json()).results))throw Error('Search JSON missing');
 }
 for(const path of ['/api/admin/providers','/api/metrics','/api/health/db']) {
   const r=await get(path);if(r.status!==404)throw Error('Private path exposed: '+path);
 }
 const wrong=await get('/',{Host:'other.example'});if(wrong.status!==404)throw Error('Unknown host accepted');
 const redirect=await get('/',{'X-Forwarded-Proto':'http'});
 if(redirect.status!==308||redirect.headers.location!=='https://servicecam.org/')throw Error('HTTP must redirect to HTTPS');
 console.log('PASS tunnel gateway website/API routing, private paths and unknown host rejection');
`;
execFileSync('docker',['compose','exec','-T','skill-api','node','--input-type=module','-e',source],{stdio:'inherit'});
