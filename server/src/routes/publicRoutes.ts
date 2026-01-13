/**
 * PUBLIC ROUTES
 * /api/public/* - Routes accessible without authentication
 * 
 * These routes provide read-only access to published conference content.
 * Optional auth is used for personalization (e.g., showing favorite status).
 * 
 * @created December 5, 2025
 * @see docs/Route-Naming-Convention-Analysis.md
 */

import express from "express";
import { optionalAuthMiddleware } from "../middleware/optionalAuthMiddleware";

// Conference controllers
import { 
  getPublicConferences, 
  getPublicConferenceDetails,
  getPublicConferenceMaterials 
} from "../controllers/conferenceControllers";

// Schedule controllers
import {
  getConferenceSchedule,
  getAcceptedPresentationsForConference,
  getConferenceSpeakers
} from "../controllers/scheduleControllers";

// Search controllers
import {
  searchConferencePresentations,
  getSearchSuggestions
} from "../controllers/searchControllers";

// Attendee controllers (conference discovery)
import { 
  discoverConferences,
  getConferenceWithPeople,
  getConferenceParticipants
} from "../controllers/attendeeControllers";

const router = express.Router();

/* ============================================================
 * CONFERENCE LISTING & DISCOVERY
 * ============================================================ */

// GET /api/public/conferences - List all published public conferences
router.get("/conferences", getPublicConferences);

// GET /api/public/discover - Discover conferences with filters and personalization
router.get("/discover", optionalAuthMiddleware, discoverConferences);

/* ============================================================
 * CONFERENCE DETAILS
 * ============================================================ */

// GET /api/public/conferences/:id - Get conference details (published only)
router.get("/conferences/:id", optionalAuthMiddleware, getPublicConferenceDetails);

// GET /api/public/conferences/:id/details - Enhanced details with people
router.get("/conferences/:id/details", optionalAuthMiddleware, getConferenceWithPeople);

/* ============================================================
 * SCHEDULE & PRESENTATIONS
 * ============================================================ */

// GET /api/public/conferences/:id/schedule - Get published schedule
router.get("/conferences/:id/schedule", optionalAuthMiddleware, getConferenceSchedule);

// GET /api/public/conferences/:id/presentations - Get accepted presentations
router.get("/conferences/:id/presentations", optionalAuthMiddleware, getAcceptedPresentationsForConference);

// GET /api/public/conferences/:id/speakers - Get conference speakers
router.get("/conferences/:id/speakers", optionalAuthMiddleware, getConferenceSpeakers);

/* ============================================================
 * MATERIALS & RESOURCES
 * ============================================================ */

// GET /api/public/conferences/:id/materials - Get public materials
router.get("/conferences/:id/materials", getPublicConferenceMaterials);

/* ============================================================
 * PARTICIPANTS
 * ============================================================ */

// GET /api/public/conferences/:id/participants - Get public participant list
router.get("/conferences/:id/participants", getConferenceParticipants);

/* ============================================================
 * SEARCH
 * ============================================================ */

// GET /api/public/conferences/:id/search - Search conference content
router.get("/conferences/:id/search", optionalAuthMiddleware, searchConferencePresentations);

// GET /api/public/conferences/:id/search/suggestions - Get search suggestions
router.get("/conferences/:id/search/suggestions", optionalAuthMiddleware, getSearchSuggestions);

/* ============================================================
 * SETTINGS (for authenticated users planning to register/submit)
 * ============================================================ */

import { authMiddleware } from "../middleware/authMiddleware";
import { 
  getPublicRegistrationSettings,
  getPublicAbstractSettings 
} from "../controllers/publicSettingsControllers";

// GET /api/public/conferences/:id/registration/settings - Get public registration settings
router.get("/conferences/:id/registration/settings", authMiddleware(['user', 'organizer', 'admin']), getPublicRegistrationSettings);

// GET /api/public/conferences/:id/abstracts/settings - Get public abstract submission settings
router.get("/conferences/:id/abstracts/settings", authMiddleware(['user', 'organizer', 'admin']), getPublicAbstractSettings);

export default router;
