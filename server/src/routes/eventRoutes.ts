import express from "express";
import {
  getEventsByOrganizer,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventById,
  saveEventDraft,
  getAllEvents,
  updateEventStatus,
  getEventMaterials,
  getEventAttendees,
  getEventFeedback,
  getEventAbstracts,
  publishEvent,
} from "../controllers/eventControllers";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// Existing routes
router.get("/", authMiddleware(["organizer", "admin"]), getEventsByOrganizer); 
router.get("/:id", authMiddleware(["organizer", "admin"]), getEventById);
router.post("/", authMiddleware(["organizer", "admin"]), createEvent);
router.post("/drafts", authMiddleware(["organizer", "admin"]), saveEventDraft);
router.put("/:id", authMiddleware(["organizer", "admin"]), updateEvent);
router.delete("/:id", authMiddleware(["organizer", "admin"]), deleteEvent);

// New routes
// router.get("/", authMiddleware(["organizer", "admin"]), getAllEvents); // Get all conferences
router.put("/:id/status", authMiddleware(["organizer", "admin"]), updateEventStatus);
router.get("/:id/materials", authMiddleware(["organizer", "admin"]), getEventMaterials);
router.get("/:id/attendees", authMiddleware(["organizer", "admin"]), getEventAttendees);
router.get("/:id/feedback", authMiddleware(["organizer", "admin"]), getEventFeedback);
router.get("/:id/abstracts", authMiddleware(["organizer", "admin"]), getEventAbstracts);
router.post("/:id/publish", authMiddleware(["organizer", "admin"]), publishEvent);

export default router;