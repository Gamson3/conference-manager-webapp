// For public-facing routes (that don't require authentication)

import express from "express";
import { 
  getPublicConferences, 
  getPublicConferenceDetails,
  getPublicConferenceMaterials
} from "../controllers/conferenceControllers";

const router = express.Router();

// Public routes (no auth needed)
router.get("/", getPublicConferences);
router.get("/:id", getPublicConferenceDetails);
router.get("/:id/materials", getPublicConferenceMaterials);

export default router;