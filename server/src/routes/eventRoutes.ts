import express from "express";
import {
  createEvent,
  getEventsByOrganizer,
  getEventById,
  updateEvent,
  updateEventDraft,
  deleteEvent,
  saveEventDraft,
  getAllEvents,
  updateEventStatus,
  getEventMaterials,
  getEventAttendees,
  getEventFeedback,
  getConferenceSubmissions,
  validateConferenceForPublishing,
  publishConference,
  unpublishConference,
} from "../controllers/eventControllers";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  validateConferenceDatesForCreate,
  validateConferenceDatesForUpdate,
} from "../middleware/validateConferenceDates";

const router = express.Router();

// ORGANIZER/ADMIN EVENT MANAGEMENT (for organizer dashboard)
router.get("/", authMiddleware(["organizer", "admin"]), getEventsByOrganizer); 
router.get("/:id", authMiddleware(["organizer", "admin"]), getEventById);
// Conference creation supports base users (they may be upgraded as part of creation)
router.post("/", authMiddleware(["user", "organizer", "admin"]), validateConferenceDatesForCreate, createEvent);
router.post("/drafts", authMiddleware(["organizer", "admin"]), saveEventDraft);
router.put("/:id", authMiddleware(["organizer", "admin"]), validateConferenceDatesForUpdate, updateEvent);
router.put("/:id/draft", authMiddleware(["organizer", "admin"]), updateEventDraft);
router.delete("/:id", authMiddleware(["organizer", "admin"]), deleteEvent);

// Event management features
router.put("/:id/status", authMiddleware(["organizer", "admin"]), updateEventStatus);
router.get("/:id/materials", authMiddleware(["organizer", "admin"]), getEventMaterials);
router.get("/:id/attendees", authMiddleware(["organizer", "admin"]), getEventAttendees);
router.get("/:id/feedback", authMiddleware(["organizer", "admin"]), getEventFeedback);
router.get("/:id/submissions", authMiddleware(["organizer", "admin"]), getConferenceSubmissions);
// router.post("/:id/publish", authMiddleware(["organizer", "admin"]), publishEvent);

// Publishing validation and status routes
router.get("/:id/publish-validation", authMiddleware(["organizer", "admin"]), validateConferenceForPublishing);
router.post("/:id/publish", authMiddleware(["organizer", "admin"]), publishConference);
router.post("/:id/unpublish", authMiddleware(["organizer", "admin"]), unpublishConference);

export default router;