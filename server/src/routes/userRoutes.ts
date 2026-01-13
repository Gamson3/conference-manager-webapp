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
  changeUserRole,
  upsertUser
} from "../controllers/userControllers";
import { authMiddleware } from "../middleware/authMiddleware";
import { searchUsers } from '../controllers/presentationControllers';
import { upgradeToOrganizer } from '../controllers/userControllers';

const router = express.Router();

// Public: Create user (sign up) - keep this for Cognito post-confirmation hooks
router.post("/", createUser);
// Public: Upsert user by Cognito Id (used post-login from frontend)
router.post("/upsert", upsertUser);

// Me endpoints
router.get("/me", authMiddleware(["admin", "organizer", "user"]), getCurrentUser);
router.put("/me", authMiddleware(["admin", "organizer", "user"]), updateCurrentUser);

// Admin endpoints
router.get("/", authMiddleware(["admin"]), getAllUsers);
router.post("/role", authMiddleware(["admin"]), changeUserRole);
// Self-service upgrade to organizer
router.post("/upgrade-organizer", authMiddleware(["user", "organizer", "admin"]), upgradeToOrganizer);

// Search users
router.get("/search", authMiddleware(["organizer", "admin"]), searchUsers);

// Protected: Get user by DB ID
router.get("/:id", authMiddleware(["admin", "organizer", "user"]), getUser);

// Protected: Get user by Cognito ID (for auth session)
router.get("/cognito/:cognitoId", getUserByCognitoId);

// Protected: Update user
router.put("/cognito/:cognitoId", authMiddleware(["admin", "organizer", "user"]), updateUser);

// Protected: Delete user
router.delete("/:id", authMiddleware(["admin"]), deleteUser);

export default router;