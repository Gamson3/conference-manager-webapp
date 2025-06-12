// import express from "express";
// import {
//   getConferencePresenters,
//   createOrFindPresenter,
//   addPresenterConflict,
//   getPresenterConflicts,
//   removePresenterConflict
// } from "../controllers/presenterControllers";
// import {
//   checkPresentationConflicts,
//   assignPresentationWithConflictCheck,
//   getConferenceConflictSummary
// } from "../controllers/conflictDetectionControllers";
// import { authMiddleware } from "../middleware/authMiddleware";

// const router = express.Router();

// // Presenter management
// router.get("/conferences/:conferenceId/presenters", authMiddleware(["organizer", "admin"]), getConferencePresenters);
// router.post("/presenters", authMiddleware(["organizer", "admin"]), createOrFindPresenter);
// router.post("/presenters/:id/conflicts", authMiddleware(["organizer", "admin"]), addPresenterConflict);
// router.get("/presenters/:id/conflicts", authMiddleware(["organizer", "admin"]), getPresenterConflicts);
// router.delete("/presenter-conflicts/:id", authMiddleware(["organizer", "admin"]), removePresenterConflict);

// // Conflict detection
// router.post("/presentations/:id/check-conflicts", authMiddleware(["organizer", "admin"]), checkPresentationConflicts);
// router.post("/presentations/:id/assign-with-conflict-check", authMiddleware(["organizer", "admin"]), assignPresentationWithConflictCheck);
// router.get("/conferences/:conferenceId/conflicts/summary", authMiddleware(["organizer", "admin"]), getConferenceConflictSummary);

// export default router;