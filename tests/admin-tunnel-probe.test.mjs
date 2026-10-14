import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { checkAdminGateway } from '../scripts/admin-tunnel-check.mjs';

test('probe sends admin and unknown Host headers over HTTP and checks every protected route', async () => {
  const seen = [];
  const server = http.createServer((req, res) => {
    seen.push([req.headers.host, req.url]);
    let status;
    if (req.headers.host !== 'admin.servicecam.org') status = 404;
    else if (req.headers['x-forwarded-proto'] === 'http') { status = 308; res.setHeader('Location', 'https://admin.servicecam.org/'); }
    else if (req.url === '/') status = 200;
    else if (['/api/admin/providers','/api/admin/feedback','/api/admin/auth/me'].includes(req.url)) status = 401;
    else status = 404;
    res.writeHead(status).end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await checkAdminGateway({hostname:'127.0.0.1', port:server.address().port});
    assert.equal(seen.length,10);
    assert.deepEqual(seen[0],['admin.servicecam.org','/']);
    assert.deepEqual(seen[1],['other.example','/']);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test('failed readiness reports the actual HTTP status', async () => {
  const server=http.createServer((req,res)=>res.writeHead(404).end());
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try { await assert.rejects(checkAdminGateway({hostname:'127.0.0.1',port:server.address().port,readyMs:0}),/expected.*200.*HTTP 404/i); }
  finally { await new Promise(resolve=>server.close(resolve)); }
});
