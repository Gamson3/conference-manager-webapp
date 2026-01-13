/**
 * ORGANIZER ROUTES
 * /api/organizer/* - Routes for conference organizers and admins
 * 
 * These routes handle all conference management functionality:
 * - Conference CRUD
 * - Setup (categories, types, requirements, milestones)
 * - Submissions/Abstracts
 * - Registration
 * - Program (days, sessions, presentations, schedule)
 * - Website (materials, visibility, public page)
 * - People (participants, speakers)
 * 
 * Naming Convention: "organizer" prefix to clearly identify organizer-only routes
 * Frontend paths: /organizer/conferences/*
 * 
 * Note: This file consolidates routes from:
 * - eventRoutes.ts (DEPRECATED)
 * - conferenceSetupRoutes.ts
 * - daysRoutes.ts
 * - sectionRoutes.ts
 * - presentationRoutes.ts
 * - submissionsRoutes.ts (organizer-only parts)
 * - registrationRoutes.ts (organizer-only parts)
 * - websiteRoutes.ts (organizer-only parts)
 * - participantsRoutes.ts (organizer-only parts)
 * 
 * @created December 5, 2025
 * @see docs/Route-Naming-Convention-Analysis.md
 */

import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  validateConferenceDatesForCreate,
  validateConferenceDatesForUpdate,
} from "../middleware/validateConferenceDates";

// Event/Conference Controllers (legacy name, will be renamed in Phase 4)
import {
  createEvent,
  getEventsByOrganizer,
  getEventById,
  updateEvent,
  updateEventDraft,
  deleteEvent,
  saveEventDraft,
  updateEventStatus,
  getEventMaterials,
  getEventAttendees,
  getEventFeedback,
  getConferenceSubmissions,
  validateConferenceForPublishing,
  publishConference,
  unpublishConference,
} from "../controllers/eventControllers";

// Conference Controllers
import { 
  createConference,
  getMyConferences,
  getPublicConferenceDetails
} from "../controllers/conferenceControllers";

// Setup Controllers (categories, types, requirements, milestones, windows)
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getTypes,
  createType,
  updateType,
  deleteType,
  getRequirements,
  upsertRequirements,
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  openCfpWindow,
  closeCfpWindow,
  openRegistrationWindow,
  closeRegistrationWindow,
  publishSchedule as setupPublishSchedule,
  unpublishSchedule as setupUnpublishSchedule,
} from "../controllers/conferenceSetupControllers";

// Days/Program Controllers
import {
  listDays,
  getDay,
  createDay,
  updateDay,
  deleteDay,
  reorderDays,
  getProgramStats,
} from "../controllers/daysController";

// Section (Session) Controllers
import {
  getSectionsByConference,
  createSection,
  getSectionById,
  updateSection,
  deleteSection,
  getSectionAttendance,
  reorderSectionPresentations,
  getSectionSummary,
  updateSectionStatus
} from "../controllers/sectionControllers";

// Presentation Controllers
import {
  getSessionPresentations,
  createPresentation,
  updatePresentation,
  deletePresentation,
  reorderPresentations,
  assignAuthorsToPresentation,
  assignPresentationToSection
} from "../controllers/presentationControllers";

// Schedule Controllers (organizer management)
import {
  getConferenceSchedule,
  getConferencePresentations,
  validateSchedule,
  saveSchedule,
  publishSchedule,
  unpublishSchedule,
  getAcceptedPresentationsForConference,
  getConferenceSpeakers,
} from "../controllers/scheduleControllers";

// Submissions Controllers
import {
  createSubmission,
  updateSubmission,
  submitSubmission,
  withdrawSubmission,
  listConferenceSubmissions,
  reviewSubmission,
  startSubmissionReview,
  decideSubmission,
  requestSubmissionRevision,
  exportConferenceSubmissions,
  organizerOverrideSubmissionEdit,
} from "../controllers/submissionsController";

// Registration Controllers
import {
  getRegistrationSettings,
  updateRegistrationSettings,
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  updateParticipant,
  removeParticipant,
  approveParticipant,
  getRegistrationOverview,
  exportParticipants,
} from "../controllers/registrationControllers";

// Website Controllers
import {
  listMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getVisibilitySettings,
  updateVisibilitySettings,
  getPublicPageContent,
  updatePublicPageContent,
  getOrganizerCfpContent,
  updateOrganizerCfpContent,
} from "../controllers/websiteControllers";

// Participants Controllers
import {
  listParticipants,
  getParticipantStats,
} from "../controllers/participantsController";

