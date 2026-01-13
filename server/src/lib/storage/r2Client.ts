/**
 * Cloudflare R2 client using AWS S3 SDK (S3-compatible API).
 * Handles presigned URL generation for uploads and downloads.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { storageConfig } from './config';

let s3Client: S3Client | null = null;

/**
 * Get or create the S3 client instance for R2.
 */
export function getR2Client(): S3Client {
  if (s3Client) return s3Client;

  const { r2 } = storageConfig;

  if (!r2.endpoint || !r2.accessKeyId || !r2.secretAccessKey) {
    throw new Error(
      'R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.'
    );
  }

  s3Client = new S3Client({
    region: 'auto', // R2 uses 'auto' region
    endpoint: r2.endpoint,
    credentials: {
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
    },
  });

  return s3Client;
}

/**
 * Generate a presigned URL for uploading a file directly to R2.
 * @param key - The object key (path) in the bucket
 * @param contentType - The MIME type of the file
 * @param expiresIn - URL expiry in seconds (default 15 minutes)
 * @returns Presigned upload URL
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 900
): Promise<string> {
  const client = getR2Client();
  const { r2 } = storageConfig;

  const command = new PutObjectCommand({
    Bucket: r2.bucketName,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Generate a presigned URL for reading/downloading a file from R2.
 * @param key - The object key (path) in the bucket
 * @param expiresIn - URL expiry in seconds (default 5 minutes)
 * @param responseContentDisposition - Optional: force download with filename
 * @returns Presigned read URL
 */
export async function getPresignedReadUrl(
  key: string,
  expiresIn: number = 300,
  responseContentDisposition?: string
): Promise<string> {
  const client = getR2Client();
  const { r2 } = storageConfig;

  const command = new GetObjectCommand({
    Bucket: r2.bucketName,
    Key: key,
    ...(responseContentDisposition && {
      ResponseContentDisposition: responseContentDisposition,
    }),
  });

  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Upload a file buffer directly to R2.
 * Used for server-side uploads (e.g., multipart form handling).
 * @param key - The object key (path) in the bucket
 * @param body - File buffer or stream
 * @param contentType - The MIME type of the file
 * @param metadata - Optional metadata to attach to the object
 */
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
  metadata?: Record<string, string>
): Promise<void> {
  const client = getR2Client();
  const { r2 } = storageConfig;

  const params: PutObjectCommandInput = {
    Bucket: r2.bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
    ...(metadata && { Metadata: metadata }),
  };

  await client.send(new PutObjectCommand(params));
}

/**
 * Delete an object from R2.
 * @param key - The object key (path) in the bucket
 */
export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client();
  const { r2 } = storageConfig;

  const command = new DeleteObjectCommand({
    Bucket: r2.bucketName,
    Key: key,
  });

  await client.send(command);
}

/**
 * Check if an object exists in R2.
 * @param key - The object key (path) in the bucket
 * @returns true if object exists, false otherwise
 */
export async function objectExistsInR2(key: string): Promise<boolean> {
  const client = getR2Client();
  const { r2 } = storageConfig;

  try {
    const command = new HeadObjectCommand({
      Bucket: r2.bucketName,
      Key: key,
    });
    await client.send(command);
    return true;
  } catch (error) {
    // NotFound error means object doesn't exist
    if ((error as { name?: string }).name === 'NotFound') {
      return false;
    }
    throw error;
  }
}

/**
 * Generate a public URL for an object (only works if bucket/object is public).
 * @param key - The object key (path) in the bucket
 * @returns Public URL or null if no public URL is configured
 */
export function getPublicUrl(key: string): string | null {
  const { r2 } = storageConfig;

  if (!r2.publicUrl) return null;

  // Ensure no double slashes
  const baseUrl = r2.publicUrl.replace(/\/$/, '');
  return `${baseUrl}/${key}`;
}
