// For public-facing routes (that don't require authentication)

import express from "express";
import { 
  getPublicConferences, 
  getPublicConferenceDetails,
  getPublicConferenceMaterials
} from "../controllers/conferenceControllers";
import {
  searchConferencePresentations,
  getSearchSuggestions
} from "../controllers/searchControllers";
import { authMiddleware } from "../middleware/authMiddleware";
import { getConferenceParticipants } from '../controllers/attendeeControllers';

const router = express.Router();

// Public conference routes
router.get("/", getPublicConferences);
router.get("/:id", getPublicConferenceDetails);
router.get("/:id/materials", getPublicConferenceMaterials);

// Conference participants
router.get('/:id/participants', getConferenceParticipants);

// Search routes (conference-specific)
router.get("/:id/search", authMiddleware(["attendee", "organizer", "admin"]), searchConferencePresentations);
router.get("/:id/search/suggestions", authMiddleware(["attendee", "organizer", "admin"]), getSearchSuggestions);

export default router;