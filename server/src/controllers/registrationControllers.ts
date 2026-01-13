import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { getUserId, isAdmin } from "../utils/authHelper";
import { Prisma, RegistrationQuestionType } from "@prisma/client";
import { checkParticipantGuardrails } from "../lib/participantGuardrails";
import { logParticipantAction, getImpersonationInfo } from "../lib/participantAuditLogging";

function normalizeOptions(raw: unknown): string[] {
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) {
    const clean = raw
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return clean;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return [];

    // Accept JSON-encoded arrays.
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const clean = parsed
            .filter((x): x is string => typeof x === "string")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          return clean;
        }
      } catch {
        // fall through
      }
    }

    // Fallback: comma-separated
    const parts = trimmed
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return parts;
  }
  return [];
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unexpected error";
}

/**
 * Phase 7: Registration Module Controllers
 * Manages registration settings, custom questions, and participant operations
 */

// ===================== REGISTRATION SETTINGS =====================

// GET /api/conferences/:id/registration/settings - Get registration settings
export const getRegistrationSettings = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
      select: {
        id: true,
        registrationEnabled: true,
        registrationOpenFrom: true,
        registrationOpenUntil: true,
        maxAttendees: true,
        capacity: true,
        waitlistEnabled: true,
        requireApproval: true,
        confirmationEmailBody: true,
        createdById: true,
      }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    // Only organizer or admin can view settings
    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    res.json(conference);
  } catch (error: unknown) {
    res.status(500).json({ message: errorMessage(error) });
  }
};

// PUT /api/conferences/:id/registration/settings - Update registration settings
export const updateRegistrationSettings = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
      select: { createdById: true }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const {
      registrationEnabled,
      registrationOpenFrom,
      registrationOpenUntil,
      maxAttendees,
      waitlistEnabled,
      requireApproval,
      confirmationEmailBody,
    } = req.body;

    const updated = await prisma.conference.update({
      where: { id: conferenceId },
      data: {
        ...(registrationEnabled !== undefined && { registrationEnabled }),
        ...(registrationOpenFrom !== undefined && { registrationOpenFrom: registrationOpenFrom ? new Date(registrationOpenFrom) : null }),
        ...(registrationOpenUntil !== undefined && { registrationOpenUntil: registrationOpenUntil ? new Date(registrationOpenUntil) : null }),
        ...(maxAttendees !== undefined && { maxAttendees }),
        ...(waitlistEnabled !== undefined && { waitlistEnabled }),
        ...(requireApproval !== undefined && { requireApproval }),
        ...(confirmationEmailBody !== undefined && { confirmationEmailBody }),
      },
      select: {
        id: true,
        registrationEnabled: true,
        registrationOpenFrom: true,
        registrationOpenUntil: true,
        maxAttendees: true,
        waitlistEnabled: true,
        requireApproval: true,
        confirmationEmailBody: true,
      }
    });

    res.json(updated);
  } catch (error: unknown) {
    res.status(500).json({ message: errorMessage(error) });
  }
};

// ===================== CUSTOM QUESTIONS =====================

// GET /api/conferences/:id/registration/questions - List all questions
export const listQuestions = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
      select: { createdById: true }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const questions = await prisma.registrationQuestion.findMany({
      where: { conferenceId },
      orderBy: { order: 'asc' }
    });

    res.json(
      questions.map((q) => ({
        ...q,
        options: normalizeOptions(q.options),
      }))
    );
  } catch (error: unknown) {
    res.status(500).json({ message: errorMessage(error) });
  }
};

// GET /api/conferences/:id/registration/questions/active - List active questions (for registration form)
export const listActiveQuestions = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);

    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
      select: { id: true }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    const questions = await prisma.registrationQuestion.findMany({
      where: { conferenceId, enabled: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        label: true,
        description: true,
        type: true,
        required: true,
        options: true,
        placeholder: true,
        validation: true,
        category: true,
      }
    });

    res.json(
      questions.map((q) => ({
        ...q,
        options: normalizeOptions(q.options),
      }))
    );
  } catch (error: unknown) {
    res.status(500).json({ message: errorMessage(error) });
  }
};

