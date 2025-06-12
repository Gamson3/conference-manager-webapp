import express from "express";
import {
  getConferenceCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from "../controllers/categoryControllers";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// Category routes
router.get("/conferences/:id/categories", authMiddleware(["organizer", "admin"]), getConferenceCategories);
router.post("/conferences/:id/categories", authMiddleware(["organizer", "admin"]), createCategory);
router.put("/categories/:id", authMiddleware(["organizer", "admin"]), updateCategory);
router.delete("/categories/:id", authMiddleware(["organizer", "admin"]), deleteCategory);

export default router;