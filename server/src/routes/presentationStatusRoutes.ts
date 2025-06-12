// import express from "express";
// import {
//   getPresentationsByStatus,
//   updatePresentationStatus,
//   bulkUpdatePresentationStatus
// } from "../controllers/presentationStatusControllers";
// import { authMiddleware } from "../middleware/authMiddleware";

// const router = express.Router();

// // Presentation Status Management
// router.get("/conferences/:conferenceId/presentations/by-status", authMiddleware(["organizer", "admin"]), getPresentationsByStatus);
// router.put("/presentations/:id/status", authMiddleware(["organizer", "admin"]), updatePresentationStatus);
// router.post("/presentations/bulk-status-update", authMiddleware(["organizer", "admin"]), bulkUpdatePresentationStatus);

// export default router;