// POST /api/conferences/:id/registration/questions - Create a question
export const createQuestion = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
      select: { createdById: true }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const {
      label,
      description,
      type,
      required,
      options,
      placeholder,
      validation,
      category,
      enabled,
    } = req.body;

    if (!label) {
      res.status(400).json({ message: "Label is required" });
      return;
    }

    // Get max order for this conference
    const maxOrder = await prisma.registrationQuestion.aggregate({
      where: { conferenceId },
      _max: { order: true }
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const question = await prisma.registrationQuestion.create({
      data: {
        conferenceId,
        label,
        description,
        type: type || RegistrationQuestionType.text,
        required: required ?? false,
        ...(normalizeOptions(options).length > 0 && { options: normalizeOptions(options) }),
        placeholder,
        validation,
        category,
        enabled: enabled ?? true,
        order: nextOrder,
      }
    });

    res.status(201).json({
      ...question,
      options: normalizeOptions(question.options),
    });
  } catch (error: unknown) {
    res.status(500).json({ message: errorMessage(error) });
  }
};

// PUT /api/conferences/:id/registration/questions/:questionId - Update a question
export const updateQuestion = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);
    const questionId = Number(req.params.questionId);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
      select: { createdById: true }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const existing = await prisma.registrationQuestion.findFirst({
      where: { id: questionId, conferenceId }
    });

    if (!existing) {
      res.status(404).json({ message: "Question not found" });
      return;
    }

    const {
      label,
      description,
      type,
      required,
      options,
      placeholder,
      validation,
      category,
      enabled,
      order,
    } = req.body;

    const question = await prisma.registrationQuestion.update({
      where: { id: questionId },
      data: {
        ...(label !== undefined && { label }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(required !== undefined && { required }),
        ...(options !== undefined && {
          options: (() => {
            const normalized = normalizeOptions(options);
            return normalized.length > 0 ? normalized : Prisma.DbNull;
          })(),
        }),
        ...(placeholder !== undefined && { placeholder }),
        ...(validation !== undefined && { validation }),
        ...(category !== undefined && { category }),
        ...(enabled !== undefined && { enabled }),
        ...(order !== undefined && { order }),
      }
    });

    res.json({
      ...question,
      options: normalizeOptions(question.options),
    });
  } catch (error: unknown) {
    res.status(500).json({ message: errorMessage(error) });
  }
};

// DELETE /api/conferences/:id/registration/questions/:questionId - Delete a question
export const deleteQuestion = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);
    const questionId = Number(req.params.questionId);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
      select: { createdById: true }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const existing = await prisma.registrationQuestion.findFirst({
      where: { id: questionId, conferenceId }
    });

    if (!existing) {
      res.status(404).json({ message: "Question not found" });
      return;
    }

    await prisma.registrationQuestion.delete({ where: { id: questionId } });
    res.json({ message: "Question deleted" });
  } catch (error: unknown) {
    res.status(500).json({ message: errorMessage(error) });
  }
};

// POST /api/conferences/:id/registration/questions/reorder - Reorder questions
export const reorderQuestions = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
      select: { createdById: true }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const { questionIds } = req.body;

    if (!Array.isArray(questionIds)) {
      res.status(400).json({ message: "questionIds array is required" });
      return;
    }

    // Update order for each question
    await prisma.$transaction(
      questionIds.map((id: number, index: number) =>
        prisma.registrationQuestion.updateMany({
          where: { id, conferenceId },
          data: { order: index }
        })
      )
    );

    const questions = await prisma.registrationQuestion.findMany({
      where: { conferenceId },
      orderBy: { order: 'asc' }
    });

    res.json(
      questions.map((q) => ({
        ...q,
        options: normalizeOptions(q.options),
      }))
    );
  } catch (error: unknown) {
    res.status(500).json({ message: errorMessage(error) });
  }
};

// ===================== ENHANCED REGISTRATION =====================

