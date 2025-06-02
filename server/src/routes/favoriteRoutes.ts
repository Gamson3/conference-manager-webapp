import express from "express";
import { getUserFavoriteePresentations } from "../controllers/scheduleControllers";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// User favorites
router.get("/presentations", authMiddleware(["attendee", "organizer", "admin"]), getUserFavoriteePresentations);

export default router;