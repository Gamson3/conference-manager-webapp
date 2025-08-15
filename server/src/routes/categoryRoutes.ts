import express from "express";
import {
  getConferenceCategories,
  createCategory,
  updateCategory,
  reassignCategoryPresentations,
  deleteCategory
} from "../controllers/categoryControllers";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// UPDATED: Change from /events/ to /conferences/
router.get("/conferences/:id/categories", authMiddleware(["organizer", "admin"]), getConferenceCategories);
router.post("/conferences/:id/categories", authMiddleware(["organizer", "admin"]), createCategory);
router.post("/categories/:id/reassign", authMiddleware(["organizer", "admin"]), reassignCategoryPresentations);
router.put("/categories/:id", authMiddleware(["organizer", "admin"]), updateCategory);
router.delete("/categories/:id", authMiddleware(["organizer", "admin"]), deleteCategory);

export default router;