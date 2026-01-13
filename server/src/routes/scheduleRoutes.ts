import express from "express";
import {
  getConferenceSchedule,
  getConferencePresentations,
  addPresentationToFavorites,
  removePresentationFromFavorites,
  // togglePresentationFavorite,
  getUserFavoriteePresentations,
  getAcceptedPresentationsForConference,
  getConferenceSpeakers,
  // Phase 5: Schedule management
  validateSchedule,
  saveSchedule,
  publishSchedule,
  unpublishSchedule,
} from "../controllers/scheduleControllers";
import { authMiddleware } from "../middleware/authMiddleware";
import { optionalAuthMiddleware } from "../middleware/optionalAuthMiddleware";

const router = express.Router();

// Conference schedule routes - READ (public when published)
router.get("/conferences/:id/schedule", optionalAuthMiddleware, getConferenceSchedule);
router.get("/conferences/:id/presentations", authMiddleware(["user", "organizer", "admin"]), getConferencePresentations);
// Accepted presentations and speakers (allow public when published)
router.get("/conferences/:id/accepted-presentations", optionalAuthMiddleware, getAcceptedPresentationsForConference);
router.get("/conferences/:id/speakers", optionalAuthMiddleware, getConferenceSpeakers);

// Phase 5: Schedule management - WRITE (organizer/admin only)
router.post("/conferences/:id/schedule/validate", authMiddleware(["organizer", "admin"]), validateSchedule);
router.put("/conferences/:id/schedule", authMiddleware(["organizer", "admin"]), saveSchedule);
router.post("/conferences/:id/schedule/publish", authMiddleware(["organizer", "admin"]), publishSchedule);
router.post("/conferences/:id/schedule/unpublish", authMiddleware(["organizer", "admin"]), unpublishSchedule);

// Presentation favorites (ATTENDEE CONSUMPTION - Add and Remove)
router.post("/presentations/:id/favorite", authMiddleware(["user", "organizer", "admin"]), addPresentationToFavorites);
router.delete("/presentations/:id/favorite", authMiddleware(["user", "organizer", "admin"]), removePresentationFromFavorites);

// User favorites
router.get("/favorites/presentations", authMiddleware(["user", "organizer", "admin"]), getUserFavoriteePresentations);

export default router;