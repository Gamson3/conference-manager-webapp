import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import uploadMiddleware from "../middleware/uploadMiddleware";
import {
  getPresenterPresentations,
  getPresenterPresentation,
  createPresenterSubmission,
  updatePresenterPresentation,
  deletePresenterPresentation,
  getConferencesAcceptingSubmissions,
  uploadMaterial,
  getPresenterMaterials,
  deleteMaterial
} from "../controllers/presenterControllers";

const router = express.Router();

// Presentation routes
router.get("/presentations", authMiddleware(["presenter", "attendee"]), getPresenterPresentations);
router.get("/presentations/:id", authMiddleware(["presenter", "attendee"]), getPresenterPresentation);
router.post("/submissions", authMiddleware(["presenter", "attendee"]), createPresenterSubmission);
router.put("/presentations/:id", authMiddleware(["presenter", "attendee"]), updatePresenterPresentation);
router.delete("/presentations/:id", authMiddleware(["presenter", "attendee"]), deletePresenterPresentation);

// Conference routes for submission
router.get("/conferences-accepting-submissions", authMiddleware(["presenter", "attendee"]), getConferencesAcceptingSubmissions);

// Material routes
router.get("/materials", authMiddleware(["presenter", "attendee"]), getPresenterMaterials);
router.post("/materials", authMiddleware(["presenter", "attendee"]), uploadMiddleware.single("file"), uploadMaterial);
router.delete("/materials/:id", authMiddleware(["presenter", "attendee"]), deleteMaterial);

export default router;