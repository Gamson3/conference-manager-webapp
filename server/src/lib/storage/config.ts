/**
 * Storage configuration for R2/S3-compatible object storage.
 * Supports local fallback for development when R2 credentials are not configured.
 */

export interface StorageConfig {
  driver: 'r2' | 'local';
  r2: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    endpoint: string;
    publicUrl?: string; // Optional: for public assets served via custom domain/CDN
  };
  local: {
    uploadDir: string;
    publicPath: string;
  };
}

function getStorageDriver(): 'r2' | 'local' {
  const driver = process.env.STORAGE_DRIVER?.toLowerCase();
  if (driver === 'r2') return 'r2';
  if (driver === 'local') return 'local';

  // Auto-detect: use R2 if credentials are present, otherwise local
  if (
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  ) {
    return 'r2';
  }

  return 'local';
}

export function getStorageConfig(): StorageConfig {
  const accountId = process.env.R2_ACCOUNT_ID ?? '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? '';
  const bucketName = process.env.R2_BUCKET_NAME ?? '';
  const publicUrl = process.env.R2_PUBLIC_URL;

  // Cloudflare R2 endpoint format
  const endpoint =
    process.env.R2_ENDPOINT ??
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');

  return {
    driver: getStorageDriver(),
    r2: {
      accountId,
      accessKeyId,
      secretAccessKey,
      bucketName,
      endpoint,
      publicUrl,
    },
    local: {
      uploadDir: process.env.LOCAL_UPLOAD_DIR ?? 'uploads',
      publicPath: '/uploads',
    },
  };
}

export const storageConfig = getStorageConfig();
