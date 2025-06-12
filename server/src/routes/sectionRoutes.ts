import express from "express";
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
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// POST /sections - Create section
router.post("/", authMiddleware(["organizer", "admin"]), createSection);

// UPDATED: Add both endpoints for flexibility
router.get("/events/:eventId/sessions", authMiddleware(["organizer", "admin"]), getSectionsByConference);
router.get("/conference/:conferenceId", authMiddleware(["organizer", "admin"]), getSectionsByConference);

// GET /sections/:id - Get section details
router.get("/:id", authMiddleware(["organizer", "admin"]), getSectionById);

// PUT /sections/:id - Update section
router.put("/:id", authMiddleware(["organizer", "admin"]), updateSection);

// DELETE /sections/:id - Delete section
router.delete("/:id", authMiddleware(["organizer", "admin"]), deleteSection);

// POST /sections/:id/presentations/reorder - Reorder presentations in section
router.post("/:id/presentations/reorder", authMiddleware(["organizer", "admin"]), reorderSectionPresentations);

// GET /sections/:id/attendance - Get section attendance
router.get("/:id/attendance", authMiddleware(["organizer", "admin"]), getSectionAttendance);

// GET /sections/:id/summary - Get section summary
router.get("/:id/summary", authMiddleware(["organizer", "admin"]), getSectionSummary);

// PUT /sections/:id/status - Update section status
router.put("/:id/status", authMiddleware(["organizer", "admin"]), updateSectionStatus);

export default router;