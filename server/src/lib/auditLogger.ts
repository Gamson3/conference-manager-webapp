import { Request } from "express";
import prisma from "./prisma";

type AdminAction =
  | "DELETE_USER"
  | "UPDATE_USER_ROLE"
  | "IMPERSONATE_USER"
  | "CREATE_CONFERENCE"
  | "UPDATE_CONFERENCE"
  | "DELETE_CONFERENCE"
  | "PUBLISH_CONFERENCE"
  | "UNPUBLISH_CONFERENCE"
  | "DELETE_SUBMISSION"
  | "UPDATE_SUBMISSION_STATUS"
  | "DELETE_PRESENTATION"
  | "UPDATE_PRESENTATION"
  | "BULK_DELETE"
  | "EXPORT_DATA"
  | "SUBMISSION_ACCEPT"
  | "SUBMISSION_REJECT"
  | "SUBMISSION_OVERRIDE_EDIT"
  | "PRESENTATION_LOCK"
  | "PRESENTATION_UNLOCK"
  | "SCHEDULE_ASSIGN";

type EntityType =
  | "User"
  | "Conference"
  | "Submission"
  | "Presentation"
  | "Schedule"
  | "Session"
  | "System";

interface LogMetadata {
  oldValue?: any;
  newValue?: any;
  affectedCount?: number;
  cascadeDeletes?: {
    conferences?: number;
    submissions?: number;
    presentations?: number;
    participants?: number;
    [key: string]: number | undefined;
  };
  reason?: string;
  [key: string]: any;
}

/**
 * Logs an admin action to the audit trail
 */
export async function logAdminAction(
  adminId: number,
  action: AdminAction,
  entityType: EntityType,
  entityId: number | null,
  metadata: LogMetadata | null,
  req: Request
): Promise<void> {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress || null;
    const userAgent = req.get("user-agent") || null;

    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        entityType,
        entityId,
        metadata: metadata || undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to log admin action:", error);
    // Don't throw - we don't want audit logging to break the actual operation
  }
}

/**
 * Logs the start of an impersonation session
 */
export async function logImpersonation(
  adminId: number,
  impersonatedUserId: number,
  req: Request
): Promise<number | null> {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress || null;
    const userAgent = req.get("user-agent") || null;

    const log = await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: "IMPERSONATE_USER",
        entityType: "User",
        entityId: impersonatedUserId,
        impersonatedUserId,
        ipAddress,
        userAgent,
      },
    });

    return log.id;
  } catch (error) {
    console.error("Failed to log impersonation:", error);
    return null;
  }
}

/**
 * Logs the end of an impersonation session
 */
export async function endImpersonation(logId: number): Promise<void> {
  try {
    await prisma.adminAuditLog.update({
      where: { id: logId },
      data: {
        impersonationEnded: new Date(),
      },
    });
  } catch (error) {
    console.error("Failed to end impersonation log:", error);
  }
}

/**
 * Gets consequences of deleting a user (for warnings)
 */
export async function getUserDeleteConsequences(userId: number) {
  const [conferences, submissions, presentations] = await Promise.all([
    prisma.conference.count({ where: { createdById: userId } }),
    prisma.submission.count({ where: { authorId: userId } }),
    prisma.presentationAuthor.count({
      where: { userId },
    }),
  ]);

  return {
    conferences,
    submissions,
    presentations,
  };
}

/**
 * Gets consequences of deleting a conference (for warnings)
 */
export async function getConferenceDeleteConsequences(conferenceId: number) {
  const [submissions, presentations, participants] =
    await Promise.all([
      prisma.submission.count({ where: { conferenceId } }),
      prisma.presentation.count({
        where: { section: { conferenceId } },
      }),
      prisma.conferenceParticipant.count({ where: { conferenceId } }),
    ]);

  return {
    submissions,
    presentations,
    participants,
  };
}

/**
 * Gets all audit logs with pagination and filtering
 */
export async function getAuditLogs(params: {
  page?: number;
  limit?: number;
  action?: AdminAction;
  adminId?: number;
  entityType?: EntityType;
  startDate?: Date;
  endDate?: Date;
}) {
  const {
    page = 1,
    limit = 50,
    action,
    adminId,
    entityType,
    startDate,
    endDate,
  } = params;

  const where: any = {};
  if (action) where.action = action;
  if (adminId) where.adminId = adminId;
  if (entityType) where.entityType = entityType;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        impersonatedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.adminAuditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
}
