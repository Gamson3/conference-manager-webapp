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
  getNetworkingData,
  getUserSubmissions
} from "../controllers/attendeeControllers";
import { authMiddleware } from "../middleware/authMiddleware";
import { optionalAuthMiddleware } from "../middleware/optionalAuthMiddleware";

const router = express.Router();

// All authenticated users (user, organizer, admin) can access attendee features
const allRoles = ["user", "organizer", "admin"];

// Profile routes
router.get("/profile", authMiddleware(allRoles), getAttendeeProfile);
router.put("/profile", authMiddleware(allRoles), updateAttendeeProfile);

// Dashboard routes
router.get("/dashboard-stats", authMiddleware(allRoles), getDashboardStats);
router.get("/recent-conferences", authMiddleware(allRoles), getRecentConferences);

// Conference registration
router.post("/register-conference", authMiddleware(allRoles), registerForConference);
router.get("/registered-conferences", authMiddleware(allRoles), getRegisteredConferences);
router.delete("/unregister-conference/:conferenceId", authMiddleware(allRoles), cancelConferenceRegistration);

// User submissions (all submissions by the current user across conferences)
router.get("/my-submissions", authMiddleware(allRoles), getUserSubmissions);

// Get and check multiple Favorites (ATTENDEE MANAGEMENT)
router.get("/favorites", authMiddleware(allRoles), getFavoritesPresentations);
router.post("/favorites/status", authMiddleware(allRoles), getFavoriteStatusBulk);

// Conference discovery and details: Allow both authenticated and guest access
router.get("/discover", optionalAuthMiddleware, discoverConferences);
router.get("/conferences/:id/details", optionalAuthMiddleware, getConferenceWithPeople);

// Networking
router.get("/networking", authMiddleware(allRoles), getNetworkingData);

export default router;