// For public-facing routes (that don't require authentication)

import express from "express";
import { 
  getPublicConferences, 
  getPublicConferenceDetails,
  getPublicConferenceMaterials,
  createConference,
  getMyConferences
} from "../controllers/conferenceControllers";
import {
  searchConferencePresentations,
  getSearchSuggestions
} from "../controllers/searchControllers";
import { authMiddleware } from "../middleware/authMiddleware";
import { optionalAuthMiddleware } from "../middleware/optionalAuthMiddleware";
import { getConferenceParticipants } from '../controllers/attendeeControllers';
import { updateEvent } from "../controllers/eventControllers";
import { validateConferenceDatesForUpdate } from "../middleware/validateConferenceDates";

const router = express.Router();

// Conference creation (organizer/admin only)
router.post("/", authMiddleware(["organizer", "admin"]), createConference);

// Public listing OR organizer-owned listing when ?mine=1 provided
router.get("/", (req, res, next) => {
  if (req.query.mine) {
    return authMiddleware(["organizer", "admin"])(req, res, next);
  }
  next();
}, (req, res) => {
  if (req.query.mine) {
    return getMyConferences(req, res);
  }
  return getPublicConferences(req, res);
});

// Unified GET: public can view published+public; owners/admin can view drafts/private.
// Use optional auth so req.user is populated when a token is present, but guests still work.
router.get("/:id", optionalAuthMiddleware, getPublicConferenceDetails);
router.get("/:id/materials", getPublicConferenceMaterials);

// Conference participants
router.get('/:id/participants', getConferenceParticipants);

// Protected organizer/admin view: use same controller but require auth
router.get('/private/:id', authMiddleware(["organizer", "admin"]), getPublicConferenceDetails);

// Unified organizer update endpoint under /conferences
router.put('/:id', authMiddleware(["organizer", "admin"]), validateConferenceDatesForUpdate, updateEvent);

// Search routes (conference-specific)
router.get("/:id/search", authMiddleware(["user", "organizer", "admin"]), searchConferencePresentations);
router.get("/:id/search/suggestions", authMiddleware(["user", "organizer", "admin"]), getSearchSuggestions);

export default router;