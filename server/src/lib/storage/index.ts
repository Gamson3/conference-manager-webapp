/**
 * Storage module - unified file storage abstraction.
 *
 * Supports:
 * - Cloudflare R2 (production) - S3-compatible with presigned URLs
 * - Local disk (development) - falls back when R2 not configured
 *
 * Usage:
 *   import { uploadFile, getPresignedReadUrl, deleteFile } from '@/lib/storage';
 */

export { storageConfig, getStorageConfig, type StorageConfig } from './config';

export {
  getR2Client,
  getPresignedUploadUrl as getR2PresignedUploadUrl,
  getPresignedReadUrl as getR2PresignedReadUrl,
  uploadToR2,
  deleteFromR2,
  objectExistsInR2,
  getPublicUrl as getR2PublicUrl,
} from './r2Client';

export {
  generateStorageKey,
  getPresignedUploadUrl,
  getPresignedReadUrl,
  uploadFile,
  deleteFile,
  fileExists,
  getPublicUrl,
  getStorageDriver,
  isR2Active,
  type UploadResult,
  type FileMetadata,
} from './storageService';
