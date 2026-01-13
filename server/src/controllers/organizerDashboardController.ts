import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { getUserId, isAdmin } from "../utils/authHelper";
import {
  ConferenceParticipantStatus,
  SubmissionStatus,
} from "@prisma/client";
import { resolveConferenceId } from "../utils/conferenceResolver";

interface ParticipantStatsPayload {
  total: number;
  byRole: Record<string, number>;
  byStatus: Record<string, number>;
  registered: number;
  waitlisted: number;
  canceled: number;
  withdrawn: number;
}

interface ProgramStatsPayload {
  daysCount: number;
  sessionsCount: number;
  presentationsCount: number;
  acceptedSubmissions: number;
  unscheduledAccepted: number;
}

interface SubmissionStatsPayload {
  total: number;
  byStatus: Record<string, number>;
  pending: number;
  accepted: number;
  rejected: number;
  underReview: number;
}

export interface OrganizerConferenceDashboardStatsResponse {
  participants: ParticipantStatsPayload;
  program: ProgramStatsPayload;
  submissions: SubmissionStatsPayload;
}

const buildCountMap = (rows: Array<{ key: string; count: number }>): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const row of rows) {
    out[row.key] = (out[row.key] ?? 0) + row.count;
  }
  return out;
};

const ensureOrganizerAccess = async (req: Request, conferenceId: number): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const conference = await prisma.conference.findUnique({
    where: { id: conferenceId },
    select: { id: true, createdById: true },
  });

  if (!conference) {
    const err = new Error("Conference not found");
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }

  if (isAdmin(req) || conference.createdById === userId) {
    return;
  }

  const err = new Error("Forbidden");
  (err as Error & { statusCode?: number }).statusCode = 403;
  throw err;
};

// GET /api/organizer/conferences/:id/dashboard/stats
// Single optimized endpoint for organizer Home stats cards.
export const getOrganizerConferenceDashboardStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const conferenceId = await resolveConferenceId(req.params.id);
    await ensureOrganizerAccess(req, conferenceId);

    const [
      daysCount,
      sessionsCount,
      presentationsCount,
      acceptedSubmissions,
      submissionCounts,
      participantGrouped,
    ] = await Promise.all([
      prisma.day.count({ where: { conferenceId } }),
      prisma.section.count({ where: { conferenceId } }),
      prisma.presentation.count({ where: { section: { conferenceId } } }),
      prisma.submission.count({ where: { conferenceId, status: SubmissionStatus.accepted } }),
      prisma.submission.groupBy({
        by: ["status"],
        where: { conferenceId },
        _count: { _all: true },
      }),
      prisma.conferenceParticipant.groupBy({
        by: ["role", "status"],
        where: { conferenceId },
        _count: { _all: true },
      }),
    ]);

    const submissionsByStatus = buildCountMap(
      submissionCounts.map((row) => ({ key: row.status, count: row._count._all }))
    );

    const totalSubmissions = Object.values(submissionsByStatus).reduce((sum, n) => sum + n, 0);
    const pending = (submissionsByStatus[SubmissionStatus.submitted] ?? 0) +
      (submissionsByStatus[SubmissionStatus.under_review] ?? 0);
    const accepted = submissionsByStatus[SubmissionStatus.accepted] ?? 0;
    const rejected = submissionsByStatus[SubmissionStatus.rejected] ?? 0;
    const underReview = submissionsByStatus[SubmissionStatus.under_review] ?? 0;

    const byRole: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const row of participantGrouped) {
      const roleKey = row.role;
      const statusKey = row.status;
      const count = row._count._all;

      byRole[roleKey] = (byRole[roleKey] ?? 0) + count;
      byStatus[statusKey] = (byStatus[statusKey] ?? 0) + count;
    }

    const totalParticipants = Object.values(byStatus).reduce((sum, n) => sum + n, 0);
    const registered = byStatus[ConferenceParticipantStatus.registered] ?? 0;
    const waitlisted = byStatus[ConferenceParticipantStatus.waitlisted] ?? 0;
    const canceled = byStatus[ConferenceParticipantStatus.canceled] ?? 0;
    const withdrawn = byStatus[ConferenceParticipantStatus.withdrawn] ?? 0;

    const payload: OrganizerConferenceDashboardStatsResponse = {
      program: {
        daysCount,
        sessionsCount,
        presentationsCount,
        acceptedSubmissions,
        unscheduledAccepted: acceptedSubmissions - presentationsCount,
      },
      submissions: {
        total: totalSubmissions,
        byStatus: submissionsByStatus,
        pending,
        accepted,
        rejected,
        underReview,
      },
      participants: {
        total: totalParticipants,
        byRole,
        byStatus,
        registered,
        waitlisted,
        canceled,
        withdrawn,
      },
    };

    res.json(payload);
  } catch (error: unknown) {
    const statusCode =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number((error as { statusCode?: unknown }).statusCode)
        : undefined;

    const message = error instanceof Error ? error.message : "Internal server error";

    if (message === "Unauthorized") {
      res.status(401).json({ message });
      return;
    }

    if (statusCode === 403 || message === "Forbidden") {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    if (statusCode === 404 || message === "Conference not found") {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    res.status(500).json({ message });
  }
};
