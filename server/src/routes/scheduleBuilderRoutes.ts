import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  getScheduleOverview,
  getUnscheduledPresentations,
  assignPresentationToSection,
  unassignPresentationFromSection,
  publishSchedule,
  createBreakSlot,
  updateBreakSlot,
  deleteBreakSlot,
} from "../controllers/scheduleBuilderControllers";

const router = Router();

// Schedule management routes
router.get("/conferences/:conferenceId", authMiddleware(["organizer", "admin"]), getScheduleOverview);
router.get("/conferences/:conferenceId/presentations/unscheduled", authMiddleware(["organizer", "admin"]), getUnscheduledPresentations);
router.post("/presentations/:presentationId/assign-section", authMiddleware(["organizer", "admin"]), assignPresentationToSection);
router.delete("/presentations/:presentationId/unassign-section", authMiddleware(["organizer", "admin"]), unassignPresentationFromSection);
router.post("/conferences/:conferenceId/publish", authMiddleware(["organizer", "admin"]), publishSchedule);

// Break management routes
router.post("/sections/:sectionId/breaks", authMiddleware(["organizer", "admin"]), createBreakSlot);
router.put("/breaks/:id", authMiddleware(["organizer", "admin"]), updateBreakSlot);
router.delete("/breaks/:id", authMiddleware(["organizer", "admin"]), deleteBreakSlot);

export default router;