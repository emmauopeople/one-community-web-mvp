// backend/src/services/s3.js
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { storageConfig } from "./storageConfig.js";
const s3 = new S3Client(storageConfig());

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
    CacheControl: "private, max-age=900",
  });

  await s3.send(cmd);

  return {
    bucket,
    key,
  };
}

export async function deleteStorageObject({ bucket, key }) {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
