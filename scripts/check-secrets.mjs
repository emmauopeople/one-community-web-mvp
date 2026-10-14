import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
const files = execFileSync('git', ['-c', `safe.directory=${process.cwd().replaceAll('\\','/')}`, 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const blockedFiles = /(^|\/)(\.env(?:\.(?!example$)[^/]+)?|[^/]*cookies?[^/]*\.txt|backup\.sql)$/i;
const secretPatterns = [ /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/, /\bAKIA[A-Z0-9]{16}\b/, /\bgh[pousr]_[A-Za-z0-9]{30,}\b/, /^SMTP_PASS\s*=\s*[^\s$#][^\r\n]+$/m ];
const problems = [];
for (const file of new Set(files)) {
  if (blockedFiles.test(file)) { problems.push(file); continue; }
  if (!/\.(?:js|jsx|mjs|json|sql|yaml|yml|md|example|sh|txt)$/.test(file)) continue;
  try { const text = await readFile(file, 'utf8'); if (secretPatterns.some(pattern => pattern.test(text))) problems.push(file); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
if (problems.length) { console.error('Potential secret/session files (values omitted):\n' + problems.join('\n')); process.exit(1); }
console.log('Import hygiene checks passed. Pattern checks are not a comprehensive secret audit.');
