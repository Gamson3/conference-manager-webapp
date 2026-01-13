import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { parseNumericId, sendError } from "../utils/httpError";

function requireConferenceId(req: Request, res: Response): number | null {
  const raw = req.params.conferenceId ?? req.params.id;
  if (!raw) {
    sendError(res, 400, "INVALID_ARGUMENT", "Conference ID is required");
    return null;
  }
  const parsed = parseNumericId(raw, "Conference ID");
  if (!parsed.ok) {
    sendError(res, 400, "INVALID_ARGUMENT", parsed.message);
    return null;
  }
  return parsed.value;
}

function isPrismaKnownRequestError(
  error: unknown
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

// Helper to ensure the requester owns the conference or is admin
async function ensureConferenceAccess(
  req: Request,
  conferenceId: number
): Promise<
  | { ok: true }
  | { ok: false; status: number; code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND"; message: string }
> {
  const user = req.user;
  if (!user) {
    return { ok: false, status: 401, code: "UNAUTHENTICATED", message: "Unauthorized" };
  }

  // Admins can manage any conference
  if (user.role === "admin") return { ok: true };

  // Verify conference exists and is owned by this user
  const conf = await prisma.conference.findUnique({ where: { id: conferenceId }, select: { id: true, createdById: true } });
  if (!conf) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "Conference not found" };
  }
  if (conf.createdById !== user.id) {
    return { ok: false, status: 403, code: "FORBIDDEN", message: "You do not have permission to manage this conference." };
  }
  return { ok: true };
}

// ========== Categories ==========
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const conferenceId = requireConferenceId(req, res);
    if (conferenceId == null) return;
    const access = await ensureConferenceAccess(req, conferenceId);
    if (!access.ok) {
      sendError(res, access.status, access.code, access.message);
      return;
    }

    const categories = await prisma.conferenceCategory.findMany({
      where: { conferenceId },
      orderBy: { name: "asc" }
    });

    // Usage counts: presentations referencing this category in this conference
    const presCounts = await prisma.presentation.groupBy({
      by: ["categoryId"],
      where: { category: { conferenceId } },
      _count: { _all: true }
    });
    const presCountMap = new Map<number, number>();
    for (const row of presCounts) {
      const key = row.categoryId;
      if (key != null) presCountMap.set(key, row._count._all);
    }

    const enriched = categories.map((c) => ({ ...c, presentationsCount: presCountMap.get(c.id) ?? 0 }));
    res.json(enriched);
  } catch (error: unknown) {
    console.error("Error loading categories:", error);
    sendError(res, 500, "INTERNAL", "Failed to load categories.");
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const conferenceId = requireConferenceId(req, res);
    if (conferenceId == null) return;
    const { name, description } = req.body as { name: string; description?: string };
    if (!name || !name.trim()) {
      sendError(res, 400, "INVALID_ARGUMENT", "Name is required");
      return;
    }

    const access = await ensureConferenceAccess(req, conferenceId);
    if (!access.ok) {
      sendError(res, access.status, access.code, access.message);
      return;
    }

    const category = await prisma.conferenceCategory.create({
      data: { conferenceId, name: name.trim(), description }
    });
    res.status(201).json(category);
  } catch (error: unknown) {
    if (isPrismaKnownRequestError(error) && error.code === "P2002") {
      sendError(res, 409, "CONFLICT", "Category with this name already exists");
      return;
    }
    console.error("Error creating category:", error);
    sendError(res, 500, "INTERNAL", "Failed to create category.");
  }
};

// ========== Schedule Publish Toggle ==========
export const publishSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const conferenceId = requireConferenceId(req, res);
    if (conferenceId == null) return;
    const access = await ensureConferenceAccess(req, conferenceId);
    if (!access.ok) {
      sendError(res, access.status, access.code, access.message);
      return;
    }

    const updated = await prisma.conference.update({
      where: { id: conferenceId },
      data: { schedulePublishedAt: new Date(), updatedAt: new Date() },
      select: { id: true, schedulePublishedAt: true }
    });
    res.json(updated);
  } catch (error: unknown) {
    console.error("Error publishing schedule:", error);
    sendError(res, 500, "INTERNAL", "Failed to publish schedule.");
  }
};

