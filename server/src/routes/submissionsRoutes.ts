import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  createSubmission,
  getSubmission,
  updateSubmission,
  submitSubmission,
  withdrawSubmission,
  uploadSubmissionAbstractFile,
  uploadSubmissionFullTextFile,
  listConferenceSubmissions,
  reviewSubmission,
  decideSubmission,
  exportConferenceSubmissions,
} from '../controllers/submissionsController';
import { submissionUpload } from "../middleware/submissionUpload";

const router = express.Router();

// author endpoints
router.post('/conferences/:id/submissions', authMiddleware(['user','organizer','admin']), createSubmission);
router.get('/submissions/:submissionId', authMiddleware(['user','organizer','admin']), getSubmission);
router.put('/submissions/:submissionId', authMiddleware(['user','organizer','admin']), updateSubmission);

// file upload endpoints (multipart/form-data)
router.post(
  "/submissions/:submissionId/abstract-file",
  authMiddleware(["user", "organizer", "admin"]),
  submissionUpload.single("file"),
  uploadSubmissionAbstractFile
);
router.post(
  "/submissions/:submissionId/full-text-file",
  authMiddleware(["user", "organizer", "admin"]),
  submissionUpload.single("file"),
  uploadSubmissionFullTextFile
);
router.post('/submissions/:submissionId/submit', authMiddleware(['user','organizer','admin']), submitSubmission);
router.post('/submissions/:submissionId/withdraw', authMiddleware(['user','organizer','admin']), withdrawSubmission);

// listing and reviews
router.get('/conferences/:id/submissions', authMiddleware(['user','organizer','admin']), listConferenceSubmissions);
router.get('/conferences/:id/submissions/export', authMiddleware(['organizer','admin']), exportConferenceSubmissions);
router.post('/submissions/:submissionId/review', authMiddleware(['organizer','admin']), reviewSubmission);
router.post('/submissions/:submissionId/decision', authMiddleware(['organizer','admin']), (req, res) => {
  res.status(410).json({
    message:
      'This endpoint is deprecated. Use /api/organizer/submissions/:submissionId/decision instead.',
  });
});

export default router;
