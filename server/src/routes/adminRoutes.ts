/**
 * ADMIN ROUTES
 * /api/admin/* - Routes for system administrators only
 * 
 * These routes handle system-wide management:
 * - User management (list, roles, delete)
 * - System-wide conference access
 * - Dashboard/stats
 * 
 * Naming Convention: "admin" prefix to clearly identify admin-only routes
 * Frontend paths: /admin/dashboard, /admin/users, /admin/conferences
 * 
 * @created December 5, 2025
 * @see docs/Route-Naming-Convention-Analysis.md
 */

import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import prisma from "../lib/prisma";
import { Prisma, Role, SubmissionStatus } from "@prisma/client";
import { ensurePresentationForAcceptedSubmission, SubmissionWithAuthor } from "../utils/submissionToPresentation";
import {
  logAdminAction,
  logImpersonation,
  getUserDeleteConsequences,
  getConferenceDeleteConsequences,
  getAuditLogs,
} from "../lib/auditLogger";

// User Controllers
import {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  changeUserRole,
} from "../controllers/userControllers";

// Conference Controllers (admin has access to all conferences)
import {
  getPublicConferences,
  getPublicConferenceDetails,
} from "../controllers/conferenceControllers";

// Event Controllers (for admin management)
import {
  getEventById,
  updateEvent,
  deleteEvent,
  publishConference,
  unpublishConference,
} from "../controllers/eventControllers";
import { validateConferenceDatesForUpdate } from "../middleware/validateConferenceDates";

const router = express.Router();

// All routes require admin role only
const adminGuard = authMiddleware(["admin"]);

/* ============================================================
 * DASHBOARD
 * ============================================================ */

