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
  setUserRoles,
  addRoleToUser,
  ensureUser,
  ensureAndGetUser
} from "../controllers/userControllers";
import { authMiddleware } from "../middleware/authMiddleware";
import { searchUsers } from '../controllers/presentationControllers';

const router = express.Router();

router.get("/ensure-and-get", ensureAndGetUser);

// Add the ensure user endpoint - allows frontend to explicitly create a user if missing
router.post("/ensure", ensureUser);

// Public: Create user (sign up) - keep this for Cognito post-confirmation hooks
router.post("/", createUser);

// Me endpoints
router.get("/me", authMiddleware(["admin", "organizer", "attendee", "presenter"]), getCurrentUser);
router.put("/me", authMiddleware(["admin", "organizer", "attendee", "presenter"]), updateCurrentUser);

// Admin endpoints
router.get("/", authMiddleware(["admin"]), getAllUsers);
router.post("/role", authMiddleware(["admin"]), setUserRoles);
router.post("/add-role", authMiddleware(["admin"]), addRoleToUser);

// Search users
router.get("/search", authMiddleware(["organizer", "admin"]), searchUsers);

// Protected: Get user by DB ID
router.get("/:id", authMiddleware(["admin", "organizer", "attendee", "presenter"]), getUser);

// Protected: Get user by Cognito ID (for auth session)
router.get("/cognito/:cognitoId", getUserByCognitoId);

// Protected: Update user
router.put("/cognito/:cognitoId", authMiddleware(["admin", "organizer", "attendee", "presenter"]), updateUser);

// Protected: Delete user
router.delete("/:id", authMiddleware(["admin"]), deleteUser);

export default router;