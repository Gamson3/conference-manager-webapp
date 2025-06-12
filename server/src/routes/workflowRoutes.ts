import express from 'express';
import { updateEventWorkflow, getEventWorkflow } from '../controllers/workflowControllers';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Update event workflow
router.put('/events/:eventId/workflow', authMiddleware(["organizer", "admin"]), updateEventWorkflow);

// Get event workflow status
router.get('/events/:eventId/workflow', authMiddleware(["organizer", "admin"]), getEventWorkflow);

export default router;