// GET /api/admin/dashboard - System-wide statistics
router.get("/dashboard", adminGuard, async (req, res) => {
  try {
    const [userCount, conferenceCount, presentationCount, participantCount] = await Promise.all([
      prisma.user.count(),
      prisma.conference.count(),
      prisma.presentation.count(),
      prisma.conferenceParticipant.count(),
    ]);
    
    const recentConferences = await prisma.conference.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
      },
    });
    
    res.json({
      stats: {
        totalUsers: userCount,
        totalConferences: conferenceCount,
        totalPresentations: presentationCount,
        totalParticipants: participantCount,
      },
      recentConferences,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/* ============================================================
 * USER MANAGEMENT
 * ============================================================ */

// GET /api/admin/users - List all users
router.get("/users", adminGuard, getAllUsers);

// GET /api/admin/users/:id - Get user by ID
router.get("/users/:id", adminGuard, getUser);

// PUT /api/admin/users/:cognitoId - Update user
router.put("/users/:cognitoId", adminGuard, updateUser);

// DELETE /api/admin/users/:id - Delete user
// DELETE /api/admin/users/:id - Delete user (wrapped with audit logging)
router.delete("/users/:id", adminGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = (req.user as any).userId;
    const userId = Number(id);
    
    // Get consequences before deletion
    const consequences = await getUserDeleteConsequences(userId);
    
    // Get user info before deletion
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, role: true },
    });
    
    // Delete user
    await prisma.user.delete({
      where: { id: userId },
    });
    
    // Log the action
    await logAdminAction(
      adminId,
      "DELETE_USER",
      "User",
      userId,
      {
        userName: user?.name,
        userEmail: user?.email,
        userRole: user?.role,
        cascadeDeletes: consequences,
      },
      req
    );
    
    res.json({ message: "User deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/admin/users/role - Change user role (wrapped with audit logging)
router.post("/users/role", adminGuard, async (req, res) => {
  try {
    const { userId, role } = req.body;
    const adminId = (req.user as any).userId;
    
    // Get old role
    const oldUser = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: { role: true, name: true, email: true },
    });
    
    // Update role
    const user = await prisma.user.update({
      where: { id: Number(userId) },
      data: { role: role as Role },
    });
    
    // Log the action
    await logAdminAction(
      adminId,
      "UPDATE_USER_ROLE",
      "User",
      Number(userId),
      {
        userName: oldUser?.name,
        userEmail: oldUser?.email,
        oldValue: oldUser?.role,
        newValue: role,
      },
      req
    );
    
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/admin/impersonate/:userId - Impersonate user
router.post("/impersonate/:userId", adminGuard, async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = (req.user as any).userId;
    
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: { id: true, name: true, email: true, role: true },
    });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Log the impersonation
    await logImpersonation(adminId, user.id, req);
    
    // Return user data - frontend will handle session
    res.json({ 
      message: "Impersonation data retrieved", 
      user,
      impersonatedBy: adminId
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/* ============================================================
 * CONFERENCE MANAGEMENT (System-wide)
 * ============================================================ */

// GET /api/admin/conferences - List ALL conferences (any status)
router.get("/conferences", adminGuard, async (req, res) => {
  try {
    const { status, search, limit = "50", offset = "0" } = req.query;
    
    const where: any = {};
    
    if (status && status !== "all") {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { description: { contains: String(search), mode: "insensitive" } },
      ];
    }
    
    const [conferences, total] = await Promise.all([
      prisma.conference.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip: Number(offset),
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { participants: true },
          },
        },
      }),
      prisma.conference.count({ where }),
    ]);
    
    res.json({
      conferences,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/conferences/:id - Get any conference details
router.get("/conferences/:id", adminGuard, getEventById);

// PUT /api/admin/conferences/:id - Update any conference
router.put("/conferences/:id", adminGuard, validateConferenceDatesForUpdate, updateEvent);

// DELETE /api/admin/conferences/:id - Delete any conference (wrapped with audit logging)
router.delete("/conferences/:id", adminGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = (req.user as any).userId;
    const conferenceId = Number(id);
    
    // Get consequences and conference info before deletion
    const [consequences, conference] = await Promise.all([
      getConferenceDeleteConsequences(conferenceId),
      prisma.conference.findUnique({
        where: { id: conferenceId },
        select: { name: true, status: true, createdById: true },
      }),
    ]);
    
    // Delete conference
    await prisma.conference.delete({
      where: { id: conferenceId },
    });
    
    // Log the action
    await logAdminAction(
      adminId,
      "DELETE_CONFERENCE",
      "Conference",
      conferenceId,
      {
        conferenceName: conference?.name,
        conferenceStatus: conference?.status,
        cascadeDeletes: consequences,
      },
      req
    );
    
    res.json({ message: "Conference deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/admin/conferences/:id/publish - Force publish any conference (wrapped with audit logging)
router.post("/conferences/:id/publish", adminGuard, async (req, res, next) => {
  const adminId = (req.user as any).userId;
  const conferenceId = Number(req.params.id);
  
  // Get conference info
  const conference = await prisma.conference.findUnique({
    where: { id: conferenceId },
    select: { name: true, status: true },
  });
  
  // Call original controller
  await publishConference(req, res);
  
  // Log if successful (check response status)
  if (res.statusCode < 400) {
    await logAdminAction(
      adminId,
      "PUBLISH_CONFERENCE",
      "Conference",
      conferenceId,
      {
        conferenceName: conference?.name,
        oldStatus: conference?.status,
        newStatus: "published",
      },
      req
    );
  }
});

// POST /api/admin/conferences/:id/unpublish - Force unpublish any conference (wrapped with audit logging)
router.post("/conferences/:id/unpublish", adminGuard, async (req, res, next) => {
  const adminId = (req.user as any).userId;
  const conferenceId = Number(req.params.id);
  
  // Get conference info
  const conference = await prisma.conference.findUnique({
    where: { id: conferenceId },
    select: { name: true, status: true },
  });
  
  // Call original controller
  await unpublishConference(req, res);
  
  // Log if successful
  if (res.statusCode < 400) {
    await logAdminAction(
      adminId,
      "UNPUBLISH_CONFERENCE",
      "Conference",
      conferenceId,
      {
        conferenceName: conference?.name,
        oldStatus: conference?.status,
        newStatus: "draft",
      },
      req
    );
  }
});

/* ============================================================
 * SUBMISSIONS MANAGEMENT
 * ============================================================ */

// GET /api/admin/submissions - List all submissions across conferences
router.get("/submissions", adminGuard, async (req, res) => {
  try {
    const { status, conferenceId, search } = req.query;
    
    const where: any = {};
    
    if (status && status !== "all") {
      where.status = status;
    }
    
    if (conferenceId && conferenceId !== "all") {
      where.conferenceId = Number(conferenceId);
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: "insensitive" } },
        { abstract: { contains: search as string, mode: "insensitive" } },
      ];
    }
    
    const submissions = await prisma.submission.findMany({
      where,
      include: {
        conference: { select: { id: true, name: true } },
        author: { select: { name: true, email: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: 100,
    });
    
    res.json({ submissions });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/admin/submissions/:id/status - Change submission status
router.patch("/submissions/:id/status", adminGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const statusRaw = (req.body as { status?: unknown } | undefined)?.status;
    const status = typeof statusRaw === "string" ? statusRaw : undefined;
    const adminId = req.user?.id;
    const submissionId = Number(id);

    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (!status || !["draft", "submitted", "accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const nextStatus = status as SubmissionStatus;

    type SubmissionWithBasicIncludes = Prisma.SubmissionGetPayload<{
      include: {
        conference: { select: { name: true } };
        author: { select: { name: true; email: true } };
      };
    }>;
    
    // Get old status
    const oldSubmission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { status: true, title: true },
    });

    const existing = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        conference: { select: { name: true } },
        author: { select: { name: true, email: true, organization: true } },
        authors: {
          select: {
            firstName: true,
            lastName: true,
            name: true,
            email: true,
            affiliations: true,
            phone: true,
            orcid: true,
            order: true,
            isPresenter: true,
            isExternal: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ message: "Submission not found" });
    }
    
    let submission: SubmissionWithBasicIncludes;
    if (nextStatus === "accepted") {
      submission = await prisma.$transaction(async (tx) => {
        const shaped: SubmissionWithAuthor = {
          id: existing.id,
          title: existing.title,
          abstract: existing.abstract,
          keywords: existing.keywords,
          authorId: existing.authorId,
          conferenceId: existing.conferenceId,
          presentationId: existing.presentationId ?? null,
          typeId: existing.typeId ?? null,
          categoryId: existing.categoryId ?? null,
          author: {
            name: existing.author.name,
            email: existing.author.email,
            organization: existing.author.organization,
          },
          authorEntries: existing.authors,
        };

        const presentationId = await ensurePresentationForAcceptedSubmission(tx, shaped);
        return tx.submission.update({
          where: { id: submissionId },
          data: {
            status: "accepted",
            isLocked: true,
            lockedAt: new Date(),
            lockedReason: "Locked after acceptance",
            presentationId,
          },
          include: {
            conference: { select: { name: true } },
            author: { select: { name: true, email: true } },
          },
        });
      });
    } else {
      submission = await prisma.submission.update({
        where: { id: submissionId },
        data: { status: nextStatus },
        include: {
          conference: { select: { name: true } },
          author: { select: { name: true, email: true } },
        },
      });
    }
    
    // Log the action
    await logAdminAction(
      adminId,
      "UPDATE_SUBMISSION_STATUS",
      "Submission",
      submissionId,
      {
        submissionTitle: oldSubmission?.title,
        oldValue: oldSubmission?.status,
        newValue: status,
        authorEmail: submission.author.email,
      },
      req
    );
    
    res.json({ message: "Submission status updated", submission });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/admin/submissions/:id - Delete submission
router.delete("/submissions/:id", adminGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = (req.user as any).userId;
    const submissionId = Number(id);
    
    // Get submission info before deletion
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { 
        title: true, 
        status: true,
        author: { select: { name: true, email: true } },
        conference: { select: { name: true } },
      },
    });
    
    await prisma.submission.delete({
      where: { id: submissionId },
    });
    
    // Log the action
    await logAdminAction(
      adminId,
      "DELETE_SUBMISSION",
      "Submission",
      submissionId,
      {
        submissionTitle: submission?.title,
        submissionStatus: submission?.status,
        authorName: submission?.author.name,
        conferenceName: submission?.conference.name,
      },
      req
    );
    
    res.json({ message: "Submission deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/* ============================================================
 * PRESENTATIONS MANAGEMENT
 * ============================================================ */

// GET /api/admin/presentations - List all presentations across conferences
router.get("/presentations", adminGuard, async (req, res) => {
  try {
    const { conferenceId, search } = req.query;
    
    const where: any = {};
    
    if (conferenceId && conferenceId !== "all") {
      where.section = {
        conferenceId: Number(conferenceId),
      };
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: "insensitive" } },
        { abstract: { contains: search as string, mode: "insensitive" } },
      ];
    }
    
    const presentations = await prisma.presentation.findMany({
      where,
      include: {
        section: {
          select: {
            id: true,
            name: true,
            startTime: true,
            conference: { select: { id: true, name: true } },
          },
        },
        authors: {
          select: {
            id: true,
            authorName: true,
            authorEmail: true,
            isPresenter: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    
    res.json({ presentations });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/admin/presentations/:id - Delete presentation
router.delete("/presentations/:id", adminGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = (req.user as any).userId;
    const presentationId = Number(id);
    
    // Get presentation info before deletion
    const presentation = await prisma.presentation.findUnique({
      where: { id: presentationId },
      select: { 
        title: true,
        section: { select: { 
          name: true,
          conference: { select: { name: true } },
        }},
      },
    });
    
    await prisma.presentation.delete({
      where: { id: presentationId },
    });
    
    // Log the action
    await logAdminAction(
      adminId,
      "DELETE_PRESENTATION",
      "Presentation",
      presentationId,
      {
        presentationTitle: presentation?.title,
        sectionName: presentation?.section.name,
        conferenceName: presentation?.section.conference.name,
      },
      req
    );
    
    res.json({ message: "Presentation deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/* ============================================================
 * REPORTS & ANALYTICS
 * ============================================================ */

// GET /api/admin/reports - Get system analytics
router.get("/reports", adminGuard, async (req, res) => {
  try {
    const [
      totalUsers,
      totalConferences,
      totalSubmissions,
      totalPresentations,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.conference.count(),
      prisma.submission.count(),
      prisma.presentation.count(),
    ]);
    
    const averageSubmissionsPerConference = totalConferences > 0 
      ? totalSubmissions / totalConferences 
      : 0;
      
    const averagePresentationsPerConference = totalConferences > 0
      ? totalPresentations / totalConferences
      : 0;
    
    res.json({
      totalUsers,
      totalConferences,
      totalSubmissions,
      totalPresentations,
      userGrowth: 0, // TODO: Calculate from historical data
      conferenceGrowth: 0, // TODO: Calculate from historical data
      averageSubmissionsPerConference,
      averagePresentationsPerConference,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/export/:type - Export data as CSV
router.get("/export/:type", adminGuard, async (req, res) => {
  try {
    const { type } = req.params;
    
    let data: any[] = [];
    let filename = `export-${new Date().toISOString()}.csv`;
    
    switch (type) {
      case "users":
        data = await prisma.user.findMany({
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        });
        filename = `users-${new Date().toISOString()}.csv`;
        break;
        
      case "conferences":
        data = await prisma.conference.findMany({
          select: { 
            id: true, 
            name: true, 
            status: true, 
            startDate: true, 
            endDate: true, 
            createdAt: true,
          },
        });
        filename = `conferences-${new Date().toISOString()}.csv`;
        break;
        
      case "submissions":
        data = await prisma.submission.findMany({
          select: {
            id: true,
            title: true,
            status: true,
            submittedAt: true,
            conference: { select: { name: true } },
            author: { select: { name: true, email: true } },
          },
        });
        filename = `submissions-${new Date().toISOString()}.csv`;
        break;
        
      default:
        return res.status(400).json({ message: "Invalid export type" });
    }
    
    // Convert to CSV
    if (data.length === 0) {
      return res.status(404).json({ message: "No data to export" });
    }
    
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map((row) => headers.map((h) => JSON.stringify(row[h])).join(",")),
    ].join("\n");
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/* ============================================================
 * SYSTEM HEALTH (Future)
 * ============================================================ */

// GET /api/admin/health - System health check
router.get("/health", adminGuard, async (req, res) => {
  try {
    // Simple DB connectivity check
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error: any) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: error.message,
    });
  }
});

/* ============================================================
 * AUDIT LOGS
 * ============================================================ */

// GET /api/admin/audit-logs - Get audit logs with filters
router.get("/audit-logs", adminGuard, async (req, res) => {
  try {
    const {
      page = "1",
      limit = "50",
      action,
      adminId,
      entityType,
      startDate,
      endDate,
    } = req.query;

    const result = await getAuditLogs({
      page: Number(page),
      limit: Number(limit),
      action: action as any,
      adminId: adminId ? Number(adminId) : undefined,
      entityType: entityType as any,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/consequences/user/:id - Get consequences of deleting user
router.get("/consequences/user/:id", adminGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const consequences = await getUserDeleteConsequences(Number(id));
    res.json(consequences);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/consequences/conference/:id - Get consequences of deleting conference
router.get("/consequences/conference/:id", adminGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const consequences = await getConferenceDeleteConsequences(Number(id));
    res.json(consequences);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
