import { writeFile } from 'node:fs/promises';
const contents = `# LOCAL secrets: excluded from Git and Docker builds. Do not paste into chat.
S3_ENDPOINT=https://s3.eu-west-par.io.cloud.ovh.net
S3_REGION=eu-west-par
AWS_REGION=eu-west-par
S3_BUCKET=one-community-storage
S3_FORCE_PATH_STYLE=true
S3_PREFIX_SKILLS=skills
S3_PRESIGN_EXPIRES_SECONDS=900
S3_MAX_IMAGE_BYTES=3145728
# Enter the S3 access key ID and secret access key, not the OVH username.
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_EC2_METADATA_DISABLED=true
`;
try {
  await writeFile(new URL('../.env.storage', import.meta.url), contents, { flag: 'wx', mode: 0o600 });
  console.log('Created .env.storage. Enter your S3 access key ID and secret there. Values are never printed.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('.env.storage already exists; preserved.');
}