// Impersonation Controllers
import {
  impersonateAuthor,
  endImpersonation,
} from "../controllers/organizerImpersonationController";

// Submission Assistance Controllers (consent management for organizers)
import {
  checkConsentStatus,
  requestConsent,
  listAuthorsWithConsentStatus,
} from "../controllers/submissionAssistanceController";

// Organizer Home dashboard stats (single optimized endpoint)
import {
  getOrganizerConferenceDashboardStats,
} from "../controllers/organizerDashboardController";

const router = express.Router();

// All routes require organizer or admin role
const organizerGuard = authMiddleware(["organizer", "admin"]);

// Special guard for conference creation: allows base users (will be upgraded atomically)
const createConferenceGuard = authMiddleware(["user", "organizer", "admin"]);

// GET /api/organizer/conferences/:id/dashboard/stats - Optimized dashboard stats for organizer Home
router.get(
  "/conferences/:id/dashboard/stats",
  organizerGuard,
  getOrganizerConferenceDashboardStats
);

/* ============================================================
 * CONFERENCE CRUD
 * ============================================================ */

// GET /api/organizer/conferences - List organizer's conferences
router.get("/conferences", organizerGuard, getEventsByOrganizer);

// POST /api/organizer/conferences - Create new conference (atomic upgrade for base users)
router.post("/conferences", createConferenceGuard, validateConferenceDatesForCreate, createEvent);

// GET /api/organizer/conferences/:id - Get conference details (owner view)
router.get("/conferences/:id", organizerGuard, getEventById);

// PUT /api/organizer/conferences/:id - Update conference
router.put("/conferences/:id", organizerGuard, validateConferenceDatesForUpdate, updateEvent);

// DELETE /api/organizer/conferences/:id - Delete conference
router.delete("/conferences/:id", organizerGuard, deleteEvent);

// POST /api/organizer/conferences/drafts - Save as draft
router.post("/conferences/drafts", organizerGuard, saveEventDraft);

// PUT /api/organizer/conferences/:id/draft - Update draft
router.put("/conferences/:id/draft", organizerGuard, updateEventDraft);

// PUT /api/organizer/conferences/:id/status - Update status
router.put("/conferences/:id/status", organizerGuard, updateEventStatus);

/* ============================================================
 * PUBLISHING
 * ============================================================ */

// GET /api/organizer/conferences/:id/publish-validation - Validate for publishing
router.get("/conferences/:id/publish-validation", organizerGuard, validateConferenceForPublishing);

// POST /api/organizer/conferences/:id/publish - Publish conference
router.post("/conferences/:id/publish", organizerGuard, publishConference);

// POST /api/organizer/conferences/:id/unpublish - Unpublish conference
router.post("/conferences/:id/unpublish", organizerGuard, unpublishConference);

/* ============================================================
 * SETUP - Categories
 * ============================================================ */

// GET /api/organizer/conferences/:id/categories - List categories
router.get("/conferences/:conferenceId/categories", organizerGuard, getCategories);

// POST /api/organizer/conferences/:id/categories - Create category
router.post("/conferences/:conferenceId/categories", organizerGuard, createCategory);

// PUT /api/organizer/conferences/:id/categories/:categoryId - Update category
router.put("/conferences/:conferenceId/categories/:categoryId", organizerGuard, updateCategory);

// DELETE /api/organizer/conferences/:id/categories/:categoryId - Delete category
router.delete("/conferences/:conferenceId/categories/:categoryId", organizerGuard, deleteCategory);

/* ============================================================
 * SETUP - Presentation Types
 * ============================================================ */

// GET /api/organizer/conferences/:id/types - List types
router.get("/conferences/:conferenceId/types", organizerGuard, getTypes);

// POST /api/organizer/conferences/:id/types - Create type
router.post("/conferences/:conferenceId/types", organizerGuard, createType);

// PUT /api/organizer/conferences/:id/types/:typeId - Update type
router.put("/conferences/:conferenceId/types/:typeId", organizerGuard, updateType);

// DELETE /api/organizer/conferences/:id/types/:typeId - Delete type
router.delete("/conferences/:conferenceId/types/:typeId", organizerGuard, deleteType);

/* ============================================================
 * SETUP - Requirements
 * ============================================================ */

// GET /api/organizer/conferences/:id/requirements - Get requirements
router.get("/conferences/:conferenceId/requirements", organizerGuard, getRequirements);

// PUT /api/organizer/conferences/:id/requirements - Update requirements
router.put("/conferences/:conferenceId/requirements", organizerGuard, upsertRequirements);

