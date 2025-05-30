import express from "express";
import { refreshToken, forgotPassword, resetPassword } from "../controllers/authControllers";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// These will integrate with Cognito
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/logout", authMiddleware(["admin", "organizer", "attendee"]), (req, res) => {
  // Client-side logout primarily, but you can invalidate server-side session if needed
  res.status(200).json({ message: "Logged out successfully" });
});

export default router;