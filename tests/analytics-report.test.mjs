import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks,createRequire} from 'node:module';
import {PGlite} from '@electric-sql/pglite';
import {reportDays} from '../apps/admin-api/src/services/analyticsReport.js';
const require=createRequire(new URL('../services/skill-visibility/package.json',import.meta.url));
const express=require('express'),request=require('supertest');
const target=new URL('../apps/admin-api/src/db/pool.js',import.meta.url).href;
registerHooks({load(url,ctx,next){return url===target?{format:'module',shortCircuit:true,source:'export default {query:(...args)=>globalThis.analyticsDb.query(...args)}'}:next(url,ctx);}});
test('analytics report reconciles channels, daily totals, boundaries and authorization',async t=>{
 const db=new PGlite();await db.waitReady;t.after(()=>db.close());globalThis.analyticsDb=db;
 await db.exec(`CREATE TABLE skills(id int,title text,city text,category text);
 CREATE TABLE events(id serial,event_type text,skill_id int,city text,category text,channel text,result_count int,occurred_at timestamptz default now());
 INSERT INTO skills VALUES(1,'Plumbing','Douala','plumbing');
 INSERT INTO events(event_type,skill_id,city,category,channel,result_count) VALUES
 ('search',null,'Douala','plumbing',null,0),('search',null,'Douala','plumbing',null,3),
 ('skill_view',1,null,null,null,null),('contact_click_whatsapp',1,null,null,'whatsapp',null),
 ('contact_click_email',1,null,null,'email',null),('contact_click',1,null,null,'call',null);
 INSERT INTO events(event_type,occurred_at) VALUES
 ('search',((now() AT TIME ZONE 'Africa/Douala')::date-6)::timestamp AT TIME ZONE 'Africa/Douala'),
 ('search',(((now() AT TIME ZONE 'Africa/Douala')::date-6)::timestamp AT TIME ZONE 'Africa/Douala')-interval '1 second'),
 ('search',now()+interval '1 day');`);
 const app=express();app.use((req,res,next)=>{if(req.headers['x-admin'])req.session={admin:{id:1}};next();});
 app.use('/api/admin',(await import('../apps/admin-api/src/routes/analyticsRoutes.js')).default);
 await request(app).get('/api/admin/analytics/report').expect(401);
 for(const days of ['0','91','7.5','abc'])await request(app).get('/api/admin/analytics/report?days='+days).set('x-admin','1').expect(400);
 const {body:r}=await request(app).get('/api/admin/analytics/report?days=7').set('x-admin','1').expect(200).expect('Cache-Control','no-store');
 assert.equal(r.summary.searches,3);assert.equal(r.summary.skill_views,1);assert.equal(r.summary.contact_clicks,3);
 assert.equal(r.summary.whatsapp_clicks,1);assert.equal(r.summary.email_clicks,1);assert.equal(r.summary.no_result_searches,1);
 assert.equal(r.summary.search_to_view_rate,33.3);assert.equal(r.summary.view_to_contact_rate,300);
 assert.equal(r.daily_activity.length,7);assert.equal(r.daily_activity.reduce((sum,x)=>sum+x.searches,0),3);
 assert.equal(r.daily_activity.reduce((sum,x)=>sum+x.contact_clicks,0),3);
 assert.equal(r.contact_channels.reduce((sum,x)=>sum+x.clicks,0),3);assert.equal(r.top_contacted_skills[0].contacts,3);
 assert.equal(r.range.timezone,'Africa/Douala');assert(r.daily_activity.some(x=>x.searches===0&&x.skill_views===0));
 await db.exec('TRUNCATE events');
 const empty=(await request(app).get('/api/admin/analytics/report?days=90').set('x-admin','1').expect(200)).body;
 assert.equal(empty.daily_activity.length,90);assert.equal(empty.summary.search_to_view_rate,0);assert.deepEqual(empty.top_cities,[]);
 assert.equal(reportDays(undefined),7);
});
