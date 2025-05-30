import express from "express";
import {
  getSectionsByConference,
  createSection,
  getSectionById,
  updateSection,
  deleteSection,
  getSectionPresentations,
  getSectionAttendance
} from "../controllers/sectionControllers";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// POST /sections - Create section
router.post("/", authMiddleware(["organizer", "admin"]), createSection);

// GET /sections/conference/:conferenceId - List sections by conference
router.get("/conference/:conferenceId", authMiddleware(["organizer", "admin"]), getSectionsByConference);

// GET /sections/:id - Get section details
router.get("/:id", authMiddleware(["organizer", "admin"]), getSectionById);

// PUT /sections/:id - Update section
router.put("/:id", authMiddleware(["organizer", "admin"]), updateSection);

// DELETE /sections/:id - Delete section
router.delete("/:id", authMiddleware(["organizer", "admin"]), deleteSection);

// GET /sections/:id/presentations - Get presentations in section
router.get("/:id/presentations", authMiddleware(["organizer", "admin"]), getSectionPresentations);

// GET /sections/:id/attendance - Get section attendance
router.get("/:id/attendance", authMiddleware(["organizer", "admin"]), getSectionAttendance);

export default router;