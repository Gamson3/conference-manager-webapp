import express from "express";
import {
  getAttendeeProfile,
  updateAttendeeProfile,
  getDashboardStats,
  getRecentConferences,
  registerForConference,
  cancelConferenceRegistration,
  getRegisteredConferences,
  getFavoritesPresentations,
  getFavoriteStatusBulk,
  getConferenceWithPeople,
  discoverConferences,
  getNetworkingData
} from "../controllers/attendeeControllers";
import { authMiddleware } from "../middleware/authMiddleware";
import { optionalAuthMiddleware } from "../middleware/optionalAuthMiddleware";

const router = express.Router();

// Profile routes
router.get("/profile", authMiddleware(["attendee"]), getAttendeeProfile);
router.put("/profile", authMiddleware(["attendee"]), updateAttendeeProfile);

// Dashboard routes
router.get("/dashboard-stats", authMiddleware(["attendee"]), getDashboardStats);
router.get("/recent-conferences", authMiddleware(["attendee"]), getRecentConferences);

// Conference registration
router.post("/register-conference", authMiddleware(["attendee"]), registerForConference);
router.get("/registered-conferences", authMiddleware(["attendee"]), getRegisteredConferences);
router.delete("/unregister-conference/:conferenceId", authMiddleware(["attendee"]), cancelConferenceRegistration);

// Get and check multiple Favorites (ATTENDEE MANAGEMENT)
router.get("/favorites", authMiddleware(["attendee"]), getFavoritesPresentations);
router.post("/favorites/status", authMiddleware(["attendee"]), getFavoriteStatusBulk); // NEW

// Conference discovery and details: MODIFIED to Allow both authenticated and guest access
router.get("/discover", optionalAuthMiddleware, discoverConferences); // Optional auth
router.get("/conferences/:id/details", optionalAuthMiddleware, getConferenceWithPeople); // Optional auth

// Networking
router.get("/networking", authMiddleware(["attendee"]), getNetworkingData);

export default router;