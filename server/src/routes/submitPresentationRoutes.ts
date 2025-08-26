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
router.get('/presenter/dashboard', authMiddleware(["presenter"]), getPresenterDashboard);
router.post('/presenter/profile', authMiddleware(["presenter"]), createPresenterProfile);
router.put('/presenter/profile', authMiddleware(["presenter"]), updatePresenterProfile);

// Submission endpoints
router.post('/conferences/:conferenceId/submit', authMiddleware(["attendee", "presenter"]), submitPresentation);
router.get('/submissions/:id', authMiddleware(["presenter"]), getSubmissionStatus);
router.get('/submissions', authMiddleware(["presenter"]), listUserSubmissions);

// File management endpoints
router.post('/presentations/:presentationId/materials', authMiddleware(["presenter"]), upload.single('file'), uploadPresentationFile);
router.get('/presentations/:presentationId/materials', authMiddleware(["presenter"]), getPresentationMaterials);
router.delete('/materials/:materialId', authMiddleware(["presenter"]), deletePresentationMaterial);
router.get('/files/:fileId/download', downloadFile); // Public endpoint with auth checks inside

export default router;