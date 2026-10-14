import nodemailer from '../services/skill-visibility/node_modules/nodemailer/lib/nodemailer.js';
const env = process.env;
for (const key of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM']) {
  if (!env[key]) throw new Error(`${key} is required`);
}
const port = Number(env.SMTP_PORT);
if (![465, 587].includes(port)) throw new Error('Use SMTP port 465 or 587');
const transport = nodemailer.createTransport({
  host: env.SMTP_HOST, port, secure: port === 465, requireTLS: port === 587,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000,
});
try {
  await transport.verify();
  console.log('SMTP connection, encryption, and authentication verified. No email sent.');
} catch (error) {
  console.error('SMTP verification failed:', error.code || 'UNKNOWN', error.responseCode || '');
  process.exitCode = 1;
} finally { transport.close(); }
