import express from "express";
import {
  getConferenceSchedule,
  getConferencePresentations,
  addPresentationToFavorites,
  removePresentationFromFavorites,
  // togglePresentationFavorite,
  getUserFavoriteePresentations,
} from "../controllers/scheduleControllers";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// Conference schedule routes
router.get("/conferences/:id/schedule", authMiddleware(["attendee", "organizer", "admin"]), getConferenceSchedule);
router.get("/conferences/:id/presentations", authMiddleware(["attendee", "organizer", "admin"]), getConferencePresentations);

// Presentation favorites (ATTENDEE CONSUMPTION - Add and Remove)
router.post("/presentations/:id/favorite", authMiddleware(["attendee", "organizer", "admin"]), addPresentationToFavorites);
router.delete("/presentations/:id/favorite", authMiddleware(["attendee", "organizer", "admin"]), removePresentationFromFavorites);

// User favorites
router.get("/favorites/presentations", authMiddleware(["attendee", "organizer", "admin"]), getUserFavoriteePresentations);

export default router;