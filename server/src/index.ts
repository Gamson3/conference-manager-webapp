// Entry point for our entire application 

import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
// import { authMiddleware } from "./middleware/authMiddleware";
import { authMiddleware } from "./middleware/authMiddleware";
import { backfillAcceptedPresentations } from "./jobs/backfillAcceptedPresentations";

/* ============================================================
 * ROUTE IMPORTS
 * ============================================================
 * 
 * NEW STRUCTURE (Recommended - Phase 1 Migration):
 * - /api/public/*    → Public routes (no auth required)
 * - /api/account/*   → Authenticated user routes (any role)
 * - /api/organizer/* → Organizer/admin routes
 * - /api/admin/*     → Admin-only routes
 * 
 * LEGACY ROUTES (Deprecated - will be removed in Phase 3):
 * These are kept for backward compatibility during migration
 * 
 * @see docs/Route-Naming-Convention-Analysis.md
 * ============================================================ */

// NEW ROUTE STRUCTURE (Phase 1)
import publicRoutes from "./routes/publicRoutes";
import accountRoutes from "./routes/accountRoutes";
import organizerRoutes from "./routes/organizerRoutes";
import adminRoutes from "./routes/adminRoutes";

// LEGACY ROUTES (DEPRECATED - kept for backward compatibility)
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import eventRoutes from "./routes/eventRoutes";
import conferenceRoutes from "./routes/conferenceRoutes";
import sectionRoutes from "./routes/sectionRoutes";
import searchRoutes from "./routes/searchRoutes";
import favoriteRoutes from "./routes/favoriteRoutes";
import presentationRoutes from "./routes/presentationRoutes";
import attendeeRoutes from "./routes/attendeeRoutes";
import scheduleRoutes from "./routes/scheduleRoutes";
import conferenceSetupRoutes from "./routes/conferenceSetupRoutes";
import participantsRoutes from "./routes/participantsRoutes";
import submissionsRoutes from "./routes/submissionsRoutes";
import daysRoutes from "./routes/daysRoutes";
import websiteRoutes from "./routes/websiteRoutes";
import registrationRoutes from "./routes/registrationRoutes";
import fileRoutes from "./routes/fileRoutes";



/* CONFIGURATIONS - setup files*/ 
dotenv.config();
const app = express();
// Increase body size limits to handle file uploads (images, PDFs, etc.)
// Default is 100kb, we increase to 50MB for conference logos/documents
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Local uploads (thesis-safe): serve stored submission files.
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

// Configure CORS with specific origins for credentials support
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Suppress-403-Redirect"],
}));


// Health check
app.get("/", (req, res) => {
  res.send("This is home route");  // test for whether our home route works
});

/* ============================================================
 * NEW ROUTE STRUCTURE (Phase 1 - Recommended)
 * These are the preferred endpoints going forward
 * ============================================================ */
app.use("/api/public", publicRoutes);      // Public conference browsing (no auth)
app.use("/api/account", accountRoutes);    // User dashboard, profile, favorites (any auth)
app.use("/api/organizer", organizerRoutes); // Conference management (organizer/admin)
app.use("/api/admin", adminRoutes);        // System administration (admin only)

/* ============================================================
 * LEGACY ROUTES (DEPRECATED)
 * Kept for backward compatibility during frontend migration
 * Will be removed after Phase 2 is complete
 * ============================================================ */
// Auth (keeping as-is for now)
app.use("/auth", authRoutes);
app.use("/users", userRoutes); // universal user route

// DEPRECATED: /events/* → Use /api/organizer/conferences/*
app.use("/events", eventRoutes);

// DEPRECATED: /conferences/* → Use /api/public/conferences/* or /api/organizer/conferences/*
app.use("/conferences", conferenceRoutes);

// DEPRECATED: /api/* mixed routes → Use role-specific routes above
app.use("/api", scheduleRoutes);
app.use("/sections", sectionRoutes);       // DEPRECATED: Use /api/organizer/sessions/*
app.use("/search", searchRoutes);
app.use("/favorites", favoriteRoutes);     // DEPRECATED: Use /api/account/favorites
app.use("/api", presentationRoutes);       // DEPRECATED: Use /api/organizer/presentations/*
app.use("/api/attendee", attendeeRoutes);  // DEPRECATED: Use /api/account/*
app.use("/api", conferenceSetupRoutes);    // DEPRECATED: Use /api/organizer/conferences/:id/*
app.use("/api", participantsRoutes);       // DEPRECATED: Use /api/organizer/conferences/:id/participants/*
app.use("/api", submissionsRoutes);
app.use("/api", daysRoutes);               // DEPRECATED: Use /api/organizer/conferences/:id/days/*
app.use("/api", websiteRoutes);            // DEPRECATED: Use /api/organizer/conferences/:id/website/*
app.use("/api", registrationRoutes);       // DEPRECATED: Use /api/organizer/conferences/:id/registration/*
app.use("/api", fileRoutes);               // File access routes (presigned URLs for R2/S3)



/* SERVER */
const port = Number(process.env.PORT) || 3002;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);

  // System-owned migration/backfill: ensure all accepted submissions have a presentation.
  // This avoids organizer-triggered GET side effects and keeps scheduler behavior consistent.
  void (async () => {
    try {
      const result = await backfillAcceptedPresentations();
      if (result.createdOrLinked > 0) {
        console.log(
          `[startup] Backfilled accepted presentations: ${result.createdOrLinked} (scanned ${result.scanned})`
        );
      }
    } catch (error) {
      console.error("[startup] Backfill accepted presentations failed:", error);
    }
  })();
});

export default app;