/* ============================================================
 * SETUP - Milestones
 * ============================================================ */

// GET /api/organizer/conferences/:id/milestones - List milestones
router.get("/conferences/:conferenceId/milestones", organizerGuard, getMilestones);

// POST /api/organizer/conferences/:id/milestones - Create milestone
router.post("/conferences/:conferenceId/milestones", organizerGuard, createMilestone);

// PUT /api/organizer/conferences/:id/milestones/:milestoneId - Update milestone
router.put("/conferences/:conferenceId/milestones/:milestoneId", organizerGuard, updateMilestone);

// DELETE /api/organizer/conferences/:id/milestones/:milestoneId - Delete milestone
router.delete("/conferences/:conferenceId/milestones/:milestoneId", organizerGuard, deleteMilestone);

/* ============================================================
 * SETUP - Windows (CFP, Registration)
 * ============================================================ */

// PATCH /api/organizer/conferences/:id/windows/cfp/open - Open CFP window
router.patch("/conferences/:conferenceId/windows/cfp/open", organizerGuard, openCfpWindow);

// PATCH /api/organizer/conferences/:id/windows/cfp/close - Close CFP window
router.patch("/conferences/:conferenceId/windows/cfp/close", organizerGuard, closeCfpWindow);

// PATCH /api/organizer/conferences/:id/windows/registration/open - Open registration
router.patch("/conferences/:conferenceId/windows/registration/open", organizerGuard, openRegistrationWindow);

// PATCH /api/organizer/conferences/:id/windows/registration/close - Close registration
router.patch("/conferences/:conferenceId/windows/registration/close", organizerGuard, closeRegistrationWindow);

/* ============================================================
 * SUBMISSIONS / ABSTRACTS
 * ============================================================ */

// GET /api/organizer/conferences/:id/submissions - List all submissions
router.get("/conferences/:id/submissions", organizerGuard, listConferenceSubmissions);

// GET /api/organizer/conferences/:id/submissions/export - Export submissions
router.get("/conferences/:id/submissions/export", organizerGuard, exportConferenceSubmissions);

// POST /api/organizer/submissions/:submissionId/review - Review submission
router.post("/submissions/:submissionId/review", organizerGuard, reviewSubmission);

// POST /api/organizer/submissions/:submissionId/start-review - Move submitted -> under_review
router.post("/submissions/:submissionId/start-review", organizerGuard, startSubmissionReview);

// POST /api/organizer/submissions/:submissionId/decision - Make decision on submission
router.post("/submissions/:submissionId/decision", organizerGuard, decideSubmission);

// POST /api/organizer/submissions/:submissionId/request-revision - Request revisions from author
router.post("/submissions/:submissionId/request-revision", organizerGuard, requestSubmissionRevision);

// POST /api/organizer/submissions/:submissionId/override-edit - Organizer override locked submission (Phase 1.2.5)
router.post("/submissions/:submissionId/override-edit", organizerGuard, organizerOverrideSubmissionEdit);

/* ============================================================
 * REGISTRATION
 * ============================================================ */

// GET /api/organizer/conferences/:id/registration/settings - Get settings
router.get("/conferences/:id/registration/settings", organizerGuard, getRegistrationSettings);

// PUT /api/organizer/conferences/:id/registration/settings - Update settings
router.put(
  "/conferences/:id/registration/settings",
  organizerGuard,
  validateConferenceDatesForUpdate,
  updateRegistrationSettings
);

// GET /api/organizer/conferences/:id/registration/overview - Overview stats
router.get("/conferences/:id/registration/overview", organizerGuard, getRegistrationOverview);

// Questions CRUD
router.get("/conferences/:id/registration/questions", organizerGuard, listQuestions);
router.post("/conferences/:id/registration/questions", organizerGuard, createQuestion);
router.put("/conferences/:id/registration/questions/:questionId", organizerGuard, updateQuestion);
router.delete("/conferences/:id/registration/questions/:questionId", organizerGuard, deleteQuestion);
router.post("/conferences/:id/registration/questions/reorder", organizerGuard, reorderQuestions);

/* ============================================================
 * PROGRAM - Days
 * ============================================================ */

// GET /api/organizer/conferences/:id/program/stats - Program statistics
router.get("/conferences/:id/program/stats", organizerGuard, getProgramStats);

// GET /api/organizer/conferences/:id/days - List days
router.get("/conferences/:id/days", organizerGuard, listDays);

// GET /api/organizer/conferences/:id/days/:dayId - Get day details
router.get("/conferences/:id/days/:dayId", organizerGuard, getDay);

