import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { storageConfig } from '../src/services/storageConfig.js';

// This check touches only its own unique object, never existing listings.
const bucket = process.env.S3_BUCKET;
if (!bucket || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error('Enter S3_BUCKET, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.storage, then recreate skill-api.');
  process.exit(1);
}
const s3 = new S3Client(storageConfig());
const key = `_checks/${randomUUID()}.png`;
const body = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZ0AAAAASUVORK5CYII=', 'base64');
let attempted = false;
try {
  attempted = true;
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: 'image/png' }));
  const signed = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 60 });
  const response = await fetch(signed, { signal: AbortSignal.timeout(30000) });
  if (!response.ok || !Buffer.from(await response.arrayBuffer()).equals(body)) throw new Error('SignedReadFailed');
  console.log('PASS private image upload and signed download.');
  const unsigned = new URL(signed); unsigned.search = '';
  const anonymous = await fetch(unsigned, { signal: AbortSignal.timeout(30000) });
  await anonymous.body?.cancel();
  if (![401, 403, 404].includes(anonymous.status)) throw new Error('BucketPrivacyCheckFailed');
  console.log('PASS anonymous image access denied.');
} catch (error) {
  // SDK errors may include request details. Never log credentials or signed URLs.
  const status = error?.$metadata?.httpStatusCode;
  console.error(`FAIL storage check${status ? ` (HTTP ${status})` : ''}. Check endpoint, region, credentials, bucket privacy and object read/write permissions.`);
  process.exitCode = 1;
} finally {
  if (attempted) {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      console.log('PASS temporary check image cleanup.');
    } catch {
      console.error(`Cleanup failed. Remove only this check object manually: ${key}`);
      process.exitCode = 1;
    }
  }
  s3.destroy();
}
