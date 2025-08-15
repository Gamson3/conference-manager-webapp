import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  getConferenceSubmissions,
  getSubmission,
  reviewSubmission,
} from "../controllers/presentationReviewControllers";

const router = Router();

// Review routes
router.get(
  "/conferences/:conferenceId/submissions", 
  authMiddleware(["organizer", "admin"]), 
  getConferenceSubmissions
);
router.get(
  "/presentations/:id", 
  authMiddleware(["organizer", "admin"]), 
  getSubmission
);
router.post(
  "/presentations/:id/review", 
  authMiddleware(["organizer", "admin"]), 
  reviewSubmission
);

export default router;