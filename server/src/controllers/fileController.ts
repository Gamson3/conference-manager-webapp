/**
 * File access controller.
 * Handles authorized access to private files stored in R2/S3.
 * Only authors and organizers can access submission files.
 */

import { type Request, type Response } from 'express';
import prisma from '../lib/prisma';
import {
  getPresignedReadUrl,
  isR2Active,
  generateStorageKey,
  getPresignedUploadUrl,
  deleteFile,
} from '../lib/storage';

/**
 * Get a signed URL to access a submission file.
 * 
 * GET /api/submissions/:id/file?type=abstract|fulltext
 * 
 * Access control:
 * - Author of the submission
 * - Organizer (creator) of the conference
 * - Admin users
 */
export const getSubmissionFileUrl = async (
  req: Request,
  res: Response
): Promise<void> => {
  const submissionId = parseInt(req.params.id, 10);
  const fileType = req.query.type as string;
  const forceDownload = req.query.download === 'true';

  // Validate file type
  if (!fileType || !['abstract', 'fulltext'].includes(fileType)) {
    res.status(400).json({
      error: 'Invalid file type',
      message: 'Query parameter "type" must be "abstract" or "fulltext"',
    });
    return;
  }

  // Validate submission ID
  if (isNaN(submissionId)) {
    res.status(400).json({
      error: 'Invalid submission ID',
      message: 'Submission ID must be a number',
    });
    return;
  }

  // Get authenticated user
  const user = req.user as { id: number; role: string } | undefined;
  if (!user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required to access submission files',
    });
    return;
  }

  // Fetch submission with conference info
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      authorId: true,
      conferenceId: true,
      abstractFileKey: true,
      abstractFileUrl: true,
      abstractFileName: true,
      fullTextFileKey: true,
      fullTextFileUrl: true,
      fullTextFileName: true,
      conference: {
        select: {
          id: true,
          createdById: true,
        },
      },
    },
  });

  if (!submission) {
    res.status(404).json({
      error: 'Not found',
      message: 'Submission not found',
    });
    return;
  }

  // Authorization check: user must be author, organizer, or admin
  const isAuthor = submission.authorId === user.id;
  const isOrganizer = submission.conference.createdById === user.id;
  const isAdmin = user.role === 'admin';

  if (!isAuthor && !isOrganizer && !isAdmin) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to access this file',
    });
    return;
  }

  // Get the appropriate file key/URL and filename
  let fileKey: string | null = null;
  let fileUrl: string | null = null;
  let fileName: string | null = null;

  if (fileType === 'abstract') {
    fileKey = submission.abstractFileKey;
    fileUrl = submission.abstractFileUrl;
    fileName = submission.abstractFileName;
  } else {
    fileKey = submission.fullTextFileKey;
    fileUrl = submission.fullTextFileUrl;
    fileName = submission.fullTextFileName;
  }

  // Check if file exists
  if (!fileKey && !fileUrl) {
    res.status(404).json({
      error: 'File not found',
      message: `No ${fileType} file has been uploaded for this submission`,
    });
    return;
  }

  // Generate signed URL
  let signedUrl: string;

  if (fileKey && isR2Active()) {
    // R2 storage: generate presigned read URL
    const expiresIn = 300; // 5 minutes
    const downloadFilename = forceDownload && fileName ? fileName : undefined;
    signedUrl = await getPresignedReadUrl(fileKey, expiresIn, downloadFilename);
  } else if (fileUrl) {
    // Legacy: return existing URL (local storage or already public URL)
    // Note: This maintains backwards compatibility during migration
    signedUrl = fileUrl;
  } else {
    res.status(500).json({
      error: 'Storage error',
      message: 'Unable to generate file access URL',
    });
    return;
  }

  res.json({
    url: signedUrl,
    fileName: fileName ?? undefined,
    expiresIn: fileKey && isR2Active() ? 300 : undefined,
  });
};

/**
 * Get a signed URL for uploading a submission file.
 * Used for direct-to-storage uploads from the client.
 * 
 * POST /api/submissions/:id/file/upload-url
 * Body: { type: 'abstract' | 'fulltext', contentType: string, fileName: string }
 */
