import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import YAML from 'yaml';
import { storageConfig } from '../services/skill-visibility/src/services/storageConfig.js';

test('custom storage validates endpoint and preserves AWS defaults', () => {
  assert.equal(storageConfig({}).region, 'us-east-1');
  assert.equal(storageConfig({AWS_REGION:'eu-west-3'}).region, 'eu-west-3');
  assert.equal(storageConfig({S3_REGION:'EU-WEST-PAR'}).region, 'eu-west-par');
  for (const endpoint of ['http://storage.test', 'https://user:secret@storage.test', 'https://storage.test?secret=x']) {
    assert.throws(() => storageConfig({S3_ENDPOINT:endpoint}));
  }
  assert.throws(() => storageConfig({S3_FORCE_PATH_STYLE:'yes'}));
  assert.equal(storageConfig({S3_FORCE_PATH_STYLE:'true'}).forcePathStyle, true);
});

test('production adapter signs private OVH PUT/GET URLs with the Paris region', async () => {
  Object.assign(process.env, {
    S3_REGION:'eu-west-par', S3_ENDPOINT:'https://s3.eu-west-par.io.cloud.ovh.net/',
    S3_FORCE_PATH_STYLE:'true', AWS_ACCESS_KEY_ID:'test-key', AWS_SECRET_ACCESS_KEY:'test-secret',
  });
  const {presignPut, presignGet} = await import('../services/skill-visibility/src/services/s3.js');
  const input = {bucket:'one-community-storage', key:'skills/7/my image.jpg', expiresIn:900};
  for (const value of [await presignPut({...input,contentType:'image/jpeg'}), await presignGet(input)]) {
    const url = new URL(value);
    assert.equal(url.hostname, 's3.eu-west-par.io.cloud.ovh.net');
    assert.equal(url.pathname, '/one-community-storage/skills/7/my%20image.jpg');
    assert.match(url.searchParams.get('X-Amz-Credential'), /\/eu-west-par\/s3\/aws4_request$/);
    assert.equal(url.searchParams.get('X-Amz-Expires'), '900');
    assert(url.searchParams.get('X-Amz-Signature'));
    assert(!value.includes('test-secret'));
    assert(!url.searchParams.has('x-amz-acl'));
  }
});

test('storage secrets are scoped to the API and excluded from builds', () => {
  const compose = YAML.parse(readFileSync(new URL('../compose.yaml', import.meta.url), 'utf8'));
  assert.deepEqual(compose.services['skill-api'].env_file, [{path:'./.env.storage',required:false}]);
  for (const name of ['public-web','admin-web','admin-api']) assert.equal(compose.services[name].env_file, undefined);
  const ignore = readFileSync(new URL('../.dockerignore', import.meta.url),'utf8');
  assert(ignore.split(/\r?\n/).includes('.env.*'));
});
