import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { registerSelf, unregisterSelf, listParticipants, getParticipantStats } from '../controllers/participantsController';

const router = express.Router();

router.post('/conferences/:id/register', authMiddleware(['user','organizer','admin']), registerSelf);
router.delete('/conferences/:id/unregister', authMiddleware(['user','organizer','admin']), unregisterSelf);
router.get('/conferences/:id/participants', authMiddleware(['organizer','admin']), listParticipants);
router.get('/conferences/:id/participants/stats', authMiddleware(['organizer','admin']), getParticipantStats);

export default router;
