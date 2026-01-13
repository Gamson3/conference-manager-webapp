/**
 * File access routes.
 * Handles authorized access to private files stored in R2/S3.
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  getSubmissionFileUrl,
  getSubmissionFileUploadUrl,
  confirmSubmissionFileUpload,
} from '../controllers/fileController';

const router = Router();

// All roles can access their own submission files (author check is in controller)
const allRoles = ['user', 'organizer', 'admin'];

/**
 * GET /api/submissions/:id/file
 * Get a signed URL to access a submission file (abstract or fulltext).
 * Query params: type=abstract|fulltext, download=true (optional)
 * Requires authentication. Only author, organizer, or admin can access.
 */
router.get(
  '/submissions/:id/file',
  authMiddleware(allRoles),
  getSubmissionFileUrl
);

/**
 * POST /api/submissions/:id/file/upload-url
 * Get a presigned URL for direct-to-storage upload.
 * Body: { type: 'abstract' | 'fulltext', contentType: string, fileName: string }
 * Requires authentication. Only author can upload.
 */
router.post(
  '/submissions/:id/file/upload-url',
  authMiddleware(allRoles),
  getSubmissionFileUploadUrl
);

/**
 * POST /api/submissions/:id/file/confirm-upload
 * Confirm a direct upload has completed and update submission record.
 * Body: { type: 'abstract' | 'fulltext', storageKey: string, fileName: string, mimeType: string, size: number }
 * Requires authentication. Only author can confirm.
 */
router.post(
  '/submissions/:id/file/confirm-upload',
  authMiddleware(allRoles),
  confirmSubmissionFileUpload
);

export default router;
