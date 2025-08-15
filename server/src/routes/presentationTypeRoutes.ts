import express from "express";
import {
  getConferencePresentationTypes,
  createPresentationType,
  updatePresentationType,
  reassignPresentationType,
  deletePresentationType
} from "../controllers/presentationTypeControllers";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// UPDATED: Change from /events/ to /conferences/
router.get("/conferences/:id/presentation-types", authMiddleware(["organizer", "admin"]), getConferencePresentationTypes);
router.post("/conferences/:id/presentation-types", authMiddleware(["organizer", "admin"]), createPresentationType);
router.post("/presentation-types/:id/reassign", authMiddleware(["organizer", "admin"]), reassignPresentationType);
router.put("/presentation-types/:id", authMiddleware(["organizer", "admin"]), updatePresentationType);
router.delete("/presentation-types/:id", authMiddleware(["organizer", "admin"]), deletePresentationType);

export default router;