import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { optionalAuthMiddleware } from '../middleware/optionalAuthMiddleware';
import {
  getConferenceSubmissionInfo,
  createAbstractSubmission,
  getUserConferenceSubmissions,
  getSubmissionDetails,
  updateAbstractSubmission,
  withdrawSubmission
} from '../controllers/conferenceSubmissionControllers';

const router = express.Router();

// Public route - anyone can view submission requirements
router.get('/conferences/:conferenceId/submission-info', optionalAuthMiddleware, getConferenceSubmissionInfo);

// Protected routes - require authentication

router.post('/conferences/:conferenceId/submissions', authMiddleware(["attendee", "presenter"]), createAbstractSubmission);

// Only presenters can manage their submissions
router.get('/conferences/:conferenceId/submissions', authMiddleware(["presenter"]), getUserConferenceSubmissions);
router.get('/submissions/:submissionId', authMiddleware(["presenter"]), getSubmissionDetails);
router.put('/submissions/:submissionId', authMiddleware(["presenter"]), updateAbstractSubmission);
router.post('/submissions/:submissionId/withdraw', authMiddleware(["presenter"]), withdrawSubmission);

export default router;