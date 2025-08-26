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

// Profile routes - accessible to both attendees and presenters
router.get("/profile", authMiddleware(["attendee", "presenter"]), getAttendeeProfile);
router.put("/profile", authMiddleware(["attendee", "presenter"]), updateAttendeeProfile);

// Dashboard routes - accessible to both attendees and presenters
router.get("/dashboard-stats", authMiddleware(["attendee", "presenter"]), getDashboardStats);
router.get("/recent-conferences", authMiddleware(["attendee", "presenter"]), getRecentConferences);

// Conference registration - accessible to both attendees and presenters
router.post("/register-conference", authMiddleware(["attendee", "presenter"]), registerForConference);
router.get("/registered-conferences", authMiddleware(["attendee", "presenter"]), getRegisteredConferences);
router.delete("/unregister-conference/:conferenceId", authMiddleware(["attendee", "presenter"]), cancelConferenceRegistration);

// Favorites - accessible to both attendees and presenters
router.get("/favorites", authMiddleware(["attendee", "presenter"]), getFavoritesPresentations);
router.post("/favorites/status", authMiddleware(["attendee", "presenter"]), getFavoriteStatusBulk);

// Conference discovery and details: MODIFIED to Allow both authenticated and guest access
router.get("/discover", optionalAuthMiddleware, discoverConferences); // Optional auth
router.get("/conferences/:id/details", optionalAuthMiddleware, getConferenceWithPeople);

// Networking
router.get("/networking", authMiddleware(["attendee", "presenter"]), getNetworkingData);

export default router;