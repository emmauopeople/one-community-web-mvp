import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import YAML from 'yaml';
import {adminSessionCookie} from '../apps/admin-api/src/sessionCookie.js';
const require=createRequire(new URL('../apps/admin-api/package.json',import.meta.url));
const express=require('express'),session=require('express-session');
const request=createRequire(new URL('../services/skill-visibility/package.json',import.meta.url))('supertest');
test('admin sessions work on local HTTP and issue secure cookies behind the HTTPS gateway',async()=>{
 const app=express();app.set('trust proxy',1);
 app.use(session({secret:'test-only-session-secret-for-admin',resave:false,saveUninitialized:false,cookie:adminSessionCookie()}));
 app.get('/login',(req,res)=>{req.session.admin={id:1};res.sendStatus(200);});
 app.get('/me',(req,res)=>res.status(req.session.admin?200:401).json(req.session.admin||{}));
 for(const protocol of ['http','https']){
  const login=await request(app).get('/login').set('X-Forwarded-Proto',protocol).expect(200);
  const cookies=login.headers['set-cookie'];assert.equal(cookies.length,1);
  assert.match(cookies[0],/HttpOnly/);assert.match(cookies[0],/SameSite=Lax/);
  assert.equal(/; Secure/.test(cookies[0]),protocol==='https');
  await request(app).get('/me').set('X-Forwarded-Proto',protocol).set('Cookie',cookies[0].split(';')[0]).expect(200);
 }
 await request(app).get('/me').expect(401);
});
test('optional admin gateway has no host ports and preserves the public tunnel exclusion',async()=>{
 const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
 const cfg=YAML.parse(await read('compose.admin-tunnel.yaml'));
 const service=cfg.services['admin-tunnel-gateway'];assert.equal(service.ports,undefined);
 assert.deepEqual(service.networks,['internal','tunnel']);
 const gateway=await read('infra/admin-tunnel-gateway.conf');
 assert.match(gateway,/server_name admin\.servicecam\.org;/);
 assert.doesNotMatch(gateway,/http_cf_access_jwt_assertion/);
 assert.match(gateway,/limit_req_status 429/);assert.match(gateway,/server admin-api:5000 resolve/);
 assert.match(gateway,/X-Forwarded-Proto https/);
 assert.match(await read('infra/tunnel-gateway.conf'),/admin\|metrics\|health/);
});
