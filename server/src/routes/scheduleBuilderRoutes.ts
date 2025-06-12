// import express from "express";
// import {
//   getUnassignedPresentations,
//   getScheduleOverview,
//   assignPresentationToSlot,
//   unassignPresentation,
//   bulkAssignPresentations,
//   getAssignmentSuggestions
// } from "../controllers/scheduleBuilderControllers";
// import { authMiddleware } from "../middleware/authMiddleware";

// const router = express.Router();

// // Schedule Builder APIs
// router.get("/conferences/:conferenceId/presentations/unassigned", authMiddleware(["organizer", "admin"]), getUnassignedPresentations);
// router.get("/conferences/:conferenceId/schedule-overview", authMiddleware(["organizer", "admin"]), getScheduleOverview);
// router.get("/conferences/:conferenceId/assignment-suggestions", authMiddleware(["organizer", "admin"]), getAssignmentSuggestions);

// // Assignment Operations
// router.post("/presentations/:id/assign-to-slot", authMiddleware(["organizer", "admin"]), assignPresentationToSlot);
// router.delete("/presentations/:id/unassign", authMiddleware(["organizer", "admin"]), unassignPresentation);

// // Bulk Operations
// router.post("/sections/:sectionId/presentations/bulk-assign", authMiddleware(["organizer", "admin"]), bulkAssignPresentations);

// export default router;