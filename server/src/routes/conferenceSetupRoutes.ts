import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  // Categories
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  // Types
  getTypes,
  createType,
  updateType,
  deleteType,
  // Requirements
  getRequirements,
  upsertRequirements,
  // Milestones
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  // Windows quick actions
  openCfpWindow,
  closeCfpWindow,
  openRegistrationWindow,
  closeRegistrationWindow,
  // Schedule publish toggles
  publishSchedule,
  unpublishSchedule,
} from "../controllers/conferenceSetupControllers";

const router = express.Router();

// All routes here require organizer or admin
const guard = authMiddleware(["organizer", "admin"]);

// Categories
router.get("/conferences/:conferenceId/categories", guard, getCategories);
router.post("/conferences/:conferenceId/categories", guard, createCategory);
router.put("/conferences/:conferenceId/categories/:categoryId", guard, updateCategory);
router.delete("/conferences/:conferenceId/categories/:categoryId", guard, deleteCategory);

// Presentation Types
router.get("/conferences/:conferenceId/types", guard, getTypes);
router.post("/conferences/:conferenceId/types", guard, createType);
router.put("/conferences/:conferenceId/types/:typeId", guard, updateType);
router.delete("/conferences/:conferenceId/types/:typeId", guard, deleteType);

// Submission Requirements (single row per conference) - treat as upsert
router.get("/conferences/:conferenceId/requirements", guard, getRequirements);
router.put("/conferences/:conferenceId/requirements", guard, upsertRequirements);

// Timeline Milestones
router.get("/conferences/:conferenceId/milestones", guard, getMilestones);
router.post("/conferences/:conferenceId/milestones", guard, createMilestone);
router.put("/conferences/:conferenceId/milestones/:milestoneId", guard, updateMilestone);
router.delete("/conferences/:conferenceId/milestones/:milestoneId", guard, deleteMilestone);

// CFP & Registration windows (quick open/close)
router.patch("/conferences/:conferenceId/windows/cfp/open", guard, openCfpWindow);
router.patch("/conferences/:conferenceId/windows/cfp/close", guard, closeCfpWindow);
router.patch("/conferences/:conferenceId/windows/registration/open", guard, openRegistrationWindow);
router.patch("/conferences/:conferenceId/windows/registration/close", guard, closeRegistrationWindow);

// Schedule publish/unpublish
router.patch("/conferences/:conferenceId/schedule/publish", guard, publishSchedule);
router.patch("/conferences/:conferenceId/schedule/unpublish", guard, unpublishSchedule);

export default router;
