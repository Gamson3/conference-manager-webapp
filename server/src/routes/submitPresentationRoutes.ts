import express from 'express';
import { authMiddleware } from "../middleware/authMiddleware";
import upload from '../middleware/uploadMiddleware';
import {
  submitPresentation,
  getSubmissionStatus,
  listUserSubmissions,
  uploadPresentationFile,
  getPresentationMaterials,
  downloadFile,
  deletePresentationMaterial,
  getPresenterDashboard,
  createPresenterProfile,
  updatePresenterProfile
} from '../controllers/submitPresentationControllers';

const router = express.Router();

// Presenter dashboard and profile endpoints
router.get('/presenter/dashboard', authMiddleware(["organizer", "attendee", "admin"]), getPresenterDashboard);
router.post('/presenter/profile', authMiddleware(["organizer", "attendee", "admin"]), createPresenterProfile);
router.put('/presenter/profile', authMiddleware(["organizer", "attendee", "admin"]), updatePresenterProfile);

// Submission endpoints
router.post('/conferences/:conferenceId/submit', authMiddleware(["organizer", "attendee", "admin"]), submitPresentation);
router.get('/submissions/:id', authMiddleware(["organizer", "attendee", "admin"]), getSubmissionStatus);
router.get('/submissions', authMiddleware(["organizer", "attendee", "admin"]), listUserSubmissions);

// File management endpoints
router.post('/presentations/:presentationId/materials', authMiddleware(["organizer", "attendee", "admin"]), upload.single('file'), uploadPresentationFile);
router.get('/presentations/:presentationId/materials', authMiddleware(["organizer", "attendee", "admin"]), getPresentationMaterials);
router.delete('/materials/:materialId', authMiddleware(["organizer", "attendee", "admin"]), deletePresentationMaterial);
router.get('/files/:fileId/download', downloadFile); // Public endpoint with auth checks inside

export default router;