export const unpublishSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const conferenceId = requireConferenceId(req, res);
    if (conferenceId == null) return;
    const access = await ensureConferenceAccess(req, conferenceId);
    if (!access.ok) {
      sendError(res, access.status, access.code, access.message);
      return;
    }

    const updated = await prisma.conference.update({
      where: { id: conferenceId },
      data: { schedulePublishedAt: null, updatedAt: new Date() },
      select: { id: true, schedulePublishedAt: true }
    });
    res.json(updated);
  } catch (error: unknown) {
    console.error("Error unpublishing schedule:", error);
    sendError(res, 500, "INTERNAL", "Failed to unpublish schedule.");
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const conferenceId = requireConferenceId(req, res);
    if (conferenceId == null) return;

    const parsedCategoryId = parseNumericId(req.params.categoryId, "Category ID");
    if (!parsedCategoryId.ok) {
      sendError(res, 400, "INVALID_ARGUMENT", parsedCategoryId.message);
      return;
    }

    const { name, description } = req.body as { name?: string; description?: string };

    const access = await ensureConferenceAccess(req, conferenceId);
    if (!access.ok) {
      sendError(res, access.status, access.code, access.message);
      return;
    }

    const id = parsedCategoryId.value;
    const existing = await prisma.conferenceCategory.findFirst({ where: { id, conferenceId } });
    if (!existing) {
      sendError(res, 404, "NOT_FOUND", "Category not found");
      return;
    }

    const updated = await prisma.conferenceCategory.update({
      where: { id },
      data: {
        name: name?.trim() ?? existing.name,
        description: description ?? existing.description,
      },
    });
    res.json(updated);
  } catch (error: unknown) {
    if (isPrismaKnownRequestError(error) && error.code === "P2002") {
      sendError(res, 409, "CONFLICT", "Category with this name already exists");
      return;
    }
    console.error("Error updating category:", error);
    sendError(res, 500, "INTERNAL", "Failed to update category.");
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const conferenceId = requireConferenceId(req, res);
    if (conferenceId == null) return;

    const parsedCategoryId = parseNumericId(req.params.categoryId, "Category ID");
    if (!parsedCategoryId.ok) {
      sendError(res, 400, "INVALID_ARGUMENT", parsedCategoryId.message);
      return;
    }

    const access = await ensureConferenceAccess(req, conferenceId);
    if (!access.ok) {
      sendError(res, access.status, access.code, access.message);
      return;
    }

    const id = parsedCategoryId.value;
    const existing = await prisma.conferenceCategory.findFirst({ where: { id, conferenceId } });
    if (!existing) {
      sendError(res, 404, "NOT_FOUND", "Category not found");
      return;
    }

    // Guard: block deletion if any presentation references this category
    const usage = await prisma.presentation.count({ where: { categoryId: id } });
    if (usage > 0) {
      sendError(
        res,
        409,
        "CONFLICT",
        `Cannot delete category in use by ${usage} presentation${usage === 1 ? "" : "s"}`
      );
      return;
    }

    await prisma.conferenceCategory.delete({ where: { id } });
    res.status(204).send();
  } catch (error: unknown) {
    console.error("Error deleting category:", error);
    sendError(res, 500, "INTERNAL", "Failed to delete category.");
  }
};

