import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import YAML from 'yaml';
import {sessionMiddleware} from '../services/skill-visibility/src/middleware/session.js';
const require=createRequire(new URL('../services/skill-visibility/package.json',import.meta.url));
const express=require('express'),request=require('supertest');
test('tunnel isolates connector, publishes no ports and excludes local secrets from builds',async()=>{
 const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
 const overlay=YAML.parse(await read('compose.tunnel.yaml'));
 assert.deepEqual(overlay.services.cloudflared.networks,['tunnel']);
 for(const service of Object.values(overlay.services))assert.equal(service.ports,undefined);
 assert.equal(overlay.services['skill-api'].environment.COOKIE_SECURE,'true');
 assert.equal(overlay.secrets.tunnel_token.file,'./.env.tunnel-token');
 assert((await read('.dockerignore')).includes('.env.*'));
 assert((await read('.gitignore')).includes('.env.*'));
 const gateway=await read('infra/tunnel-gateway.conf');
 assert.match(gateway,/server_name servicecam\.org/);
 assert.match(gateway,/proxy_set_header X-Forwarded-Proto https/);
 assert.match(gateway,/proxy_set_header X-Forwarded-For \$remote_addr/);
 assert.match(gateway,/admin\|metrics\|health/);
 assert.match(gateway,/resolver 127\.0\.0\.11 valid=5s ipv6=off;/);
 assert.match(gateway,/server skill-api:3000 resolve;/);
 assert.match(gateway,/server public-web:80 resolve;/);
 assert.match(gateway,/zone skill_api_backend 64k;/);
 assert.match(gateway,/zone public_web_backend 64k;/);
});
test('secure provider cookies are issued behind HTTPS proxy and round trip with SameSite Lax',async()=>{
 const previous={COOKIE_SECURE:process.env.COOKIE_SECURE,SESSION_SECRET:process.env.SESSION_SECRET};
 process.env.COOKIE_SECURE='true';process.env.SESSION_SECRET='fixture-only-not-a-production-secret';
 try {
  const app=express();app.set('trust proxy',1);app.use(sessionMiddleware());
  app.get('/set',(req,res)=>{req.session.user={id:1};res.json({secure:req.secure,ip:req.ip});});
  app.get('/read',(req,res)=>res.json({user:req.session.user}));
  const r=await request(app).get('/set').set('X-Forwarded-Proto','https').set('X-Forwarded-For','203.0.113.10').expect(200);
  assert.equal(r.body.secure,true);assert.equal(r.body.ip,'203.0.113.10');
  assert(r.headers['set-cookie'].every(c=>/secure/i.test(c)&&/httponly/i.test(c)&&/samesite=lax/i.test(c)));
  const cookies=r.headers['set-cookie'].map(c=>c.split(';')[0]).join('; ');
  const read=await request(app).get('/read').set('Cookie',cookies).set('X-Forwarded-Proto','https');assert.equal(read.body.user.id,1);
 } finally {for(const [key,value] of Object.entries(previous))if(value===undefined)delete process.env[key];else process.env[key]=value;}
});
