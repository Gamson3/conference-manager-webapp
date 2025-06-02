import express from "express";
import { globalSearch, searchWithTreeContext, getPresentationLocation } from "../controllers/searchControllers";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// Global search route
router.get("/global", authMiddleware(["attendee", "organizer", "admin"]), globalSearch);
router.get("/:id/search/tree", authMiddleware(["attendee", "organizer", "admin"]), searchWithTreeContext);
router.get("/presentations/:id/location", authMiddleware(["attendee", "organizer", "admin"]), getPresentationLocation);

export default router;