// POST /api/organizer/conferences/:id/days - Create day
router.post("/conferences/:id/days", organizerGuard, createDay);

// PUT /api/organizer/conferences/:id/days/:dayId - Update day
router.put("/conferences/:id/days/:dayId", organizerGuard, updateDay);

// DELETE /api/organizer/conferences/:id/days/:dayId - Delete day
router.delete("/conferences/:id/days/:dayId", organizerGuard, deleteDay);

// POST /api/organizer/conferences/:id/days/reorder - Reorder days
router.post("/conferences/:id/days/reorder", organizerGuard, reorderDays);

/* ============================================================
 * PROGRAM - Sessions (Sections)
 * Note: Using "sessions" in routes but "Section" model in Prisma
 * ============================================================ */

// GET /api/organizer/conferences/:id/sessions - List sessions
router.get("/conferences/:conferenceId/sessions", organizerGuard, getSectionsByConference);

// POST /api/organizer/sessions - Create session
router.post("/sessions", organizerGuard, createSection);

// GET /api/organizer/sessions/:id - Get session details
router.get("/sessions/:id", organizerGuard, getSectionById);

// PUT /api/organizer/sessions/:id - Update session
router.put("/sessions/:id", organizerGuard, updateSection);

// DELETE /api/organizer/sessions/:id - Delete session
router.delete("/sessions/:id", organizerGuard, deleteSection);

// GET /api/organizer/sessions/:id/summary - Get session summary
router.get("/sessions/:id/summary", organizerGuard, getSectionSummary);

// PUT /api/organizer/sessions/:id/status - Update session status
router.put("/sessions/:id/status", organizerGuard, updateSectionStatus);

// GET /api/organizer/sessions/:id/attendance - Get attendance
router.get("/sessions/:id/attendance", organizerGuard, getSectionAttendance);

// POST /api/organizer/sessions/:id/presentations/reorder - Reorder presentations
router.post("/sessions/:id/presentations/reorder", organizerGuard, reorderSectionPresentations);

/* ============================================================
 * PROGRAM - Presentations
 * ============================================================ */

// GET /api/organizer/sessions/:id/presentations - List session presentations
router.get("/sessions/:id/presentations", organizerGuard, getSessionPresentations);

// POST /api/organizer/presentations - Create presentation
router.post("/presentations", organizerGuard, createPresentation);

// PUT /api/organizer/presentations/:id - Update presentation
router.put("/presentations/:id", organizerGuard, updatePresentation);

// DELETE /api/organizer/presentations/:id - Delete presentation
router.delete("/presentations/:id", organizerGuard, deletePresentation);

// POST /api/organizer/presentations/:id/authors - Assign authors
router.post("/presentations/:id/authors", organizerGuard, assignAuthorsToPresentation);

// POST /api/organizer/presentations/:id/assign-section - Move to section
router.post("/presentations/:id/assign-session", organizerGuard, assignPresentationToSection);

// GET /api/organizer/conferences/:id/presentations - All conference presentations
router.get("/conferences/:id/presentations", organizerGuard, getConferencePresentations);

// GET /api/organizer/conferences/:id/accepted-presentations - Accepted presentations
router.get("/conferences/:id/accepted-presentations", organizerGuard, getAcceptedPresentationsForConference);

// GET /api/organizer/conferences/:id/speakers - Conference speakers
router.get("/conferences/:id/speakers", organizerGuard, getConferenceSpeakers);

/* ============================================================
 * PROGRAM - Schedule
 * ============================================================ */

// GET /api/organizer/conferences/:id/schedule - Get schedule
router.get("/conferences/:id/schedule", organizerGuard, getConferenceSchedule);

// PUT /api/organizer/conferences/:id/schedule - Save schedule
router.put("/conferences/:id/schedule", organizerGuard, saveSchedule);

// POST /api/organizer/conferences/:id/schedule/validate - Validate schedule
router.post("/conferences/:id/schedule/validate", organizerGuard, validateSchedule);

// POST /api/organizer/conferences/:id/schedule/publish - Publish schedule
router.post("/conferences/:id/schedule/publish", organizerGuard, publishSchedule);

// POST /api/organizer/conferences/:id/schedule/unpublish - Unpublish schedule
router.post("/conferences/:id/schedule/unpublish", organizerGuard, unpublishSchedule);

// PATCH routes for setup-style toggles (alternative endpoints)
router.patch("/conferences/:conferenceId/schedule/publish", organizerGuard, setupPublishSchedule);
router.patch("/conferences/:conferenceId/schedule/unpublish", organizerGuard, setupUnpublishSchedule);