// ========== Presentation Types ==========
export const getTypes = async (req: Request, res: Response): Promise<void> => {
  try {
    const conferenceId = requireConferenceId(req, res);
    if (conferenceId == null) return;
    const access = await ensureConferenceAccess(req, conferenceId);
    if (!access.ok) {
      sendError(res, access.status, access.code, access.message);
      return;
    }

    const types = await prisma.presentationType.findMany({
      where: { conferenceId },
      orderBy: { id: "asc" }
    });

    // Usage counts (presentations referencing this type)
    // Filter presentations through the type relation to ensure we only look at this conference's types.
    // Presentation itself does not have conferenceId; it's linked via section and optional type/category.
    // We only need presentations that reference a type belonging to this conference.
    const presCounts = await prisma.presentation.groupBy({
      by: ["typeId"],
      where: { type: { conferenceId } },
      _count: { _all: true }
    });
    const presCountMap = new Map<number, number>();
    for (const row of presCounts) {
      const key = row.typeId;
      if (key != null) presCountMap.set(key, row._count._all);
    }

    const enriched = types.map((t) => ({ ...t, presentationsCount: presCountMap.get(t.id) ?? 0 }));
    res.json(enriched);
  } catch (error: unknown) {
    console.error("Error loading types:", error);
    sendError(res, 500, "INTERNAL", "Failed to load presentation types.");
  }
};

export const createType = async (req: Request, res: Response): Promise<void> => {
  try {
    const conferenceId = requireConferenceId(req, res);
    if (conferenceId == null) return;
    const { name, description, defaultDuration, maxPerConference } = req.body as { name: string; description?: string; defaultDuration?: number; maxPerConference?: number };
    if (!name || !name.trim()) {
      sendError(res, 400, "INVALID_ARGUMENT", "Name is required");
      return;
    }

    const access = await ensureConferenceAccess(req, conferenceId);
    if (!access.ok) {
      sendError(res, access.status, access.code, access.message);
      return;
    }

    const type = await prisma.presentationType.create({
      data: { conferenceId, name: name.trim(), description, defaultDuration, maxPerConference: typeof maxPerConference === 'number' ? maxPerConference : undefined }
    });
    res.status(201).json(type);
  } catch (error: unknown) {
    if (isPrismaKnownRequestError(error) && error.code === "P2002") {
      sendError(res, 409, "CONFLICT", "Type with this name already exists");
      return;
    }
    console.error("Error creating type:", error);
    sendError(res, 500, "INTERNAL", "Failed to create presentation type.");
  }
};

export const updateType = async (req: Request, res: Response): Promise<void> => {
  try {
    const conferenceId = requireConferenceId(req, res);
    if (conferenceId == null) return;
    const parsedTypeId = parseNumericId(req.params.typeId, "Type ID");
    if (!parsedTypeId.ok) {
      sendError(res, 400, "INVALID_ARGUMENT", parsedTypeId.message);
      return;
    }

    const id = parsedTypeId.value;
    const { name, description, defaultDuration, maxPerConference } = req.body as { name?: string; description?: string; defaultDuration?: number; maxPerConference?: number };

    const access = await ensureConferenceAccess(req, conferenceId);
    if (!access.ok) {
      sendError(res, access.status, access.code, access.message);
      return;
    }

    const existing = await prisma.presentationType.findFirst({ where: { id, conferenceId } });
    if (!existing) {
      sendError(res, 404, "NOT_FOUND", "Type not found");
      return;
    }

    const updated = await prisma.presentationType.update({
      where: { id },
      data: {
        name: name?.trim() ?? existing.name,
        description: description ?? existing.description,
        defaultDuration: typeof defaultDuration === "number" ? defaultDuration : existing.defaultDuration,
        maxPerConference: typeof maxPerConference === 'number' ? maxPerConference : existing.maxPerConference,
      }
    });
    res.json(updated);
  } catch (error: unknown) {
    if (isPrismaKnownRequestError(error) && error.code === "P2002") {
      sendError(res, 409, "CONFLICT", "Type with this name already exists");
      return;
    }
    console.error("Error updating type:", error);
    sendError(res, 500, "INTERNAL", "Failed to update presentation type.");
  }
};

