import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { optionalAuthMiddleware } from '../middleware/optionalAuthMiddleware';
import { validateConferenceDatesForUpdate } from "../middleware/validateConferenceDates";
import {
  // Settings
  getRegistrationSettings,
  updateRegistrationSettings,
  // Questions
  listQuestions,
  listActiveQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  // Enhanced Registration
  registerWithResponses,
  updateParticipant,
  removeParticipant,
  approveParticipant,
  // Overview & Export
  getRegistrationOverview,
  exportParticipants,
} from '../controllers/registrationControllers';

const router = express.Router();

// ===================== REGISTRATION SETTINGS =====================
// GET /api/conferences/:id/registration/settings - Get registration settings
router.get('/conferences/:id/registration/settings', authMiddleware(['organizer', 'admin']), getRegistrationSettings);

// PUT /api/conferences/:id/registration/settings - Update registration settings
router.put(
  '/conferences/:id/registration/settings',
  authMiddleware(['organizer', 'admin']),
  validateConferenceDatesForUpdate,
  updateRegistrationSettings
);

// ===================== CUSTOM QUESTIONS =====================
// GET /api/conferences/:id/registration/questions - List all questions (organizer)
router.get('/conferences/:id/registration/questions', authMiddleware(['organizer', 'admin']), listQuestions);

// GET /api/conferences/:id/registration/questions/active - List active questions (public for form)
router.get('/conferences/:id/registration/questions/active', optionalAuthMiddleware, listActiveQuestions);

// POST /api/conferences/:id/registration/questions - Create a question
router.post('/conferences/:id/registration/questions', authMiddleware(['organizer', 'admin']), createQuestion);

// PUT /api/conferences/:id/registration/questions/:questionId - Update a question
router.put('/conferences/:id/registration/questions/:questionId', authMiddleware(['organizer', 'admin']), updateQuestion);

// DELETE /api/conferences/:id/registration/questions/:questionId - Delete a question
router.delete('/conferences/:id/registration/questions/:questionId', authMiddleware(['organizer', 'admin']), deleteQuestion);

// POST /api/conferences/:id/registration/questions/reorder - Reorder questions
router.post('/conferences/:id/registration/questions/reorder', authMiddleware(['organizer', 'admin']), reorderQuestions);

// ===================== ENHANCED REGISTRATION =====================
// POST /api/conferences/:id/register/enhanced - Register with custom responses
router.post('/conferences/:id/register/enhanced', authMiddleware(['user', 'organizer', 'admin']), registerWithResponses);

// ===================== PARTICIPANT MANAGEMENT =====================
// PUT /api/conferences/:id/participants/:participantId - Update participant
router.put('/conferences/:id/participants/:participantId', authMiddleware(['organizer', 'admin']), updateParticipant);

// DELETE /api/conferences/:id/participants/:participantId - Remove participant
router.delete('/conferences/:id/participants/:participantId', authMiddleware(['organizer', 'admin']), removeParticipant);

// POST /api/conferences/:id/participants/:participantId/approve - Approve participant
router.post('/conferences/:id/participants/:participantId/approve', authMiddleware(['organizer', 'admin']), approveParticipant);

// ===================== OVERVIEW & EXPORT =====================
// GET /api/conferences/:id/registration/overview - Get registration overview
router.get('/conferences/:id/registration/overview', authMiddleware(['organizer', 'admin']), getRegistrationOverview);

// POST /api/conferences/:id/participants/export - Export participants to CSV
router.post('/conferences/:id/participants/export', authMiddleware(['organizer', 'admin']), exportParticipants);

export default router;