// POST /api/conferences/:id/register/enhanced - Register with custom responses
export const registerWithResponses = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
      include: {
        registrationQuestions: {
          where: { enabled: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    // Check registration enabled
    if (!conference.registrationEnabled) {
      res.status(403).json({ message: "Registration is disabled for this conference" });
      return;
    }

    // Registration window gating
    const bypass = isAdmin(req) || conference.createdById === userId;
    const now = new Date();
    const registrationOpen = (!conference.registrationOpenFrom || conference.registrationOpenFrom <= now)
      && (!conference.registrationOpenUntil || conference.registrationOpenUntil >= now);
    
    if (!bypass && !registrationOpen) {
      res.status(403).json({ message: "Registration is currently closed" });
      return;
    }

    // Check capacity
    if (conference.maxAttendees) {
      const currentCount = await prisma.conferenceParticipant.count({
        where: { conferenceId, role: 'attendee', status: 'registered' }
      });
      if (currentCount >= conference.maxAttendees && !conference.waitlistEnabled) {
        res.status(403).json({ message: "Conference is at full capacity" });
        return;
      }
    }

    // Validate required custom responses
    const { customResponses } = req.body;
    const requiredQuestions = conference.registrationQuestions.filter(q => q.required);
    
    for (const question of requiredQuestions) {
      const response = customResponses?.[question.id];
      if (response === undefined || response === null || response === '') {
        res.status(400).json({ 
          message: `Missing required field: ${question.label}`,
          questionId: question.id
        });
        return;
      }
    }

    // Determine status based on waitlist and capacity
    let status: 'registered' | 'waitlisted' = 'registered';
    if (conference.maxAttendees && conference.waitlistEnabled) {
      const currentCount = await prisma.conferenceParticipant.count({
        where: { conferenceId, role: 'attendee', status: 'registered' }
      });
      if (currentCount >= conference.maxAttendees) {
        status = 'waitlisted';
      }
    }

    // Determine status based on approval requirement
    if (conference.requireApproval) {
      status = 'waitlisted'; // Use waitlisted as pending approval status
    }

    try {
      const participant = await prisma.conferenceParticipant.create({
        data: {
          userId,
          conferenceId,
          role: 'attendee',
          status,
          customResponses: customResponses || null,
        }
      });
      res.status(201).json({ ...participant, waitlisted: status === 'waitlisted' });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        res.status(400).json({ message: "Already registered" });
        return;
      }
      throw err;
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/conferences/:id/participants/:participantId - Update participant (organizer)
export const updateParticipant = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);
    const participantId = Number(req.params.participantId);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
      select: { createdById: true }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const existing = await prisma.conferenceParticipant.findFirst({
      where: { id: participantId, conferenceId },
      select: { id: true, userId: true, status: true }
    });

    if (!existing) {
      res.status(404).json({ message: "Participant not found" });
      return;
    }

    const { role, status, customResponses } = req.body;

    // Phase 4: Enforce guardrails if attempting to cancel/remove/reinstate
    if (status !== undefined && (status === 'canceled' || status === 'registered')) {
      const blockers = await checkParticipantGuardrails(conferenceId, existing.userId);
      if (blockers.length > 0) {
        res.status(409).json({
          message: "Cannot change participant status: guardrail(s) blocking this action",
          blockers,
        });
        return;
      }
    }

    const participant = await prisma.conferenceParticipant.update({
      where: { id: participantId },
      data: {
        ...(role !== undefined && { role }),
        ...(status !== undefined && { status }),
        ...(customResponses !== undefined && { customResponses }),
      },
      include: {
        user: { select: { id: true, name: true, email: true, organization: true, jobTitle: true } }
      }
    });

    // Phase 6: Audit log if status changed
    if (status !== undefined) {
      const actor = await prisma.user.findUnique({ where: { id: userId } });
      const impersonation = getImpersonationInfo(req);
      const actionMap: Record<string, "CANCEL_REGISTRATION" | "REINSTATE_REGISTRATION"> = {
        canceled: "CANCEL_REGISTRATION",
        registered: "REINSTATE_REGISTRATION",
      };
      const action = actionMap[status];
      if (action) {
        logParticipantAction({
          entityType: "ConferenceParticipant",
          action,
          actorId: userId,
          actorEmail: actor?.email || "unknown",
          targetUserId: existing.userId,
          conferenceId,
          reason: (req.body as Record<string, unknown>).reason as string | undefined,
          notes: (req.body as Record<string, unknown>).notes as string | undefined,
          isImpersonation: impersonation.isImpersonation,
          realAdminId: impersonation.realAdminId,
          realAdminEmail: impersonation.realAdminEmail,
          timestamp: new Date(),
        });
      }
    }

    res.json(participant);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    res.status(500).json({ message });
  }
};

