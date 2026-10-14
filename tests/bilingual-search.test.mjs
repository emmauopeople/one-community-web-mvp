import test from 'node:test';
import assert from 'node:assert/strict';
import {discoveryQuery} from '../services/skill-visibility/src/services/discoveryQuery.js';
test('French and English service words expand to the same parameterized search terms',()=>{
 for(const [en,fr]of [['plumber','plombier'],['carpenter','menuisier'],['mechanic','mécanicien'],['tailor','couturière'],['cleaning','nettoyage']]){
  const a=discoveryQuery({q:en}),b=discoveryQuery({q:fr});assert.equal(a.sql,b.sql);assert.deepEqual(a.params,b.params);
 }
});
