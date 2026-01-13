/**
 * Storage service abstraction layer.
 * Provides a unified interface for file operations across R2 and local storage.
 * Automatically selects backend based on configuration.
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { storageConfig } from './config';
import {
  getPresignedUploadUrl as r2PresignedUpload,
  getPresignedReadUrl as r2PresignedRead,
  uploadToR2,
  deleteFromR2,
  objectExistsInR2,
  getPublicUrl as r2PublicUrl,
} from './r2Client';

export interface UploadResult {
  key: string;
  url: string | null; // Public URL if available, null for private objects
}

export interface FileMetadata {
  originalName: string;
  mimeType: string;
  size: number;
}

/**
 * Generate a storage key for a file.
 * Keys follow the pattern: {category}/{conferenceId}/{uuid}.{ext}
 */
export function generateStorageKey(
  category: 'submissions' | 'conferences' | 'materials',
  conferenceId: string,
  originalFilename: string
): string {
  const ext = path.extname(originalFilename).toLowerCase() || '';
  const uniqueId = uuidv4();
  return `${category}/${conferenceId}/${uniqueId}${ext}`;
}

/**
 * Get a presigned URL for uploading a file.
 * Client uploads directly to storage using this URL.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 900
): Promise<string> {
  if (storageConfig.driver === 'r2') {
    return r2PresignedUpload(key, contentType, expiresIn);
  }

  // Local storage: return a placeholder URL (uploads go through server)
  // In practice, local mode uses multipart upload through the server
  throw new Error(
    'Presigned upload URLs are only available with R2 storage. Use server-side upload for local storage.'
  );
}

/**
 * Get a presigned URL for reading/downloading a file.
 * For private files, this is the only way to access them.
 */
export async function getPresignedReadUrl(
  key: string,
  expiresIn: number = 300,
  forceDownload?: string // Original filename for Content-Disposition
): Promise<string> {
  if (storageConfig.driver === 'r2') {
    const disposition = forceDownload
      ? `attachment; filename="${forceDownload}"`
      : undefined;
    return r2PresignedRead(key, expiresIn, disposition);
  }

  // Local storage: files are served via express.static
  // Return the public path directly (no signing needed for local dev)
  const { local } = storageConfig;
  return `${local.publicPath}/${key}`;
}

/**
 * Upload a file buffer to storage.
 * Used for server-side uploads (multipart form processing).
 */
export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string,
  metadata?: FileMetadata
): Promise<UploadResult> {
  if (storageConfig.driver === 'r2') {
    await uploadToR2(key, buffer, contentType, {
      originalName: metadata?.originalName ?? '',
      size: String(metadata?.size ?? buffer.length),
    });

    return {
      key,
      url: r2PublicUrl(key), // null for private buckets
    };
  }

  // Local storage: write to disk
  const { local } = storageConfig;
  const filePath = path.join(process.cwd(), local.uploadDir, key);
  const dir = path.dirname(filePath);

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, buffer);

  return {
    key,
    url: `${local.publicPath}/${key}`,
  };
}

/**
 * Delete a file from storage.
 */
export async function deleteFile(key: string): Promise<void> {
  if (!key) return;

  if (storageConfig.driver === 'r2') {
    await deleteFromR2(key);
    return;
  }

  // Local storage: delete from disk
  const { local } = storageConfig;
  const filePath = path.join(process.cwd(), local.uploadDir, key);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Check if a file exists in storage.
 */
export async function fileExists(key: string): Promise<boolean> {
  if (!key) return false;

  if (storageConfig.driver === 'r2') {
    return objectExistsInR2(key);
  }

  // Local storage: check disk
  const { local } = storageConfig;
  const filePath = path.join(process.cwd(), local.uploadDir, key);
  return fs.existsSync(filePath);
}

/**
 * Get the public URL for a file (only for public assets).
 * Returns null if file is private or no public URL is configured.
 */
export function getPublicUrl(key: string): string | null {
  if (storageConfig.driver === 'r2') {
    return r2PublicUrl(key);
  }

  // Local storage: return public path
  const { local } = storageConfig;
  return `${local.publicPath}/${key}`;
}

/**
 * Get the current storage driver type.
 */
export function getStorageDriver(): 'r2' | 'local' {
  return storageConfig.driver;
}

/**
 * Check if R2 storage is configured and active.
 */
export function isR2Active(): boolean {
  return storageConfig.driver === 'r2';
}
