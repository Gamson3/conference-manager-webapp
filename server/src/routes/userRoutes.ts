import express from "express";
import {
  getUser,
  getUserByCognitoId,
  createUser,
  updateUser,
  deleteUser,
  getCurrentUser,
  updateCurrentUser,
  getAllUsers,
  changeUserRole
} from "../controllers/userControllers";
import { authMiddleware } from "../middleware/authMiddleware";
import { searchUsers } from '../controllers/presentationControllers';

const router = express.Router();

// Public: Create user (sign up) - keep this for Cognito post-confirmation hooks
router.post("/", createUser);

// Me endpoints
router.get("/me", authMiddleware(["admin", "organizer", "attendee"]), getCurrentUser);
router.put("/me", authMiddleware(["admin", "organizer", "attendee"]), updateCurrentUser);

// Admin endpoints
router.get("/", authMiddleware(["admin"]), getAllUsers);
router.post("/role", authMiddleware(["admin"]), changeUserRole);

// Search users
router.get("/search", authMiddleware(["organizer", "admin"]), searchUsers);

// Protected: Get user by DB ID
router.get("/:id", authMiddleware(["admin", "organizer", "attendee"]), getUser);

// Protected: Get user by Cognito ID (for auth session)
router.get("/cognito/:cognitoId", getUserByCognitoId);

// Protected: Update user
router.put("/cognito/:cognitoId", authMiddleware(["admin", "organizer", "attendee"]), updateUser);

// Protected: Delete user
router.delete("/:id", authMiddleware(["admin"]), deleteUser);

export default router;