// import express from "express";
// import {
//   getSectionTimeSlots,
//   generateTimeSlots,
//   assignPresentationToTimeSlot,
//   unassignPresentationFromTimeSlot
// } from "../controllers/timeSlotControllers";
// import { authMiddleware } from "../middleware/authMiddleware";

// const router = express.Router();

// // Time slot management
// router.get("/sections/:sectionId/time-slots", authMiddleware(["organizer", "admin"]), getSectionTimeSlots);
// router.post("/sections/:sectionId/time-slots/generate", authMiddleware(["organizer", "admin"]), generateTimeSlots);
// router.post("/time-slots/:id/assign", authMiddleware(["organizer", "admin"]), assignPresentationToTimeSlot);
// router.delete("/time-slots/:id/unassign", authMiddleware(["organizer", "admin"]), unassignPresentationFromTimeSlot);

// export default router;