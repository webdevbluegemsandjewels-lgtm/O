import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { BUCKET, s3 } from './s3Client.js';

// List all files inside a folder prefix, e.g. "products/" or "assets/".
export async function listFiles(prefix) {
  const command = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix });
  const result = await s3.send(command);
  return (result.Contents || []).map((obj) => obj.Key);
}

// Fetch a single file's stream/bytes body from storage.
export async function getFile(key) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const result = await s3.send(command);
  return result.Body;
}

// Upload a file into a folder, e.g. uploadFile("products/ring-01.jpg", buffer).
export async function uploadFile(key, bodyBuffer, contentType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: bodyBuffer,
    ContentType: contentType,
  });
  return s3.send(command);
}
