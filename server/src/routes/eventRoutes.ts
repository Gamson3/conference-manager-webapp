import express from "express";
import {
  getEventsByOrganizer,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventById,
} from "../controllers/eventControllers";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/", authMiddleware(["organizer", "admin"]), getEventsByOrganizer);
router.get("/:id", authMiddleware(["organizer", "admin"]), getEventById);
router.post("/", authMiddleware(["organizer", "admin"]), createEvent);
router.put("/:id", authMiddleware(["organizer", "admin"]), updateEvent);
router.delete("/:id", authMiddleware(["organizer", "admin"]), deleteEvent);

export default router;