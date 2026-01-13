/**
 * ACCOUNT ROUTES
 * /api/account/* - Routes for authenticated users (any role: user, organizer, admin)
 * 
 * These routes handle user-specific features like profiles, dashboards,
 * registrations, submissions, and favorites.
 * 
 * Naming Convention: "account" instead of "attendee" to match frontend page structure
 * Frontend paths: /account/dashboard, /account/my-conferences, etc.
 * 
 * @created December 5, 2025
 * @see docs/Route-Naming-Convention-Analysis.md
 */

import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";

// Attendee/Account controllers
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
  getNetworkingData,
  getUserSubmissions
} from "../controllers/attendeeControllers";

// Submission Assistance controllers (consent management for authors)
import {
  getMyPendingRequests,
  getMyGrantedConsents,
  respondToRequest,
  grantConsentDirectly,
  revokeConsent,
} from "../controllers/submissionAssistanceController";

// Schedule controllers (for favorites)
import {
  addPresentationToFavorites,
  removePresentationFromFavorites,
  togglePresentationFavorite,
  getUserFavoriteePresentations
} from "../controllers/scheduleControllers";

const router = express.Router();

// All routes require authentication (any role)
const allRoles = ["user", "organizer", "admin"];

/* ============================================================
 * PROFILE
 * ============================================================ */

// GET /api/account/profile - Get current user's profile
router.get("/profile", authMiddleware(allRoles), getAttendeeProfile);

// PUT /api/account/profile - Update current user's profile
router.put("/profile", authMiddleware(allRoles), updateAttendeeProfile);

/* ============================================================
 * DASHBOARD
 * ============================================================ */

// GET /api/account/dashboard - Get dashboard statistics
router.get("/dashboard", authMiddleware(allRoles), getDashboardStats);

// GET /api/account/recent-conferences - Get recently viewed conferences
router.get("/recent-conferences", authMiddleware(allRoles), getRecentConferences);

/* ============================================================
 * MY CONFERENCES (Registrations)
 * ============================================================ */

// GET /api/account/my-conferences - Get conferences user is registered for
router.get("/my-conferences", authMiddleware(allRoles), getRegisteredConferences);

// POST /api/account/register-conference - Register for a conference
router.post("/register-conference", authMiddleware(allRoles), registerForConference);

// DELETE /api/account/unregister-conference/:conferenceId - Cancel registration
router.delete("/unregister-conference/:conferenceId", authMiddleware(allRoles), cancelConferenceRegistration);

/* ============================================================
 * MY SUBMISSIONS
 * ============================================================ */

// GET /api/account/my-submissions - Get all submissions by current user
router.get("/my-submissions", authMiddleware(allRoles), getUserSubmissions);

/* ============================================================
 * FAVORITES (Consolidated)
 * 
 * Note: These routes consolidate functionality from:
 * - /api/attendee/favorites (attendeeRoutes.ts)
 * - /favorites/* (favoriteRoutes.ts) 
 * - /api/favorites/presentations (scheduleRoutes.ts)
 * ============================================================ */

// GET /api/account/favorites - Get all favorite presentations
router.get("/favorites", authMiddleware(allRoles), getFavoritesPresentations);

// POST /api/account/favorites/status - Check multiple favorites status
router.post("/favorites/status", authMiddleware(allRoles), getFavoriteStatusBulk);

// GET /api/account/favorites/presentations - Alternative endpoint for favorites list
router.get("/favorites/presentations", authMiddleware(allRoles), getUserFavoriteePresentations);

// POST /api/account/favorites/presentations/:id - Add presentation to favorites
router.post("/favorites/presentations/:id", authMiddleware(allRoles), addPresentationToFavorites);

// PATCH /api/account/favorites/presentations/:id - Toggle presentation favorite status
router.patch("/favorites/presentations/:id", authMiddleware(allRoles), togglePresentationFavorite);

// DELETE /api/account/favorites/presentations/:id - Remove presentation from favorites
router.delete("/favorites/presentations/:id", authMiddleware(allRoles), removePresentationFromFavorites);

/* ============================================================
 * NETWORKING
 * ============================================================ */

// GET /api/account/networking - Get networking data
router.get("/networking", authMiddleware(allRoles), getNetworkingData);

/* ============================================================
 * SUBMISSION ASSISTANCE (Consent Management for Authors)
 * 
 * Authors can:
 * - View pending assistance requests from organizers
 * - Approve/deny requests (creates consent if approved)
 * - Grant consent directly without a request
 * - Revoke previously granted consent
 * ============================================================ */

// GET /api/account/assistance/requests - Get pending assistance requests
router.get("/assistance/requests", authMiddleware(allRoles), getMyPendingRequests);

// GET /api/account/assistance/consents - Get granted consents
router.get("/assistance/consents", authMiddleware(allRoles), getMyGrantedConsents);

// POST /api/account/assistance/requests/:requestId/respond - Approve/deny request
router.post("/assistance/requests/:requestId/respond", authMiddleware(allRoles), respondToRequest);

// POST /api/account/assistance/consents - Grant consent directly
router.post("/assistance/consents", authMiddleware(allRoles), grantConsentDirectly);

// DELETE /api/account/assistance/consents/:consentId - Revoke consent
router.delete("/assistance/consents/:consentId", authMiddleware(allRoles), revokeConsent);

export default router;