export const getSubmissionFileUploadUrl = async (
  req: Request,
  res: Response
): Promise<void> => {
  const submissionId = parseInt(req.params.id, 10);
  const { type, contentType, fileName } = req.body as {
    type?: string;
    contentType?: string;
    fileName?: string;
  };

  // Validate inputs
  if (!type || !['abstract', 'fulltext'].includes(type)) {
    res.status(400).json({
      error: 'Invalid file type',
      message: 'Body parameter "type" must be "abstract" or "fulltext"',
    });
    return;
  }

  if (!contentType) {
    res.status(400).json({
      error: 'Missing content type',
      message: 'Body parameter "contentType" is required',
    });
    return;
  }

  if (!fileName) {
    res.status(400).json({
      error: 'Missing file name',
      message: 'Body parameter "fileName" is required',
    });
    return;
  }

  if (isNaN(submissionId)) {
    res.status(400).json({
      error: 'Invalid submission ID',
      message: 'Submission ID must be a number',
    });
    return;
  }

  // Get authenticated user
  const user = req.user as { id: number; role: string } | undefined;
  if (!user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  // Fetch submission
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      authorId: true,
      conferenceId: true,
      status: true,
      isLocked: true,
    },
  });

  if (!submission) {
    res.status(404).json({
      error: 'Not found',
      message: 'Submission not found',
    });
    return;
  }

  // Only author can upload files to their submission
  if (submission.authorId !== user.id) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Only the submission author can upload files',
    });
    return;
  }

  // Check submission status - must be draft or revision_requested
  if (!['draft', 'revision_requested'].includes(submission.status)) {
    res.status(400).json({
      error: 'Invalid status',
      message: 'Files can only be uploaded to draft or revision-requested submissions',
    });
    return;
  }

  // Check if submission is locked
  if (submission.isLocked) {
    res.status(400).json({
      error: 'Submission locked',
      message: 'This submission is locked and cannot be modified',
    });
    return;
  }

  // Check if R2 is active
  if (!isR2Active()) {
    res.status(501).json({
      error: 'Not implemented',
      message: 'Direct upload is only available when R2 storage is configured. Use multipart form upload instead.',
    });
    return;
  }

  // Generate storage key
  const storageKey = generateStorageKey(
    'submissions',
    String(submission.conferenceId),
    fileName
  );

  // Generate presigned upload URL
  const expiresIn = 900; // 15 minutes
  const uploadUrl = await getPresignedUploadUrl(storageKey, contentType, expiresIn);

  res.json({
    uploadUrl,
    storageKey,
    expiresIn,
  });
};

/**
 * Confirm a direct upload has completed and update the submission record.
 * 
 * POST /api/submissions/:id/file/confirm-upload
 * Body: { type: 'abstract' | 'fulltext', storageKey: string, fileName: string, mimeType: string, size: number }
 */
export const confirmSubmissionFileUpload = async (
  req: Request,
  res: Response
): Promise<void> => {
  const submissionId = parseInt(req.params.id, 10);
  const { type, storageKey, fileName, mimeType, size } = req.body as {
    type?: string;
    storageKey?: string;
    fileName?: string;
    mimeType?: string;
    size?: number;
  };

  // Validate inputs
  if (!type || !['abstract', 'fulltext'].includes(type)) {
    res.status(400).json({
      error: 'Invalid file type',
      message: 'Body parameter "type" must be "abstract" or "fulltext"',
    });
    return;
  }

  if (!storageKey || !fileName || !mimeType || typeof size !== 'number') {
    res.status(400).json({
      error: 'Missing parameters',
      message: 'Body must include storageKey, fileName, mimeType, and size',
    });
    return;
  }

  if (isNaN(submissionId)) {
    res.status(400).json({
      error: 'Invalid submission ID',
      message: 'Submission ID must be a number',
    });
    return;
  }

  // Get authenticated user
  const user = req.user as { id: number } | undefined;
  if (!user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  // Fetch submission
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      authorId: true,
      abstractFileKey: true,
      fullTextFileKey: true,
    },
  });

  if (!submission) {
    res.status(404).json({
      error: 'Not found',
      message: 'Submission not found',
    });
    return;
  }

  // Only author can confirm uploads
  if (submission.authorId !== user.id) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Only the submission author can confirm uploads',
    });
    return;
  }

  // Delete old file if replacing
  const oldKey = type === 'abstract' ? submission.abstractFileKey : submission.fullTextFileKey;
  if (oldKey && oldKey !== storageKey) {
    try {
      await deleteFile(oldKey);
    } catch (error) {
      // Log but don't fail - old file cleanup is best-effort
      console.warn(`Failed to delete old file ${oldKey}:`, error);
    }
  }

  // Update submission with new file info
  const updateData =
    type === 'abstract'
      ? {
          abstractFileKey: storageKey,
          abstractFileName: fileName,
          abstractFileMimeType: mimeType,
          abstractFileSizeBytes: size,
          abstractFileUrl: null, // Clear legacy URL field
        }
      : {
          fullTextFileKey: storageKey,
          fullTextFileName: fileName,
          fullTextFileMimeType: mimeType,
          fullTextFileSizeBytes: size,
          fullTextFileUrl: null, // Clear legacy URL field
        };

  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: updateData,
    select: {
      id: true,
      abstractFileKey: true,
      abstractFileName: true,
      fullTextFileKey: true,
      fullTextFileName: true,
    },
  });

  res.json({
    success: true,
    submission: updated,
  });
};
