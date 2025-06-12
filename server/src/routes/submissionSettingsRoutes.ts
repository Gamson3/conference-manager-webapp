import express from 'express';
import { upsertSubmissionSettings, getSubmissionSettings } from '../controllers/submissionSettingsControllers';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Only organizers and admins should manage submission settings
router.put('/events/:conferenceId/submission-settings', authMiddleware(["organizer", "admin"]), upsertSubmissionSettings);
router.get('/events/:conferenceId/submission-settings', authMiddleware(["organizer", "admin"]), getSubmissionSettings);

export default router;