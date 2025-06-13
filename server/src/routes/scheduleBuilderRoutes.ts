import express from "express";
import {
  getScheduleOverview,
  getUnscheduledPresentations,
  assignPresentationToSection,
  assignPresentationWithTruncation,
  unassignPresentationFromSection,
  publishSchedule,
} from "../controllers/scheduleBuilderControllers";
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Mount to correct paths that frontend expects
router.get("/conferences/:conferenceId",  authMiddleware(["attendee", "organizer", "admin"]), getScheduleOverview);
router.get("/conferences/:conferenceId/presentations/unscheduled", authMiddleware(["attendee", "organizer", "admin"]), getUnscheduledPresentations);
router.post("/presentations/:id/assign-section", authMiddleware(["attendee", "organizer", "admin"]), assignPresentationToSection);
router.post("/presentations/:id/assign-section/confirm", authMiddleware(["attendee", "organizer", "admin"]), assignPresentationWithTruncation);
router.delete("/presentations/:id/unassign-section", authMiddleware(["attendee", "organizer", "admin"]), unassignPresentationFromSection);
router.post('/conferences/:conferenceId/publish', authMiddleware(["attendee", "organizer", "admin"]), publishSchedule);

export default router;