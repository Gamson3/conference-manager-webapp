import express from "express";
import {
  getConferencePresentationTypes,
  createPresentationType,
  updatePresentationType,
  deletePresentationType
} from "../controllers/presentationTypeControllers";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// Presentation type routes
router.get("/conferences/:id/presentation-types", authMiddleware(["organizer", "admin"]), getConferencePresentationTypes);
router.post("/conferences/:id/presentation-types", authMiddleware(["organizer", "admin"]), createPresentationType);
router.put("/presentation-types/:id", authMiddleware(["organizer", "admin"]), updatePresentationType);
router.delete("/presentation-types/:id", authMiddleware(["organizer", "admin"]), deletePresentationType);

export default router;