import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// Self-contained so this same function can run inside the Docker network.
export async function checkAdminGateway({ hostname = 'admin-tunnel-gateway', port = 8080, readyMs = 30000 } = {}) {
  const http = await import('node:http');
  const get = (path, headers = {}) => new Promise((resolve, reject) => {
    const req = http.get({ hostname, port, path, headers: { Host: 'admin.servicecam.org', ...headers } }, res => {
      res.resume();
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(3000, () => req.destroy(new Error('Gateway request timed out')));
  });
  let last = 'no response';
  const deadline = Date.now() + readyMs;
  for (;;) {
    try {
      const response = await get('/');
      if (response.status === 200) break;
      last = 'HTTP ' + response.status;
    } catch (error) { last = error.code || error.message; }
    if (Date.now() >= deadline) throw new Error('Expected admin login page HTTP 200; received ' + last);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  const expect = async (path, headers, expected) => {
    const response = await get(path, headers);
    if (response.status !== expected) throw new Error(path + ': expected HTTP ' + expected + ', received HTTP ' + response.status);
    return response;
  };
  await expect('/', { Host: 'other.example' }, 404);
  const headers = {};
  await expect('/', headers, 200);
  for (const path of ['/api/admin/providers', '/api/admin/feedback', '/api/admin/auth/me']) await expect(path, headers, 401);
  for (const path of ['/api/admin/health', '/api/skills/search', '/metrics']) await expect(path, headers, 404);
  const redirect = await expect('/', { ...headers, 'X-Forwarded-Proto': 'http' }, 308);
  if (redirect.headers.location !== 'https://admin.servicecam.org/') throw new Error('Incorrect HTTPS redirect');
  console.log('PASS admin gateway routing, HTTPS redirect and anonymous admin API denial. Test admin login through the public hostname next.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  execFileSync('docker', ['compose', 'exec', '-T', 'skill-api', 'node', '--input-type=module', '-e', '(' + checkAdminGateway.toString() + ')()'], { stdio: 'inherit' });
}