export const deleteType = async (req: Request, res: Response): Promise<void> => {
  try {
    const conferenceId = requireConferenceId(req, res);
    if (conferenceId == null) return;

    const parsedTypeId = parseNumericId(req.params.typeId, "Type ID");
    if (!parsedTypeId.ok) {
      sendError(res, 400, "INVALID_ARGUMENT", parsedTypeId.message);
      return;
    }

    const id = parsedTypeId.value;
    const access = await ensureConferenceAccess(req, conferenceId);
    if (!access.ok) {
      sendError(res, access.status, access.code, access.message);
      return;
    }

    const existing = await prisma.presentationType.findFirst({ where: { id, conferenceId } });
    if (!existing) {
      sendError(res, 404, "NOT_FOUND", "Type not found");
      return;
    }

    // Guard: prevent deletion if any presentation references this type
    const usage = await prisma.presentation.count({ where: { typeId: id } });
    if (usage > 0) {
      sendError(
        res,
        409,
        "CONFLICT",
        `Cannot delete type in use by ${usage} presentation${usage === 1 ? "" : "s"}`
      );
      return;
    }

    await prisma.presentationType.delete({ where: { id } });
    res.status(204).send();
  } catch (error: unknown) {
    console.error("Error deleting type:", error);
    sendError(res, 500, "INTERNAL", "Failed to delete presentation type.");
  }
};

// ========== Submission Requirements (single per conf) ==========
export const getRequirements = async (req: Request, res: Response): Promise<void> => {
  try {
    const conferenceId = requireConferenceId(req, res);
    if (conferenceId == null) return;
    const access = await ensureConferenceAccess(req, conferenceId);
    if (!access.ok) {
      sendError(res, access.status, access.code, access.message);
      return;
    }

    const reqs = await prisma.submissionRequirement.findUnique({ where: { conferenceId } });
    res.json(reqs);
  } catch (error: unknown) {
    console.error("Error loading requirements:", error);
    sendError(res, 500, "INTERNAL", "Failed to load submission requirements.");
  }
};

