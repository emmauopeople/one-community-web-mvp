import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createRequire, registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { loadMigrations, applyMigrations } from '../scripts/migration-core.mjs';
import { optimizeImage, IMAGE_LIMITS } from '../services/skill-visibility/src/services/imageOptimization.js';
const require = createRequire(new URL('../services/skill-visibility/package.json',import.meta.url));
const sharp = require('sharp'), express = require('express'), request = require('supertest');

test('optimization bounds noisy photos and strips metadata without upscaling', async () => {
  const original = await sharp(randomBytes(1600*1200*3),{raw:{width:1600,height:1200,channels:3}})
    .jpeg({quality:90}).withMetadata({orientation:6}).toBuffer();
  const result = await optimizeImage(original);
  for (const [kind,variant] of Object.entries(result)) {
    const meta = await sharp(variant.buffer).metadata();
    assert.equal(meta.format,'webp');
    assert(variant.buffer.length <= IMAGE_LIMITS[kind]);
    assert(Math.max(meta.width,meta.height) <= (kind==='detail'?1280:400));
    assert(meta.height > meta.width, 'EXIF rotation applied before removing metadata');
    assert.equal(meta.exif,undefined); assert.equal(meta.orientation,undefined);
  }
  const small = await sharp({create:{width:60,height:30,channels:4,background:'#00000000'}}).png().toBuffer();
  const tiny = await optimizeImage(small);
  assert.equal(tiny.detail.width,60); assert.equal(tiny.thumbnail.width,60);
  assert((await sharp(tiny.detail.buffer).metadata()).hasAlpha);
});

test('invalid, disguised and oversized decoded images are rejected', async () => {
  await assert.rejects(optimizeImage(Buffer.from('not a jpeg')));
  await assert.rejects(optimizeImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>')));
  const large = await sharp({create:{width:6400,height:6400,channels:3,background:'white'}}).png().toBuffer();
  await assert.rejects(optimizeImage(large));
});

test('real upload routes preserve ownership and atomically store thumbnail references', async t => {
  const db = new PGlite({extensions:{citext}}); t.after(()=>db.close());
  await applyMigrations({query:async(sql,params)=>params?db.query(sql,params):(await db.exec(sql)).at(-1)},await loadMigrations(fileURLToPath(new URL('../database/migrations/',import.meta.url))));
  await db.query("INSERT INTO users(id,email,phone,password_hash,role,gps_consent_at,gps_consent_version) VALUES(1,'p@example.test','1','x','provider',now(),'provider-gps-v1.2'),(2,'q@example.test','2','x','provider',now(),'provider-gps-v1.2')");
  await db.query("INSERT INTO skills(id,provider_id,title,category,description,country,city,lat,lng) VALUES(1,1,'Plumber','plumbing','Service','Cameroon','Douala',4,9)");
  const objects = new Map(); let failWrite = false;
  globalThis.__imageQuery=(...args)=>db.query(...args);
  globalThis.__imagePut=async ({key,buffer})=>{if(failWrite && key.includes('.thumb.'))throw Error('storage unavailable');objects.set(key,buffer);};
  globalThis.__imageDelete=async ({key})=>objects.delete(key);
  const dbUrl=new URL('../services/skill-visibility/db.js',import.meta.url).href;
  const s3Url=new URL('../services/skill-visibility/src/services/s3.js',import.meta.url).href;
  const hooks=registerHooks({load(url,context,next){
    if(url===dbUrl)return {format:'module',shortCircuit:true,source:'export const query=(...a)=>globalThis.__imageQuery(...a);'};
    if(url===s3Url)return {format:'module',shortCircuit:true,source:'export const uploadBufferToS3=(v)=>globalThis.__imagePut(v); export const deleteStorageObject=(v)=>globalThis.__imageDelete(v); export const presignGet=async({key})=>"https://image.test/"+key;'};
    return next(url,context);
  }}); t.after(()=>hooks.deregister());
  process.env.S3_BUCKET='test-bucket';
  const app=express();app.use(express.json());app.use((req,_res,next)=>{if(req.headers['x-provider'])req.session={user:{id:Number(req.headers['x-provider']),role:'provider'}};next();});
  for(const name of ['media','smartSearch','skills'])app.use((await import(`../services/skill-visibility/src/routes/${name}.js`)).default);
  const photo=await sharp({create:{width:900,height:600,channels:3,background:'orange'}}).jpeg().toBuffer();
  const upload=(id=1,data=photo)=>request(app).post('/media/skills/1/upload-direct').set('x-provider',String(id)).field('sortOrders','[0]').attach('images',data,{filename:'photo.jpg',contentType:'image/jpeg'});
  assert.equal((await request(app).post('/media/skills/1/upload-direct')).status,401);
  assert.equal((await upload(2)).status,404); assert.equal(objects.size,0);
  assert.equal((await upload(1,Buffer.from('bad image'))).status,400);assert.equal(objects.size,0);
  assert.equal((await request(app).post('/media/skills/1/confirm').set('x-provider','1').send({})).status,410);
  const invalidBatch=await request(app).post('/media/skills/1/upload-direct').set('x-provider','1').field('sortOrders','[0,1]').attach('images',photo,'one.jpg').attach('images',Buffer.from('bad image'),'two.jpg');
  assert.equal(invalidBatch.status,400);assert.equal(objects.size,0);
  assert.equal((await upload()).status,200);assert.equal(objects.size,2);
  const row=(await db.query('SELECT * FROM skill_media')).rows[0];
  assert(row.thumbnail_s3_key.endsWith('.thumb.webp'));assert(row.s3_key.endsWith('.webp'));
  assert(Number(row.size_bytes)<=IMAGE_LIMITS.detail);assert(Number(row.thumbnail_size_bytes)<=IMAGE_LIMITS.thumbnail);
  const search=await request(app).get('/skills/search');assert.equal(search.status,200);assert(search.body.results[0].indexImageUrl.endsWith('.thumb.webp'));
  const detail=await request(app).get('/skills/1');assert.equal(detail.status,200);assert(detail.body.media[0].thumbnailUrl.endsWith('.thumb.webp'));assert(!detail.body.media[0].url.endsWith('.thumb.webp'));
  failWrite=true;assert.equal((await upload()).status,500);assert.equal(objects.size,2);
  assert.equal((await db.query('SELECT s3_key FROM skill_media')).rows[0].s3_key,row.s3_key);
  failWrite=false;assert.equal((await upload()).status,200);
  assert.notEqual((await db.query('SELECT s3_key FROM skill_media')).rows[0].s3_key,row.s3_key);
  // Legacy image rows continue to appear until they are re-uploaded.
  await db.query('UPDATE skill_media SET thumbnail_s3_key=NULL');
  assert(!(await request(app).get('/skills/search')).body.results[0].indexImageUrl.endsWith('.thumb.webp'));
});

