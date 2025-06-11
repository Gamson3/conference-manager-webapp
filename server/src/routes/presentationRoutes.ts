import express from "express";
import {
  getSessionPresentations,
  createPresentation,
  updatePresentation,
  deletePresentation,
  reorderPresentations,
  assignAuthorsToPresentation
} from "../controllers/presentationControllers";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// Session presentations
router.get("/sections/:sessionId/presentations", authMiddleware(["organizer", "admin"]), getSessionPresentations);
router.post("/sections/:sessionId/presentations/reorder", authMiddleware(["organizer", "admin"]), reorderPresentations);

// Individual presentation CRUD  
router.post("/presentations", authMiddleware(["organizer", "admin"]), createPresentation);
router.put("/presentations/:id", authMiddleware(["organizer", "admin"]), updatePresentation);
router.delete("/presentations/:id", authMiddleware(["organizer", "admin"]), deletePresentation);

// Author management
router.post("/presentations/:id/authors", authMiddleware(["organizer", "admin"]), assignAuthorsToPresentation);

export default router;