export const upsertRequirements = async (req: Request, res: Response): Promise<void> => {
  try {
    const conferenceId = requireConferenceId(req, res);
    if (conferenceId == null) return;
    const { minKeywords, maxKeywords, abstractMinLength, abstractMaxLength, requiresOrcid,
      maxFileSizeMB, allowedFileTypes,
      titleMaxWords, bodyTextLabel, bodyTextMinWords, bodyTextMaxWords,
      authorsEnabled, collectAuthorEmail, collectAuthorAffiliation, collectAuthorPhone, collectAuthorOrcid,
      abstractUploadMode, fileFieldLabel, fileFieldRequired,
      collectFullText, fullTextTiming,
      } = req.body as {
        minKeywords?: number;
        maxKeywords?: number;
        abstractMinLength?: number;
        abstractMaxLength?: number;
        requiresOrcid?: boolean;
        maxFileSizeMB?: number;
        allowedFileTypes?: string[];
        titleMaxWords?: number;
        bodyTextLabel?: string;
        bodyTextMinWords?: number;
        bodyTextMaxWords?: number;
        authorsEnabled?: boolean;
        collectAuthorEmail?: boolean;
        collectAuthorAffiliation?: boolean;
        collectAuthorPhone?: boolean;
        collectAuthorOrcid?: boolean;
        abstractUploadMode?: "TEXT" | "FILE" | "BOTH";
        fileFieldLabel?: string;
        fileFieldRequired?: boolean;
        collectFullText?: boolean;
        fullTextTiming?: "onSubmission" | "afterAcceptance";
      };

    const access = await ensureConferenceAccess(req, conferenceId);
    if (!access.ok) {
      sendError(res, access.status, access.code, access.message);
      return;
    }

    const storedMaxKeywords = typeof maxKeywords === 'number' ? maxKeywords : undefined;
    const storedMinKeywords = typeof minKeywords === 'number' ? minKeywords : undefined;
    const keywordsDisabled = storedMaxKeywords != null && storedMaxKeywords <= 0;
    const keywordsEnabled = !keywordsDisabled && (storedMaxKeywords != null || storedMinKeywords != null);

    const normalizedMaxKeywords = keywordsEnabled
      ? Math.max(5, storedMaxKeywords ?? 8)
      : (keywordsDisabled ? 0 : storedMaxKeywords);
    const normalizedMinKeywords = keywordsEnabled
      ? Math.min(normalizedMaxKeywords ?? 8, Math.max(5, storedMinKeywords ?? 5))
      : (keywordsDisabled ? 0 : storedMinKeywords);

    const normalizedAuthorsEnabled = typeof authorsEnabled === 'boolean' ? authorsEnabled : undefined;
    const normalizedCollectAuthorEmail =
      normalizedAuthorsEnabled === false ? false : collectAuthorEmail;
    const normalizedCollectAuthorAffiliation =
      normalizedAuthorsEnabled === false ? false : collectAuthorAffiliation;
    const normalizedCollectAuthorPhone =
      normalizedAuthorsEnabled === false ? false : collectAuthorPhone;
    const normalizedCollectAuthorOrcid =
      normalizedAuthorsEnabled === false
        ? false
        : (requiresOrcid === true ? true : collectAuthorOrcid);
    const normalizedRequiresOrcid =
      normalizedAuthorsEnabled === false ? false : requiresOrcid;

    const updated = await prisma.submissionRequirement.upsert({
      where: { conferenceId },
      create: {
        conferenceId,
        minKeywords: (keywordsEnabled || keywordsDisabled) ? normalizedMinKeywords : minKeywords,
        maxKeywords: (keywordsEnabled || keywordsDisabled) ? normalizedMaxKeywords : maxKeywords,
        abstractMinLength,
        abstractMaxLength,
        requiresOrcid: normalizedRequiresOrcid ?? false,
        maxFileSizeMB,
        allowedFileTypes: allowedFileTypes ?? [],
        titleMaxWords,
        bodyTextLabel: bodyTextLabel?.trim() || undefined,
        bodyTextMinWords,
        bodyTextMaxWords,
        authorsEnabled: normalizedAuthorsEnabled ?? true,
        collectAuthorEmail: normalizedCollectAuthorEmail ?? true,
        collectAuthorAffiliation: normalizedCollectAuthorAffiliation ?? true,
        collectAuthorPhone: normalizedCollectAuthorPhone ?? false,
        collectAuthorOrcid: normalizedCollectAuthorOrcid ?? false,
        abstractUploadMode: abstractUploadMode ?? "TEXT",
        fileFieldLabel: fileFieldLabel?.trim() || undefined,
        fileFieldRequired: fileFieldRequired ?? false,
        collectFullText: collectFullText ?? false,
        fullTextTiming: fullTextTiming ?? "onSubmission",
      },
      update: {
        minKeywords: (keywordsEnabled || keywordsDisabled) ? normalizedMinKeywords : minKeywords,
        maxKeywords: (keywordsEnabled || keywordsDisabled) ? normalizedMaxKeywords : maxKeywords,
        abstractMinLength,
        abstractMaxLength,
        requiresOrcid: normalizedRequiresOrcid,
        maxFileSizeMB,
        allowedFileTypes: allowedFileTypes ?? [],
        titleMaxWords,
        bodyTextLabel: bodyTextLabel?.trim() || undefined,
        bodyTextMinWords,
        bodyTextMaxWords,
        authorsEnabled: normalizedAuthorsEnabled,
        collectAuthorEmail: normalizedCollectAuthorEmail,
        collectAuthorAffiliation: normalizedCollectAuthorAffiliation,
        collectAuthorPhone: normalizedCollectAuthorPhone,
        collectAuthorOrcid: normalizedCollectAuthorOrcid,
        abstractUploadMode,
        fileFieldLabel: fileFieldLabel?.trim() || undefined,
        fileFieldRequired,
        collectFullText,
        fullTextTiming,
      }
    });
    res.json(updated);
  } catch (error: unknown) {
    console.error("Error updating requirements:", error);
    sendError(res, 500, "INTERNAL", "Failed to update submission requirements.");
  }
};

