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
 // A new container or refreshed Docker DNS entry may need a few seconds.
 const deadline=Date.now()+30000;
 for (;;) {
   try {
     const home=await get('/'),api=await get('/api/skills/search?q=plumbing');
     if(home.status===200&&api.status===200)break;
   } catch {}
   if(Date.now()>=deadline)throw Error('Gateway website/API did not become ready within 30 seconds');
   await new Promise(resolve=>setTimeout(resolve,1000));
 }
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
 const feedback=await new Promise((resolve,reject)=>{
   const req=http.request({hostname:'tunnel-gateway',port:8080,path:'/api/feedback',method:'POST',headers:{Host:'servicecam.org','Content-Type':'application/json'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});
   req.on('error',reject);req.setTimeout(15000,()=>req.destroy(new Error('Feedback probe timeout')));req.end('{}');
 });
 if(feedback!==400)throw Error('Feedback route must reject invalid input with 400, received '+feedback);
 console.log('PASS tunnel gateway website/API routing, private paths and unknown host rejection');
`;
execFileSync('docker',['compose','exec','-T','skill-api','node','--input-type=module','-e',source],{stdio:'inherit'});