/* ============================================================
 * WEBSITE - Materials
 * ============================================================ */

// GET /api/organizer/conferences/:id/materials - List all materials
router.get("/conferences/:id/materials", organizerGuard, listMaterials);

// POST /api/organizer/conferences/:id/materials - Create material
router.post("/conferences/:id/materials", organizerGuard, createMaterial);

// PUT /api/organizer/conferences/:id/materials/:materialId - Update material
router.put("/conferences/:id/materials/:materialId", organizerGuard, updateMaterial);

// DELETE /api/organizer/conferences/:id/materials/:materialId - Delete material
router.delete("/conferences/:id/materials/:materialId", organizerGuard, deleteMaterial);

/* ============================================================
 * WEBSITE - Visibility & Public Page
 * ============================================================ */

// GET /api/organizer/conferences/:id/visibility - Get visibility settings
router.get("/conferences/:id/visibility", organizerGuard, getVisibilitySettings);

// PUT /api/organizer/conferences/:id/visibility - Update visibility
router.put("/conferences/:id/visibility", organizerGuard, updateVisibilitySettings);

// GET /api/organizer/conferences/:id/website/cfp - Get CFP content
router.get("/conferences/:id/website/cfp", organizerGuard, getOrganizerCfpContent);

// PUT /api/organizer/conferences/:id/website/cfp - Replace CFP content
router.put("/conferences/:id/website/cfp", organizerGuard, updateOrganizerCfpContent);

// GET /api/organizer/conferences/:id/public-page - Get public page content
router.get("/conferences/:id/public-page", organizerGuard, getPublicPageContent);

// PUT /api/organizer/conferences/:id/public-page - Update public page content
router.put("/conferences/:id/public-page", organizerGuard, updatePublicPageContent);

/* ============================================================
 * PEOPLE - Participants
 * ============================================================ */

// GET /api/organizer/conferences/:id/participants - List participants
router.get("/conferences/:id/participants", organizerGuard, listParticipants);

// GET /api/organizer/conferences/:id/participants/stats - Participant stats
router.get("/conferences/:id/participants/stats", organizerGuard, getParticipantStats);

// PUT /api/organizer/conferences/:id/participants/:participantId - Update participant
router.put("/conferences/:id/participants/:participantId", organizerGuard, updateParticipant);

// DELETE /api/organizer/conferences/:id/participants/:participantId - Remove participant
router.delete("/conferences/:id/participants/:participantId", organizerGuard, removeParticipant);

// POST /api/organizer/conferences/:id/participants/:participantId/approve - Approve
router.post("/conferences/:id/participants/:participantId/approve", organizerGuard, approveParticipant);

// POST /api/organizer/conferences/:id/participants/export - Export participants
router.post("/conferences/:id/participants/export", organizerGuard, exportParticipants);

/* ============================================================
 * PEOPLE - Attendees & Feedback (from eventControllers)
 * ============================================================ */

// GET /api/organizer/conferences/:id/attendees - Get attendees
router.get("/conferences/:id/attendees", organizerGuard, getEventAttendees);

// GET /api/organizer/conferences/:id/feedback - Get feedback
router.get("/conferences/:id/feedback", organizerGuard, getEventFeedback);

/* ============================================================
 * IMPERSONATION - Act as another user in your conference
 * ============================================================ */

// POST /api/organizer/conferences/:conferenceId/impersonate/:userId - Start impersonation
router.post("/conferences/:conferenceId/impersonate/:userId", organizerGuard, impersonateAuthor);

// POST /api/organizer/conferences/:conferenceId/impersonate/end - End impersonation
router.post("/conferences/:conferenceId/impersonate/end", organizerGuard, endImpersonation);

/* ============================================================
 * SUBMISSION ASSISTANCE - Help authors with their submissions
 * 
 * Organizers can:
 * - Check if an author has granted consent
 * - Request consent from an author
 * - List all authors with their consent status
 * ============================================================ */

// GET /api/organizer/conferences/:id/assistance/consent/:authorId - Check consent status
router.get("/conferences/:id/assistance/consent/:authorId", organizerGuard, checkConsentStatus);

// POST /api/organizer/conferences/:id/assistance/request/:authorId - Request consent
router.post("/conferences/:id/assistance/request/:authorId", organizerGuard, requestConsent);

// GET /api/organizer/conferences/:id/assistance/authors - List authors with consent status
router.get("/conferences/:id/assistance/authors", organizerGuard, listAuthorsWithConsentStatus);

export default router;
