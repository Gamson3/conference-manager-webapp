// For public-facing routes (that don't require authentication)

import express from "express";
import { 
  getPublicConferences, 
  getPublicConferenceDetails,
  getPublicConferenceMaterials
} from "../controllers/conferenceControllers";
import {
  getConferenceSchedule,
  getConferencePresentations,
  togglePresentationFavorite,
  getUserFavoriteePresentations
} from "../controllers/scheduleControllers";
import {
  searchConferencePresentations,
  globalSearch,
  getSearchSuggestions
} from "../controllers/searchControllers";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// Public routes-
router.get("/", getPublicConferences);
router.get("/:id", getPublicConferenceDetails);
router.get("/:id/materials", getPublicConferenceMaterials);

// Schedule routes (protected)
router.get("/:id/schedule", authMiddleware(["attendee", "organizer", "admin"]), getConferenceSchedule);
router.get("/:id/presentations", authMiddleware(["attendee", "organizer", "admin"]), getConferencePresentations);

// Search routes (protected)
router.get("/:id/search", authMiddleware(["attendee", "organizer", "admin"]), searchConferencePresentations);
router.get("/:id/search/suggestions", authMiddleware(["attendee", "organizer", "admin"]), getSearchSuggestions);

// Favorites routes (protected)
router.post("/presentations/:id/favorite", authMiddleware(["attendee", "organizer", "admin"]), togglePresentationFavorite);
router.delete("/presentations/:id/favorite", authMiddleware(["attendee", "organizer", "admin"]), togglePresentationFavorite);

export default router;