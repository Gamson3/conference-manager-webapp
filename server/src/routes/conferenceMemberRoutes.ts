import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  upsertConferenceMember,
  getConferenceMembership
} from '../controllers/conferenceMemberControllers';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware());

router.get('/conferences/:conferenceId/membership', getConferenceMembership);
router.post('/conferences/:conferenceId/membership', upsertConferenceMember);

export default router;