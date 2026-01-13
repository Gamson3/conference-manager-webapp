import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  listDays,
  getDay,
  createDay,
  updateDay,
  deleteDay,
  reorderDays,
  getProgramStats,
} from '../controllers/daysController';

const router = express.Router();

// Program statistics
router.get('/conferences/:id/program/stats', authMiddleware(['organizer', 'admin']), getProgramStats);

// Days CRUD
router.get('/conferences/:id/days', authMiddleware(['organizer', 'admin']), listDays);
router.get('/conferences/:id/days/:dayId', authMiddleware(['organizer', 'admin']), getDay);
router.post('/conferences/:id/days', authMiddleware(['organizer', 'admin']), createDay);
router.put('/conferences/:id/days/:dayId', authMiddleware(['organizer', 'admin']), updateDay);
router.delete('/conferences/:id/days/:dayId', authMiddleware(['organizer', 'admin']), deleteDay);
router.post('/conferences/:id/days/reorder', authMiddleware(['organizer', 'admin']), reorderDays);

export default router;