// DELETE /api/conferences/:id/participants/:participantId - Remove participant (organizer)
export const removeParticipant = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);
    const participantId = Number(req.params.participantId);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
      select: { createdById: true }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const existing = await prisma.conferenceParticipant.findFirst({
      where: { id: participantId, conferenceId },
      select: { id: true, userId: true, status: true }
    });

    if (!existing) {
      res.status(404).json({ message: "Participant not found" });
      return;
    }

    if (existing.status === 'canceled' || existing.status === 'withdrawn') {
      res.json({ message: 'Participant already inactive' });
      return;
    }

    // Phase 4: Enforce guardrails before removal
    const blockers = await checkParticipantGuardrails(conferenceId, existing.userId);
    if (blockers.length > 0) {
      res.status(409).json({
        message: "Cannot remove participant: guardrail(s) blocking this action",
        blockers,
      });
      return;
    }

    // Organizer removal is a status transition, not deletion.
    await prisma.conferenceParticipant.update({
      where: { id: participantId },
      data: { status: 'canceled' },
    });

    // Phase 6: Audit log
    const actor = await prisma.user.findUnique({ where: { id: userId } });
    const impersonation = getImpersonationInfo(req);
    logParticipantAction({
      entityType: "ConferenceParticipant",
      action: "REMOVE_FROM_ACTIVE_LIST",
      actorId: userId,
      actorEmail: actor?.email || "unknown",
      targetUserId: existing.userId,
      conferenceId,
      reason: (req.body as Record<string, unknown>).reason as string | undefined,
      notes: (req.body as Record<string, unknown>).notes as string | undefined,
      isImpersonation: impersonation.isImpersonation,
      realAdminId: impersonation.realAdminId,
      realAdminEmail: impersonation.realAdminEmail,
      timestamp: new Date(),
    });

    res.json({ message: 'Participant canceled' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

// POST /api/conferences/:id/participants/:participantId/approve - Approve waitlisted participant
export const approveParticipant = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);
    const participantId = Number(req.params.participantId);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
      select: { createdById: true }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const existing = await prisma.conferenceParticipant.findFirst({
      where: { id: participantId, conferenceId }
    });

    if (!existing) {
      res.status(404).json({ message: "Participant not found" });
      return;
    }

    if (existing.status !== 'waitlisted') {
      res.status(400).json({ message: "Participant is not on waitlist" });
      return;
    }

    const participant = await prisma.conferenceParticipant.update({
      where: { id: participantId },
      data: { status: 'registered' },
      include: {
        user: { select: { id: true, name: true, email: true, organization: true, jobTitle: true } }
      }
    });

    // Phase 6: Audit log
    const actor = await prisma.user.findUnique({ where: { id: userId } });
    const impersonation = getImpersonationInfo(req);
    logParticipantAction({
      entityType: "ConferenceParticipant",
      action: "APPROVE_FROM_WAITLIST",
      actorId: userId,
      actorEmail: actor?.email || "unknown",
      targetUserId: existing.userId,
      conferenceId,
      isImpersonation: impersonation.isImpersonation,
      realAdminId: impersonation.realAdminId,
      realAdminEmail: impersonation.realAdminEmail,
      timestamp: new Date(),
    });

    res.json(participant);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/conferences/:id/registration/overview - Get registration overview stats
export const getRegistrationOverview = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
      select: {
        id: true,
        name: true,
        registrationEnabled: true,
        registrationOpenFrom: true,
        registrationOpenUntil: true,
        maxAttendees: true,
        waitlistEnabled: true,
        requireApproval: true,
        createdById: true,
      }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    // Get counts by status and role
    const [
      totalRegistered,
      totalWaitlisted,
      totalCanceled,
      attendees,
      presenters,
      authors,
      reviewers,
      sponsors,
      volunteers,
      recentRegistrations
    ] = await Promise.all([
      prisma.conferenceParticipant.count({ where: { conferenceId, status: 'registered' } }),
      prisma.conferenceParticipant.count({ where: { conferenceId, status: 'waitlisted' } }),
      prisma.conferenceParticipant.count({ where: { conferenceId, status: 'canceled' } }),
      prisma.conferenceParticipant.count({ where: { conferenceId, role: 'attendee', status: 'registered' } }),
      prisma.conferenceParticipant.count({ where: { conferenceId, role: 'presenter', status: 'registered' } }),
      prisma.conferenceParticipant.count({ where: { conferenceId, role: 'author', status: 'registered' } }),
      prisma.conferenceParticipant.count({ where: { conferenceId, role: 'reviewer', status: 'registered' } }),
      prisma.conferenceParticipant.count({ where: { conferenceId, role: 'sponsor', status: 'registered' } }),
      prisma.conferenceParticipant.count({ where: { conferenceId, role: 'volunteer', status: 'registered' } }),
      prisma.conferenceParticipant.findMany({
        where: { conferenceId },
        orderBy: { registeredAt: 'desc' },
        take: 10,
        include: {
          user: { select: { id: true, name: true, email: true, organization: true } }
        }
      })
    ]);

    // Registration trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const registrationsByDay = await prisma.conferenceParticipant.groupBy({
      by: ['registeredAt'],
      where: {
        conferenceId,
        registeredAt: { gte: sevenDaysAgo }
      },
      _count: { id: true }
    });

    // Calculate registration window status
    const now = new Date();
    let windowStatus: 'not_started' | 'open' | 'closed' = 'open';
    if (conference.registrationOpenFrom && conference.registrationOpenFrom > now) {
      windowStatus = 'not_started';
    } else if (conference.registrationOpenUntil && conference.registrationOpenUntil < now) {
      windowStatus = 'closed';
    }

    res.json({
      conference: {
        id: conference.id,
        name: conference.name,
        registrationEnabled: conference.registrationEnabled,
        maxAttendees: conference.maxAttendees,
        waitlistEnabled: conference.waitlistEnabled,
        requireApproval: conference.requireApproval,
        windowStatus,
        registrationOpenFrom: conference.registrationOpenFrom,
        registrationOpenUntil: conference.registrationOpenUntil,
      },
      counts: {
        total: totalRegistered + totalWaitlisted,
        registered: totalRegistered,
        waitlisted: totalWaitlisted,
        canceled: totalCanceled,
        byRole: {
          attendees,
          presenters,
          authors,
          reviewers,
          sponsors,
          volunteers,
        },
        capacityUsed: conference.maxAttendees 
          ? Math.round((attendees / conference.maxAttendees) * 100) 
          : null,
      },
      recentRegistrations,
      trend: registrationsByDay,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/conferences/:id/participants/export - Export participants to CSV
export const exportParticipants = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
      include: {
        registrationQuestions: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const participants = await prisma.conferenceParticipant.findMany({
      where: { conferenceId },
      include: {
        user: { select: { id: true, name: true, email: true, organization: true, jobTitle: true } }
      },
      orderBy: { registeredAt: 'desc' }
    });

    // Build CSV
    const questions = (conference as any).registrationQuestions || [];
    const headers = [
      'Name',
      'Email',
      'Organization',
      'Job Title',
      'Role',
      'Status',
      'Registered At',
      ...questions.map((q: any) => q.label)
    ];

    const rows = participants.map(p => {
      const customResponses = p.customResponses as Record<string, any> || {};
      return [
        p.user.name,
        p.user.email,
        p.user.organization || '',
        p.user.jobTitle || '',
        p.role,
        p.status,
        p.registeredAt.toISOString(),
        ...questions.map((q: any) => customResponses[q.id] || '')
      ];
    });

    const csv = [headers, ...rows].map(row => 
      row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="participants-${conferenceId}.csv"`);
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
