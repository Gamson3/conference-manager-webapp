import express from "express";
import { getPublicConferences, getConferenceDetails, getFeaturedConferences, getConferenceCategories } from "../controllers/conferenceControllers";
import { optionalAuthMiddleware } from "../middleware/optionalAuthMiddleware";

const router = express.Router();

// Public routes (no auth required)
router.get("/", getPublicConferences);
router.get("/featured", getFeaturedConferences);
router.get("/categories", getConferenceCategories);

// Routes with optional authentication
router.get("/:id", optionalAuthMiddleware, getConferenceDetails);

export default router;