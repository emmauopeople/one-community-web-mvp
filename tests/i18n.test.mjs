import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base=new URL('../apps/public-web/src/i18n/',import.meta.url);
test('English/French catalogs are complete and consistent across web/admin',async()=>{
 const en=JSON.parse(await readFile(new URL('en.json',base),'utf8')),fr=JSON.parse(await readFile(new URL('fr.json',base),'utf8'));
 assert.deepEqual(Object.keys(en).sort(),Object.keys(fr).sort());
 for(const key of Object.keys(en)){assert(fr[key]);assert.deepEqual((en[key].match(/\{\w+\}/g)||[]).sort(),(fr[key].match(/\{\w+\}/g)||[]).sort(),key);}
 const admin=JSON.parse(await readFile(new URL('../apps/admin-web/src/i18n/fr.json',import.meta.url),'utf8'));assert.deepEqual(admin,fr);
});
test('locale store persists choice, ignores invalid codes and preserves interpolated user content',async()=>{
 const en=JSON.parse(await readFile(new URL('en.json',base),'utf8')),fr=JSON.parse(await readFile(new URL('fr.json',base),'utf8'));
 let resolveRead;const saved=[];globalThis.__localeStorage={read:()=>new Promise(r=>resolveRead=r),write:async v=>saved.push(v)};
 let source=await readFile(new URL('store.js',base),'utf8');source=source.replace(/import en from .*?;/,'const en='+JSON.stringify(en)+';').replace(/import fr from .*?;/,'const fr='+JSON.stringify(fr)+';').replace(/import storage from .*?;/,'const storage=globalThis.__localeStorage;');
 const store=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const loading=store.initializeLanguage();store.setLanguage('fr');resolveRead('en');await loading;
 assert.equal(store.getLanguage(),'fr');assert.equal(store.t('Search'),'Rechercher');store.setLanguage('invalid');assert.equal(store.getLanguage(),'fr');
 assert.equal(store.t('Hello, I found your service on One Community: {title}',{title:'Search'}),'Bonjour, j’ai trouvé votre service sur One Community : Search');
 assert.equal(store.t('Untranslated provider content'),'Untranslated provider content');store.setLanguage('en');assert.equal(store.t('Search'),'Search');await new Promise(r=>setTimeout(r,0));assert.deepEqual(saved,['fr','en']);delete globalThis.__localeStorage;
});
