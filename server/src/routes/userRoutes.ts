import express from "express";
import {
  getUser,
  getUserByCognitoId,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/userControllers";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// Public: Create user (sign up)
router.post("/", createUser);

// Protected: Get user by DB ID
router.get("/:id", authMiddleware(["admin", "organizer", "attendee"]), getUser);

// Protected: Get user by Cognito ID (for auth session)
router.get("/cognito/:cognitoId", authMiddleware(["admin", "organizer", "attendee"]), getUserByCognitoId);

// Protected: Update user
router.put("/cognito/:cognitoId", authMiddleware(["admin", "organizer", "attendee"]), updateUser);

// Protected: Delete user
router.delete("/:id", authMiddleware(["admin"]), deleteUser);

export default router;