// backend/src/services/s3.js
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION || "us-east-1";
const s3 = new S3Client({ region });

export async function presignPut({ bucket, key, contentType, expiresIn }) {
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3, cmd, { expiresIn });
}

export async function presignGet({ bucket, key, expiresIn }) {
  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(s3, cmd, { expiresIn });
}

export async function uploadBufferToS3({ bucket, key, buffer, contentType }) {
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3.send(cmd);

  return {
    bucket,
    key,
  };
}
