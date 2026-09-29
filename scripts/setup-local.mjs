import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const random = () => randomBytes(32).toString('hex');
const text = `# Generated LOCAL-ONLY settings. Never commit or use on OVH.
COMPOSE_PROJECT_NAME=onecommunity_mvp
POSTGRES_DB=onecommunity_local
POSTGRES_USER=onecommunity
POSTGRES_PASSWORD=${random()}
SESSION_SECRET=${random()}
ADMIN_SESSION_SECRET=${random()}
OTP_SECRET=${random()}
LOCAL_ADMIN_EMAIL=admin@example.test
LOCAL_ADMIN_PASSWORD=${random()}
LOCAL_PROVIDER_PASSWORD=${random()}
LOCAL_DEVELOPMENT=true
`;
try {
  await writeFile(new URL('../.env', import.meta.url), text, { flag: 'wx', mode: 0o600 });
  console.log('Created .env. Open it locally for the synthetic admin/provider passwords. No credentials printed.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('.env already exists; preserved without changes.');
}
