import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { getUserId, isAdmin } from "../utils/authHelper";
import { ConferenceParticipantStatus, ConferenceParticipationRole } from "@prisma/client";

// POST /api/conferences/:id/register - self-register as attendee
export const registerSelf = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

    // Validate conference exists and is published or owned by user
    const conference = await prisma.conference.findUnique({ where: { id: conferenceId } });
    if (!conference) { res.status(404).json({ message: "Conference not found" }); return; }

    // Conference must not have ended for attendee registration/reinstatement.
    const now = new Date();
    const conferenceEnded = conference.endDate < now;
    if (conferenceEnded) {
      res.status(403).json({ message: 'Conference has ended; registration is closed' });
      return;
    }

    // Registration window gating for non-admins/non-owners
    const bypass = isAdmin(req) || conference.createdById === userId;
    const registrationOpen = (!conference.registrationOpenFrom || conference.registrationOpenFrom <= now)
      && (!conference.registrationOpenUntil || conference.registrationOpenUntil >= now);
    if (!bypass && !registrationOpen) {
      res.status(403).json({ message: 'Registration is currently closed' });
      return;
    }

    const existing = await prisma.conferenceParticipant.findFirst({
      where: {
        conferenceId,
        userId,
        role: ConferenceParticipationRole.attendee,
      },
    });

    if (existing) {
      if (existing.status === ConferenceParticipantStatus.registered) {
        res.status(400).json({ message: 'Already registered' });
        return;
      }

      // Re-register = reinstate (status transition) when allowed.
      const participant = await prisma.conferenceParticipant.update({
        where: { id: existing.id },
        data: { status: ConferenceParticipantStatus.registered },
      });
      res.status(200).json(participant);
      return;
    }

    try {
      const participant = await prisma.conferenceParticipant.create({
        data: {
          userId,
          conferenceId,
          role: ConferenceParticipationRole.attendee,
          status: ConferenceParticipantStatus.registered
        }
      });
      res.status(201).json(participant);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: unknown }).code === 'P2002') {
        res.status(400).json({ message: 'Already registered' });
        return;
      }
      throw err;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

// DELETE /api/conferences/:id/unregister - self-unregister as attendee
export const unregisterSelf = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

    const participant = await prisma.conferenceParticipant.findFirst({
      where: { conferenceId, userId, role: ConferenceParticipationRole.attendee }
    });
    if (!participant) { res.status(404).json({ message: 'Registration not found' }); return; }

    if (participant.status === ConferenceParticipantStatus.withdrawn) {
      res.json({ message: 'Already withdrawn' });
      return;
    }

    if (participant.status === ConferenceParticipantStatus.canceled) {
      res.json({ message: 'Already canceled' });
      return;
    }

    await prisma.conferenceParticipant.update({
      where: { id: participant.id },
      data: { status: ConferenceParticipantStatus.withdrawn },
    });

    res.json({ message: 'Withdrawn' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

// GET /api/conferences/:id/participants - list participants (organizer/admin)
export const listParticipants = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);
    const { role, status, page, pageSize } = req.query as {
      role?: string;
      status?: string;
      page?: string;
      pageSize?: string;
    };
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const conf = await prisma.conference.findUnique({ where: { id: conferenceId } });
    if (!conf) { res.status(404).json({ message: 'Conference not found' }); return; }
    if (!isAdmin(req) && conf.createdById !== userId) { res.status(403).json({ message: 'Forbidden' }); return; }

    const where = {
      conferenceId,
      ...(role ? { role: role as any } : {}),
      ...(status ? { status: status as any } : {})
    };

    const hasPagination = typeof page !== 'undefined' || typeof pageSize !== 'undefined';
    if (hasPagination) {
      const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
      const sizeNum = Math.min(100, Math.max(1, parseInt(pageSize || '20', 10) || 20));
      const skip = (pageNum - 1) * sizeNum;

      const [items, total] = await Promise.all([
        prisma.conferenceParticipant.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true, organization: true, jobTitle: true } }
          },
          orderBy: [{ role: 'asc' }, { registeredAt: 'desc' }],
          skip,
          take: sizeNum
        }),
        prisma.conferenceParticipant.count({ where })
      ]);

      res.setHeader('X-Total-Count', String(total));
      res.setHeader('X-Page', String(pageNum));
      res.setHeader('X-Page-Size', String(sizeNum));
      res.json(items);
      return;
    }

    // No pagination -> return full list (backwards compatible)
    const participants = await prisma.conferenceParticipant.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, organization: true, jobTitle: true } }
      },
      orderBy: [{ role: 'asc' }, { registeredAt: 'desc' }]
    });

    res.json(participants);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

// GET /api/conferences/:id/participants/stats
export const getParticipantStats = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const conf = await prisma.conference.findUnique({ where: { id: conferenceId } });
    if (!conf) { res.status(404).json({ message: 'Conference not found' }); return; }
    if (!isAdmin(req) && conf.createdById !== userId) { res.status(403).json({ message: 'Forbidden' }); return; }

    const grouped = await prisma.conferenceParticipant.groupBy({
      by: ['role', 'status'],
      where: { conferenceId },
      _count: { _all: true }
    });

    const byRole: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const row of grouped) {
      const roleKey = row.role;
      const statusKey = row.status;
      const count = row._count._all;
      byRole[roleKey] = (byRole[roleKey] ?? 0) + count;
      byStatus[statusKey] = (byStatus[statusKey] ?? 0) + count;
    }

    const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);

    const registered = byStatus[ConferenceParticipantStatus.registered] ?? 0;
    const waitlisted = byStatus[ConferenceParticipantStatus.waitlisted] ?? 0;
    const canceled = byStatus[ConferenceParticipantStatus.canceled] ?? 0;
    const withdrawn = byStatus[ConferenceParticipantStatus.withdrawn] ?? 0;

    // Backwards-compatible fields (previously: registered-only counts)
    const attendees = grouped
      .filter((r) => r.role === ConferenceParticipationRole.attendee && r.status === ConferenceParticipantStatus.registered)
      .reduce((sum, r) => sum + r._count._all, 0);
    const presenters = grouped
      .filter((r) => r.role === ConferenceParticipationRole.presenter && r.status === ConferenceParticipantStatus.registered)
      .reduce((sum, r) => sum + r._count._all, 0);
    const authors = grouped
      .filter((r) => r.role === ConferenceParticipationRole.author && r.status === ConferenceParticipantStatus.registered)
      .reduce((sum, r) => sum + r._count._all, 0);
    const reviewers = grouped
      .filter((r) => r.role === ConferenceParticipationRole.reviewer && r.status === ConferenceParticipantStatus.registered)
      .reduce((sum, r) => sum + r._count._all, 0);

    res.json({
      total,
      byRole,
      byStatus,
      registered,
      waitlisted,
      canceled,
      withdrawn,
      attendees,
      presenters,
      authors,
      reviewers,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};
