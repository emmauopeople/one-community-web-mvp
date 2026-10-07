// CI-only network disruption regression; never run against the user's PC stack.
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
if(process.env.CI!=='true')throw Error('This test is for disposable CI stacks only.');
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8'}).trim();
const compose=['compose','-f','compose.yaml','-f','compose.tunnel.yaml'];
const inspect=id=>JSON.parse(docker('inspect',id))[0];
const gateway=docker(...compose,'ps','-q','tunnel-gateway');
const started=inspect(gateway).State.StartedAt;
for(const service of ['skill-api','public-web']) {
 const id=docker(...compose,'ps','-q',service),container=inspect(id);
 const network=Object.keys(container.NetworkSettings.Networks).find(n=>n.endsWith('_internal'));
 assert(network,'Internal network must exist');
 const old=container.NetworkSettings.Networks[network].IPAddress;
 const holder='tunnel-dns-holder-'+service;
 try {
   docker('rm','-f',id);
   // Occupy the old address so the replacement MUST allocate a different one.
   docker('run','-d','--name',holder,'--network',network,'--ip',old,'--entrypoint','/bin/sh',inspect(gateway).Config.Image,'-c','sleep 180');
   docker(...compose,'up','-d','--no-deps','--wait',service);
   const replacement=docker(...compose,'ps','-q',service);
   assert.notEqual(inspect(replacement).NetworkSettings.Networks[network].IPAddress,old);
   execFileSync(process.execPath,['scripts/tunnel-gateway-check.mjs'],{stdio:'inherit'});
   assert.equal(inspect(gateway).State.StartedAt,started,'Gateway must recover without a restart');
   console.log('PASS gateway recovered after '+service+' changed address');
 } finally {
   try{docker('rm','-f',holder);}catch{}
 }
}