// ========== Timeline Milestones ==========
export const getMilestones = async (req: Request, res: Response): Promise<void> => {
  try {
    const conferenceId = requireConferenceId(req, res);
    if (conferenceId == null) return;
    const access = await ensureConferenceAccess(req, conferenceId);
    if (!access.ok) {
      sendError(res, access.status, access.code, access.message);
      return;
    }

    const milestones = await prisma.timelineMilestone.findMany({
      where: { conferenceId },
      orderBy: { date: "asc" }
    });
    res.json(milestones);
  } catch (error: unknown) {
    console.error("Error loading milestones:", error);
    sendError(res, 500, "INTERNAL", "Failed to load milestones.");
  }
};

export const createMilestone = async (req: Request, res: Response): Promise<void> => {
  try {
    const conferenceId = requireConferenceId(req, res);
    if (conferenceId == null) return;
    const { name, date, description, type } = req.body as {
      name: string;
      date: string | Date;
      description?: string;
      type?: string;
    };
    if (!name || !name.trim()) {
      sendError(res, 400, "INVALID_ARGUMENT", "Name is required");
      return;
    }
    if (!date) {
      sendError(res, 400, "INVALID_ARGUMENT", "Date is required");
      return;
    }

    const access = await ensureConferenceAccess(req, conferenceId);
    if (!access.ok) {
      sendError(res, access.status, access.code, access.message);
      return;
    }

    const milestone = await prisma.timelineMilestone.create({
      data: { conferenceId, name: name.trim(), date: new Date(date), description, type }
    });
    res.status(201).json(milestone);
  } catch (error: unknown) {
    console.error("Error creating milestone:", error);
    sendError(res, 500, "INTERNAL", "Failed to create milestone.");
  }
};

export const updateMilestone = async (req: Request, res: Response): Promise<void> => {
  try {
    const conferenceId = requireConferenceId(req, res);
    if (conferenceId == null) return;

    const parsedMilestoneId = parseNumericId(req.params.milestoneId, "Milestone ID");
    if (!parsedMilestoneId.ok) {
      sendError(res, 400, "INVALID_ARGUMENT", parsedMilestoneId.message);
      return;
    }

    const id = parsedMilestoneId.value;
    const { name, date, description, type } = req.body as {
      name?: string;
      date?: string | Date;
      description?: string;
      type?: string;
    };

    const access = await ensureConferenceAccess(req, conferenceId);
    if (!access.ok) {
      sendError(res, access.status, access.code, access.message);
      return;
    }

    const existing = await prisma.timelineMilestone.findFirst({ where: { id, conferenceId } });
    if (!existing) {
      sendError(res, 404, "NOT_FOUND", "Milestone not found");
      return;
    }

    const updated = await prisma.timelineMilestone.update({
      where: { id },
      data: {
        name: name?.trim() ?? existing.name,
        date: date ? new Date(date) : existing.date,
        description: description ?? existing.description,
        type: type ?? existing.type,
      }
    });
    res.json(updated);
  } catch (error: unknown) {
    if (isPrismaKnownRequestError(error) && error.code === "P2002") {
      sendError(res, 409, "CONFLICT", "Milestone key must be unique for this conference");
      return;
    }
    console.error("Error updating milestone:", error);
    sendError(res, 500, "INTERNAL", "Failed to update milestone.");
  }
};

export const deleteMilestone = async (req: Request, res: Response): Promise<void> => {
  try {
    const conferenceId = requireConferenceId(req, res);
    if (conferenceId == null) return;

    const parsedMilestoneId = parseNumericId(req.params.milestoneId, "Milestone ID");
    if (!parsedMilestoneId.ok) {
      sendError(res, 400, "INVALID_ARGUMENT", parsedMilestoneId.message);
      return;
    }

    const id = parsedMilestoneId.value;
    const access = await ensureConferenceAccess(req, conferenceId);
    if (!access.ok) {
      sendError(res, access.status, access.code, access.message);
      return;
    }

    const existing = await prisma.timelineMilestone.findFirst({ where: { id, conferenceId } });
    if (!existing) {
      sendError(res, 404, "NOT_FOUND", "Milestone not found");
      return;
    }

    await prisma.timelineMilestone.delete({ where: { id } });
    res.status(204).send();
  } catch (error: unknown) {
    console.error("Error deleting milestone:", error);
    sendError(res, 500, "INTERNAL", "Failed to delete milestone.");
  }
};

