import express from "express";
import { 
  getUserFavoriteConferences,
  getUserFavoritePresentations,
  togglePresentationFavorite,
  toggleConferenceFavorite
} from "../controllers/favoriteControllers";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// User favorites - conferences
router.get("/conferences", authMiddleware(["attendee", "organizer", "admin"]), getUserFavoriteConferences);
router.post("/conferences/:conferenceId", authMiddleware(["attendee", "organizer", "admin"]), toggleConferenceFavorite);

// User favorites - presentations
router.get("/presentations", authMiddleware(["attendee", "organizer", "admin"]), getUserFavoritePresentations);
router.post("/presentations/:presentationId", authMiddleware(["attendee", "organizer", "admin"]), togglePresentationFavorite);

export default router;