// ========== Quick Actions: CFP & Registration Windows ==========
export const openCfpWindow = async (req: Request, res: Response): Promise<void> => {
  try {
    const conferenceId = requireConferenceId(req, res);
    if (conferenceId == null) return;
    const access = await ensureConferenceAccess(req, conferenceId);
    if (!access.ok) {
      sendError(res, access.status, access.code, access.message);
      return;
    }

    const conf = await prisma.conference.findUnique({ where: { id: conferenceId } });
    if (!conf) {
      sendError(res, 404, "NOT_FOUND", "Conference not found");
      return;
    }
    const now = new Date();
    const until = conf.startDate ? new Date(conf.startDate) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const updated = await prisma.conference.update({
      where: { id: conferenceId },
      data: { submissionsOpenFrom: now, submissionsOpenUntil: until, updatedAt: new Date() },
      select: { id: true, submissionsOpenFrom: true, submissionsOpenUntil: true }
    });
    res.json(updated);
  } catch (error: unknown) {
    console.error("Error opening CFP window:", error);
    sendError(res, 500, "INTERNAL", "Failed to open CFP window.");
  }
};

export const closeCfpWindow = async (req: Request, res: Response): Promise<void> => {
  try {
    const conferenceId = requireConferenceId(req, res);
    if (conferenceId == null) return;
    const access = await ensureConferenceAccess(req, conferenceId);
    if (!access.ok) {
      sendError(res, access.status, access.code, access.message);
      return;
    }

    const updated = await prisma.conference.update({
      where: { id: conferenceId },
      data: { submissionsOpenFrom: null, submissionsOpenUntil: null, updatedAt: new Date() },
      select: { id: true, submissionsOpenFrom: true, submissionsOpenUntil: true }
    });
    res.json(updated);
  } catch (error: unknown) {
    console.error("Error closing CFP window:", error);
    sendError(res, 500, "INTERNAL", "Failed to close CFP window.");
  }
};

export const openRegistrationWindow = async (req: Request, res: Response): Promise<void> => {
  try {
    const conferenceId = requireConferenceId(req, res);
    if (conferenceId == null) return;
    const access = await ensureConferenceAccess(req, conferenceId);
    if (!access.ok) {
      sendError(res, access.status, access.code, access.message);
      return;
    }

    const conf = await prisma.conference.findUnique({ where: { id: conferenceId } });
    if (!conf) {
      sendError(res, 404, "NOT_FOUND", "Conference not found");
      return;
    }
    const now = new Date();
    const until = conf.endDate ? new Date(conf.endDate) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const updated = await prisma.conference.update({
      where: { id: conferenceId },
      data: { registrationOpenFrom: now, registrationOpenUntil: until, updatedAt: new Date() },
      select: { id: true, registrationOpenFrom: true, registrationOpenUntil: true }
    });
    res.json(updated);
  } catch (error: unknown) {
    console.error("Error opening registration window:", error);
    sendError(res, 500, "INTERNAL", "Failed to open registration window.");
  }
};

export const closeRegistrationWindow = async (req: Request, res: Response): Promise<void> => {
  try {
    const conferenceId = requireConferenceId(req, res);
    if (conferenceId == null) return;
    const access = await ensureConferenceAccess(req, conferenceId);
    if (!access.ok) {
      sendError(res, access.status, access.code, access.message);
      return;
    }

    const updated = await prisma.conference.update({
      where: { id: conferenceId },
      data: { registrationOpenFrom: null, registrationOpenUntil: null, updatedAt: new Date() },
      select: { id: true, registrationOpenFrom: true, registrationOpenUntil: true }
    });
    res.json(updated);
  } catch (error: unknown) {
    console.error("Error closing registration window:", error);
    sendError(res, 500, "INTERNAL", "Failed to close registration window.");
  }
};
