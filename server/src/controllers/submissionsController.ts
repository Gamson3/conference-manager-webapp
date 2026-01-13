import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getUserId, isAdmin } from '../utils/authHelper';
import { ensurePresentationForAcceptedSubmission, SubmissionWithAuthor } from '../utils/submissionToPresentation';
import { AbstractUploadMode, FullTextTiming, Prisma, SubmissionStatus } from '@prisma/client';
import { resolveConferenceId } from '../utils/conferenceResolver';
import fs from 'fs/promises';
import { buildPublicFileUrl, getPublicPathForSubmissionFile } from '../middleware/submissionUpload';
import { logAdminAction } from '../lib/auditLogger';
import { assertConsentStillValid } from './submissionAssistanceController';
import {
  isR2Active,
  uploadFile,
  generateStorageKey,
  deleteFile as deleteStorageFile,
} from '../lib/storage';

type SubmissionDraftInput = {
  title?: string;
  abstract?: string;
  keywords?: string[];
  typeId?: number | null;
  categoryId?: number | null;
  authorEmail?: string | null;
  authorAffiliation?: string | null;
  authorPhone?: string | null;
  authorOrcid?: string | null;
  authors?: Array<{
    firstName?: string;
    lastName?: string;
    email?: string | null;
    affiliation?: string | null;
    phone?: string | null;
    orcid?: string | null;
    isPresentingAuthor?: boolean;
  }>;
  inviteCode?: string;
  // Delegation: organizer can act on behalf of an author
  onBehalfOfUserId?: number;
};

type SubmissionRequirementSnapshot = {
  abstractUploadMode: AbstractUploadMode;
  fileFieldRequired: boolean;
  maxFileSizeMB: number;
  allowedFileTypes: string[];
  minKeywords: number;
  maxKeywords: number;
  abstractMinLength: number;
  abstractMaxLength: number;
  bodyTextMinWords?: number;
  bodyTextMaxWords?: number;
  titleMaxWords?: number;
  authorsEnabled: boolean;
  collectAuthorEmail: boolean;
  collectAuthorAffiliation: boolean;
  collectAuthorPhone: boolean;
  collectAuthorOrcid: boolean;
  requiresOrcid: boolean;
  collectFullText: boolean;
  fullTextTiming?: FullTextTiming;
};

type SubmissionAuthorEntryForValidation = {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  email: string | null;
  affiliations: string[];
  phone: string | null;
  orcid: string | null;
  order: number;
  isPresenter: boolean;
  isExternal: boolean;
};

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

function parseOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseOptionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') return undefined;
    const trimmed = item.trim();
    if (trimmed.length > 0) out.push(trimmed);
  }
  return out;
}

function parseOptionalNullableString(value: unknown): string | null | undefined {
  if (typeof value === 'undefined') return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function parseAuthorsInput(value: unknown): SubmissionDraftInput['authors'] | undefined {
  if (typeof value === 'undefined') return undefined;
  if (!Array.isArray(value)) return undefined;

  const out: NonNullable<SubmissionDraftInput['authors']> = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) return undefined;
    const obj = item as Record<string, unknown>;
    out.push({
      firstName: parseOptionalString(obj.firstName),
      lastName: parseOptionalString(obj.lastName),
      email: parseOptionalNullableString(obj.email),
      affiliation: parseOptionalNullableString(obj.affiliation),
      phone: parseOptionalNullableString(obj.phone),
      orcid: parseOptionalNullableString(obj.orcid),
      isPresentingAuthor: parseOptionalBoolean(obj.isPresentingAuthor),
    });
  }
  return out;
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function parseOptionalNullableId(value: unknown): number | null | undefined {
  if (value === null) return null;
  const n = parseOptionalNumber(value);
  if (typeof n === 'undefined') return undefined;
  return n > 0 ? n : null;
}

function parseSubmissionDraftInput(body: unknown): SubmissionDraftInput {
  const obj = (typeof body === 'object' && body !== null) ? (body as Record<string, unknown>) : {};

  const title = parseOptionalString(obj.title);
  const abstract = typeof obj.abstract === 'string' ? obj.abstract : undefined;
  const keywords = parseOptionalStringArray(obj.keywords);
  const typeId = parseOptionalNullableId(obj.typeId);
  const categoryId = parseOptionalNullableId(obj.categoryId);

  const authorEmail = typeof obj.authorEmail === 'string' ? obj.authorEmail.trim() : undefined;
  const authorAffiliation = typeof obj.authorAffiliation === 'string' ? obj.authorAffiliation.trim() : undefined;
  const authorPhone = typeof obj.authorPhone === 'string' ? obj.authorPhone.trim() : undefined;
  const authorOrcid = typeof obj.authorOrcid === 'string' ? obj.authorOrcid.trim() : undefined;
  const authors = parseAuthorsInput(obj.authors);
  const inviteCode = parseOptionalString(obj.inviteCode);
  const onBehalfOfUserId = parseOptionalNumber(obj.onBehalfOfUserId);

  return {
    title,
    abstract: typeof abstract === 'string' ? abstract : undefined,
    keywords,
    typeId,
    categoryId,
    authorEmail: typeof authorEmail === 'undefined' ? undefined : (authorEmail.length > 0 ? authorEmail : null),
    authorAffiliation: typeof authorAffiliation === 'undefined' ? undefined : (authorAffiliation.length > 0 ? authorAffiliation : null),
    authorPhone: typeof authorPhone === 'undefined' ? undefined : (authorPhone.length > 0 ? authorPhone : null),
    authorOrcid: typeof authorOrcid === 'undefined' ? undefined : (authorOrcid.length > 0 ? authorOrcid : null),
    authors,
    inviteCode,
    onBehalfOfUserId,
  };
}

function splitName(name: string): { firstName: string; lastName: string } {
  const trimmed = name.trim();
  if (trimmed.length === 0) return { firstName: '', lastName: '' };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] ?? '', lastName: '' };
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

function buildAuthorName(firstName: string | undefined, lastName: string | undefined): string {
  const fn = (firstName ?? '').trim();
  const ln = (lastName ?? '').trim();
  return `${fn} ${ln}`.trim();
}

function getPresenterIndex(authors: NonNullable<SubmissionDraftInput['authors']>): number {
  const idx = authors.findIndex((a) => a.isPresentingAuthor === true);
  return idx >= 0 ? idx : 0;
}

function getRequestIp(req: Request): string | null {
  return req.ip || req.socket.remoteAddress || null;
}

function getRequestUserAgent(req: Request): string | null {
  return req.get('user-agent') || null;
}

async function writeAuditLog(params: {
  actorId: number;
  action: string;
  entityType: 'Submission' | 'Conference' | 'Presentation' | 'User' | 'System' | 'Schedule' | 'Session';
  entityId: number | null;
  metadata: Prisma.InputJsonObject;
  req: Request;
  onBehalfOfUserId?: number;
}): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata,
        ipAddress: getRequestIp(params.req),
        userAgent: getRequestUserAgent(params.req),
        impersonatedUserId: params.onBehalfOfUserId ?? null,
      },
    });
  } catch (error: unknown) {
    // Don't throw - audit logging should never break core flows.
    console.error('Failed to write audit log:', error);
  }
}

function normalizeAffiliationsFromLegacy(affiliation: string | null): string[] {
  if (!affiliation) return [];
  const trimmed = affiliation.trim();
  return trimmed.length > 0 ? [trimmed] : [];
}

function validateAuthorsForSubmit(
  authors: SubmissionAuthorEntryForValidation[],
  reqs: SubmissionRequirementSnapshot
): string | null {
  if (authors.length < 1) {
    return 'At least 1 author is required.';
  }

  const hasPresenter = authors.some((a) => a.isPresenter);
  if (!hasPresenter) {
    return 'Please designate one author as the presenting author.';
  }

  const requireOrcidForAll = reqs.collectAuthorOrcid;
  const requireOrcidForPresenter = reqs.requiresOrcid;

  for (const author of authors) {
    const displayName = author.name?.trim() ?? '';
    const firstName = author.firstName?.trim() ?? '';
    const lastName = author.lastName?.trim() ?? '';
    if (displayName.length === 0 && (firstName.length === 0 || lastName.length === 0)) {
      return 'Each author must have a first and last name.';
    }

    if (reqs.collectAuthorEmail) {
      const email = author.email?.trim() ?? '';
      if (email.length === 0) return 'Author email is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Author email is invalid.';
    }

    if (reqs.collectAuthorAffiliation) {
      const nonEmptyAffiliations = author.affiliations
        .map((a) => a.trim())
        .filter((a) => a.length > 0);
      if (nonEmptyAffiliations.length < 1) {
        return 'Author affiliation is required. Each author must have at least one affiliation.';
      }
    }

    if (reqs.collectAuthorPhone) {
      const phone = author.phone?.trim() ?? '';
      if (phone.length === 0) return 'Author phone is required.';
    }

    if (requireOrcidForAll || (requireOrcidForPresenter && author.isPresenter)) {
      const orcid = author.orcid?.trim() ?? '';
      if (orcid.length === 0) return 'Author ORCID is required.';
    }
  }

  return null;
}

function parseRevisionRequestInput(body: unknown): { feedback: string } {
  const obj = (typeof body === 'object' && body !== null) ? (body as Record<string, unknown>) : {};
  const feedbackRaw = obj.feedback;
  const feedback = typeof feedbackRaw === 'string' ? feedbackRaw.trim() : '';
  return { feedback };
}

async function getSubmissionRequirements(conferenceId: number): Promise<SubmissionRequirementSnapshot> {
  const reqs = await prisma.submissionRequirement.findUnique({ where: { conferenceId } });

  const authorsEnabled = reqs?.authorsEnabled ?? true;
  const requiresOrcid = authorsEnabled ? (reqs?.requiresOrcid ?? false) : false;
  const collectAuthorOrcid = authorsEnabled
    ? (requiresOrcid ? true : (reqs?.collectAuthorOrcid ?? false))
    : false;
  const collectAuthorEmail = authorsEnabled ? (reqs?.collectAuthorEmail ?? true) : false;
  const collectAuthorAffiliation = authorsEnabled ? (reqs?.collectAuthorAffiliation ?? true) : false;
  const collectAuthorPhone = authorsEnabled ? (reqs?.collectAuthorPhone ?? false) : false;

  const storedMaxKeywords = reqs?.maxKeywords ?? 8;
  const keywordsEnabled = storedMaxKeywords > 0;
  const normalizedMaxKeywords = keywordsEnabled ? Math.max(5, storedMaxKeywords) : 0;
  const storedMinKeywords = reqs?.minKeywords ?? 5;
  const normalizedMinKeywords = keywordsEnabled
    ? Math.min(normalizedMaxKeywords, Math.max(5, storedMinKeywords))
    : 0;

  return {
    abstractUploadMode: reqs?.abstractUploadMode ?? AbstractUploadMode.TEXT,
    fileFieldRequired: reqs?.fileFieldRequired ?? false,
    maxFileSizeMB: reqs?.maxFileSizeMB ?? 10,
    allowedFileTypes: reqs?.allowedFileTypes ?? [],
    minKeywords: normalizedMinKeywords,
    maxKeywords: normalizedMaxKeywords,
    abstractMinLength: reqs?.abstractMinLength ?? 50,
    abstractMaxLength: reqs?.abstractMaxLength ?? 3000,
    bodyTextMinWords: reqs?.bodyTextMinWords ?? undefined,
    bodyTextMaxWords: reqs?.bodyTextMaxWords ?? undefined,
    titleMaxWords: reqs?.titleMaxWords ?? undefined,
    authorsEnabled,
    collectAuthorEmail,
    collectAuthorAffiliation,
    collectAuthorPhone,
    collectAuthorOrcid,
    requiresOrcid,
    collectFullText: reqs?.collectFullText ?? false,
    fullTextTiming: reqs?.fullTextTiming ?? undefined,
  };
}

function normalizeAllowedTypes(types: string[]): Set<string> {
  const set = new Set<string>();
  for (const t of types) {
    const trimmed = t.trim().toLowerCase();
    if (trimmed.length === 0) continue;
    // Allow both "pdf" and ".pdf" styles.
    set.add(trimmed.startsWith('.') ? trimmed.slice(1) : trimmed);
    set.add(trimmed);
  }
  return set;
}

function fileTypeAllowed(allowed: string[], fileName: string, mimeType: string): boolean {
  if (allowed.length === 0) return true;
  const normalizedAllowed = normalizeAllowedTypes(allowed);
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext && normalizedAllowed.has(ext)) return true;
  const mime = mimeType.toLowerCase();
  if (normalizedAllowed.has(mime)) return true;
  // Common mapping when organizer enters "PDF" or "DOCX"
  if (normalizedAllowed.has('pdf') && mime === 'application/pdf') return true;
  if (normalizedAllowed.has('docx') && mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return true;
  if (normalizedAllowed.has('doc') && mime === 'application/msword') return true;
  return false;
}

function validateFileSize(maxFileSizeMB: number, fileSizeBytes: number): string | null {
  const limitBytes = Math.max(0, maxFileSizeMB) * 1024 * 1024;
  if (limitBytes > 0 && fileSizeBytes > limitBytes) {
    return `File must be smaller than ${maxFileSizeMB} MB`;
  }
  return null;
}

function validateSubmissionForSubmit(
  submission: {
    title: string;
    abstract: string | null;
    keywords: string[];
    authorEmail: string | null;
    authorAffiliation: string | null;
    authorPhone: string | null;
    authorOrcid: string | null;
    abstractFileUrl: string | null;
    abstractFileName: string | null;
    abstractFileMimeType: string | null;
    abstractFileSizeBytes: number | null;
    fullTextFileUrl: string | null;
    fullTextFileName: string | null;
    fullTextFileMimeType: string | null;
    fullTextFileSizeBytes: number | null;
  },
  reqs: SubmissionRequirementSnapshot
): string | null {
  if (reqs.titleMaxWords) {
    const wc = countWords(submission.title);
    if (wc > reqs.titleMaxWords) {
      return `Title must not exceed ${reqs.titleMaxWords} words (currently ${wc})`;
    }
  }

  // Abstract text is ALWAYS required (canonical content for public display)
  // The FILE mode is deprecated - treat as equivalent to BOTH
  const text = submission.abstract?.trim() ?? '';
  if (text.length === 0) {
    return 'Abstract text is required';
  }
  const wc = countWords(text);
  const minWords = reqs.bodyTextMinWords ?? reqs.abstractMinLength;
  const maxWords = reqs.bodyTextMaxWords ?? reqs.abstractMaxLength;
  if (minWords && wc < minWords) {
    return `Abstract must be at least ${minWords} words (currently ${wc})`;
  }
  if (maxWords && wc > maxWords) {
    return `Abstract must not exceed ${maxWords} words (currently ${wc})`;
  }

  // File is optional/supplementary - only validate when BOTH mode and fileFieldRequired=true
  const allowFileUpload =
    reqs.abstractUploadMode === AbstractUploadMode.BOTH ||
    reqs.abstractUploadMode === AbstractUploadMode.FILE;
  const fileRequired = allowFileUpload && reqs.fileFieldRequired;

  const hasAbstractFile = Boolean(submission.abstractFileUrl);
  if (fileRequired && !hasAbstractFile) {
    return 'Abstract file is required by conference settings';
  }
  if (hasAbstractFile) {
    if (submission.abstractFileSizeBytes != null) {
      const err = validateFileSize(reqs.maxFileSizeMB, submission.abstractFileSizeBytes);
      if (err) return err;
    }
    if (reqs.allowedFileTypes.length > 0 && submission.abstractFileName && submission.abstractFileMimeType) {
      if (!fileTypeAllowed(reqs.allowedFileTypes, submission.abstractFileName, submission.abstractFileMimeType)) {
        return 'Abstract file type is not allowed by conference settings';
      }
    }
  }

  // Keywords: driven by organizer-configured submission requirements
  const maxKeywords = Math.max(0, reqs.maxKeywords);
  const minKeywords = Math.max(0, reqs.minKeywords);
  if (maxKeywords <= 0) {
    if (submission.keywords.length > 0) {
      return 'Keywords are disabled for this conference';
    }
  } else {
    if (minKeywords > 0 && submission.keywords.length < minKeywords) {
      const remaining = minKeywords - submission.keywords.length;
      return `At least ${minKeywords} keyword(s) are required (you provided ${submission.keywords.length}). Please add ${remaining} more.`;
    }
    if (submission.keywords.length > maxKeywords) {
      return `Maximum ${maxKeywords} keywords allowed`;
    }
  }

  // Author fields: validate submission-level legacy fields only when author entries are disabled.
  if (!reqs.authorsEnabled) {
    if (reqs.collectAuthorEmail) {
      if (!submission.authorEmail || submission.authorEmail.trim().length === 0) return 'Author email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submission.authorEmail)) return 'Author email is invalid';
    }
    if (reqs.collectAuthorAffiliation) {
      if (!submission.authorAffiliation || submission.authorAffiliation.trim().length === 0) {
        return 'Author affiliation is required. Each author must have at least one affiliation.';
      }
    }
    if (reqs.collectAuthorPhone) {
      if (!submission.authorPhone || submission.authorPhone.trim().length === 0) return 'Author phone is required';
    }
    if (reqs.requiresOrcid || reqs.collectAuthorOrcid) {
      if (!submission.authorOrcid || submission.authorOrcid.trim().length === 0) return 'Author ORCID is required';
    }
  }

  if (reqs.collectFullText && reqs.fullTextTiming === FullTextTiming.onSubmission) {
    if (!submission.fullTextFileUrl) return 'Full text file is required by conference settings';
    if (submission.fullTextFileSizeBytes != null) {
      const err = validateFileSize(reqs.maxFileSizeMB, submission.fullTextFileSizeBytes);
      if (err) return err;
    }
    if (reqs.allowedFileTypes.length > 0 && submission.fullTextFileName && submission.fullTextFileMimeType) {
      if (!fileTypeAllowed(reqs.allowedFileTypes, submission.fullTextFileName, submission.fullTextFileMimeType)) {
        return 'Full text file type is not allowed by conference settings';
      }
    }
  }

  return null;
}

// POST /api/conferences/:id/submissions - create draft
export const createSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    // Resolve slug or numeric ID to numeric ID
    const conferenceId = await resolveConferenceId(req.params.id);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }
    const input = parseSubmissionDraftInput(req.body as unknown);
    const title = input.title;
    if (!title) { res.status(400).json({ message: 'Title is required' }); return; }

    const conference = await prisma.conference.findUnique({ where: { id: conferenceId } });
    if (!conference) { res.status(404).json({ message: 'Conference not found' }); return; }

    const reqs = await getSubmissionRequirements(conferenceId);

    // ===================== DELEGATION SUPPORT =====================
    // If onBehalfOfUserId is provided, this is an organizer acting on behalf of an author.
    // We must verify:
    // 1. The calling user is an organizer/admin of this conference
    // 2. Consent has been granted by the target author
    const isOrganizer = isAdmin(req) || conference.createdById === userId;
    const isDelegated = typeof input.onBehalfOfUserId === 'number' && input.onBehalfOfUserId > 0;
    let effectiveAuthorId = userId;
    let performedByUserId: number | null = null;

    if (isDelegated) {
      if (!isOrganizer) {
        res.status(403).json({ message: 'Only organizers can create submissions on behalf of others' });
        return;
      }
      // Verify consent exists and is valid
      try {
        await assertConsentStillValid(conferenceId, input.onBehalfOfUserId!, userId);
      } catch {
        res.status(403).json({ message: 'Author has not granted consent for submission assistance' });
        return;
      }
      // Verify the target user exists
      const targetUser = await prisma.user.findUnique({ where: { id: input.onBehalfOfUserId } });
      if (!targetUser) {
        res.status(404).json({ message: 'Target author not found' });
        return;
      }
      effectiveAuthorId = input.onBehalfOfUserId!;
      performedByUserId = userId;
    }

    // Enforce max submissions per user when configured (excluding withdrawn)
    // Note: Use effectiveAuthorId for counting (the actual author, not the organizer)
    if (conference.maxSubmissionsPerUser && conference.maxSubmissionsPerUser > 0) {
      const existingCount = await prisma.submission.count({
        where: {
          conferenceId,
          authorId: effectiveAuthorId,
          NOT: { status: 'withdrawn' }
        }
      });
      if (existingCount >= conference.maxSubmissionsPerUser) {
        res.status(403).json({ message: `Submission limit reached (${conference.maxSubmissionsPerUser}) for this conference` });
        return;
      }
    }

    // CFP gating: window + visibility
    // When delegated, the organizer bypasses CFP restrictions (they already have organizer access)
    const bypass = isOrganizer;
    const now = new Date();
    const submissionsOpen = (!conference.submissionsOpenFrom || conference.submissionsOpenFrom <= now)
      && (!conference.submissionsOpenUntil || conference.submissionsOpenUntil >= now);
    if (!bypass && !submissionsOpen) {
      res.status(403).json({ message: 'Submissions are currently closed' });
      return;
    }

    if (!bypass) {
      if (conference.submissionsVisibility === 'private') {
        res.status(403).json({ message: 'Submissions are private' });
        return;
      }
      if (conference.submissionsVisibility === 'invite_only') {
        if (!input.inviteCode || input.inviteCode !== conference.submissionInviteCode) {
          res.status(403).json({ message: 'Valid invite code required' });
          return;
        }
      }
    }

    const submission = await prisma.$transaction(async (tx) => {
      const providedAuthors = Array.isArray(input.authors)
        ? input.authors.filter((a) =>
            (a.firstName && a.firstName.trim().length > 0) ||
            (a.lastName && a.lastName.trim().length > 0) ||
            (a.email && a.email.trim().length > 0)
          )
        : [];

      const presenterIndex = providedAuthors.length > 0 ? getPresenterIndex(providedAuthors) : 0;
      const presenter = providedAuthors[presenterIndex];

      const created = await tx.submission.create({
        data: { 
          title,
          abstract: input.abstract && input.abstract.trim().length > 0 ? input.abstract : null,
          keywords: input.keywords || [], 
          conferenceId, 
          authorId: effectiveAuthorId, // Use effective author (delegated or self)
          typeId: typeof input.typeId === 'undefined' ? null : input.typeId,
          categoryId: typeof input.categoryId === 'undefined' ? null : input.categoryId,
          authorEmail:
            typeof presenter?.email !== 'undefined'
              ? presenter.email
              : (typeof input.authorEmail === 'undefined' ? null : input.authorEmail),
          authorAffiliation:
            typeof presenter?.affiliation !== 'undefined'
              ? presenter.affiliation
              : (typeof input.authorAffiliation === 'undefined' ? null : input.authorAffiliation),
          authorPhone:
            typeof presenter?.phone !== 'undefined'
              ? presenter.phone
              : (typeof input.authorPhone === 'undefined' ? null : input.authorPhone),
          authorOrcid:
            typeof presenter?.orcid !== 'undefined'
              ? presenter.orcid
              : (typeof input.authorOrcid === 'undefined' ? null : input.authorOrcid)
        }
      });

      if (reqs.authorsEnabled) {
        if (providedAuthors.length > 0) {
          for (let i = 0; i < providedAuthors.length; i += 1) {
            const a = providedAuthors[i];
            const name = buildAuthorName(a.firstName, a.lastName) || (a.email ?? `Author ${i + 1}`);
            await tx.submissionAuthorEntry.create({
              data: {
                submissionId: created.id,
                firstName: (a.firstName ?? '').trim(),
                lastName: (a.lastName ?? '').trim(),
                name,
                email: typeof a.email === 'undefined' ? null : a.email,
                affiliations: normalizeAffiliationsFromLegacy(typeof a.affiliation === 'undefined' ? null : a.affiliation),
                phone: typeof a.phone === 'undefined' ? null : a.phone,
                orcid: typeof a.orcid === 'undefined' ? null : a.orcid,
                order: i,
                isPresenter: i === presenterIndex,
                isExternal: i !== presenterIndex,
              },
            });
          }
        } else {
          // No authors provided - use the effective author's info
          const author = await tx.user.findUnique({
            where: { id: effectiveAuthorId },
            select: { name: true, email: true, organization: true },
          });
          if (author) {
            const affiliations =
              normalizeAffiliationsFromLegacy(created.authorAffiliation).length > 0
                ? normalizeAffiliationsFromLegacy(created.authorAffiliation)
                : normalizeAffiliationsFromLegacy(author.organization ?? null);
            await tx.submissionAuthorEntry.create({
              data: {
                submissionId: created.id,
                name: author.name,
                email: created.authorEmail ?? author.email,
                affiliations,
                order: 0,
                isPresenter: true,
                isExternal: false,
              },
            });
          }
        }
      }

      return created;
    });

    // Audit log for delegated submissions
    if (isDelegated && performedByUserId !== null) {
      await writeAuditLog({
        actorId: performedByUserId,
        action: 'SUBMISSION_CREATED_ON_BEHALF',
        entityType: 'Submission',
        entityId: submission.id,
        metadata: {
          conferenceId,
          conferenceName: conference.name,
          submissionTitle: title,
          authorId: effectiveAuthorId,
        },
        req,
        onBehalfOfUserId: effectiveAuthorId,
      });
    }

    res.status(201).json(submission);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

// GET /api/submissions/:submissionId - get single submission (author only for drafts)
export const getSubmission = async (req: Request, res: Response) => {
  try {
    const submissionId = Number(req.params.submissionId);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }
    
    const submission = await prisma.submission.findUnique({ 
      where: { id: submissionId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            organization: true,
          },
        },
        conference: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        },
        type: true,
        category: true,
        authors: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
            email: true,
            affiliations: true,
            phone: true,
            orcid: true,
            order: true,
            isPresenter: true,
          },
        },
      }
    });
    
    if (!submission) { res.status(404).json({ message: 'Submission not found' }); return; }
    
    // Check authorization
    const conference = await prisma.conference.findUnique({ where: { id: submission.conferenceId } });
    const isOrganizer = conference && (isAdmin(req) || conference.createdById === userId);
    
    if (submission.authorId !== userId && !isOrganizer) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    
    res.json(submission);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

// PUT /api/submissions/:submissionId - update draft (author only, not after submit)
export const updateSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const submissionId = Number(req.params.submissionId);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }
    const input = parseSubmissionDraftInput(req.body as unknown);
    const submission = await prisma.submission.findUnique({ 
      where: { id: submissionId },
      include: { conference: { select: { id: true, name: true, createdById: true } } }
    });
    if (!submission) { res.status(404).json({ message: 'Not found' }); return; }
    
    // ===================== DELEGATION SUPPORT =====================
    const isOrganizer = isAdmin(req) || submission.conference.createdById === userId;
    const isDelegated = typeof input.onBehalfOfUserId === 'number' && input.onBehalfOfUserId > 0;
    let performedByUserId: number | null = null;
    
    // Authorization: either the author, or an organizer with consent
    if (submission.authorId !== userId) {
      if (!isOrganizer) {
        res.status(403).json({ message: 'Forbidden' }); 
        return;
      }
      // Organizer must have consent to edit on behalf of author
      try {
        await assertConsentStillValid(submission.conferenceId, submission.authorId, userId);
        performedByUserId = userId;
      } catch {
        res.status(403).json({ message: 'Author has not granted consent for submission assistance' });
        return;
      }
    }
    
    // Check if submission is locked
    if (submission.isLocked) { 
      res.status(400).json({ 
        message: 'This submission is locked and cannot be edited', 
        reason: submission.lockedReason,
        lockedAt: submission.lockedAt
      }); 
      return; 
    }
    
    if (submission.status !== 'draft' && submission.status !== 'revision_requested') {
      res.status(400).json({ message: 'Only draft or revision-requested submissions can be edited' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const reqs = await getSubmissionRequirements(submission.conferenceId);

      const providedAuthors = reqs.authorsEnabled && Array.isArray(input.authors)
        ? input.authors.filter((a) =>
            (a.firstName && a.firstName.trim().length > 0) ||
            (a.lastName && a.lastName.trim().length > 0) ||
            (a.email && a.email.trim().length > 0)
          )
        : [];

      const presenterIndex = providedAuthors.length > 0 ? getPresenterIndex(providedAuthors) : 0;
      const presenter = providedAuthors[presenterIndex];

      const updatedSubmission = await tx.submission.update({
        where: { id: submissionId },
        data: {
          title: input.title ?? submission.title,
          abstract:
            typeof input.abstract !== 'undefined'
              ? (input.abstract.trim().length > 0 ? input.abstract : null)
              : submission.abstract,
          keywords: input.keywords ?? submission.keywords,
          typeId: typeof input.typeId !== 'undefined' ? input.typeId : submission.typeId,
          categoryId: typeof input.categoryId !== 'undefined' ? input.categoryId : submission.categoryId,
          authorEmail:
            typeof presenter?.email !== 'undefined'
              ? presenter.email
              : (typeof input.authorEmail !== 'undefined' ? input.authorEmail : submission.authorEmail),
          authorAffiliation:
            typeof presenter?.affiliation !== 'undefined'
              ? presenter.affiliation
              : (typeof input.authorAffiliation !== 'undefined' ? input.authorAffiliation : submission.authorAffiliation),
          authorPhone:
            typeof presenter?.phone !== 'undefined'
              ? presenter.phone
              : (typeof input.authorPhone !== 'undefined' ? input.authorPhone : submission.authorPhone),
          authorOrcid:
            typeof presenter?.orcid !== 'undefined'
              ? presenter.orcid
              : (typeof input.authorOrcid !== 'undefined' ? input.authorOrcid : submission.authorOrcid),
        }
      });

      if (reqs.authorsEnabled) {
        if (providedAuthors.length > 0) {
          await tx.submissionAuthorEntry.deleteMany({ where: { submissionId } });
          for (let i = 0; i < providedAuthors.length; i += 1) {
            const a = providedAuthors[i];
            const name = buildAuthorName(a.firstName, a.lastName) || (a.email ?? `Author ${i + 1}`);
            await tx.submissionAuthorEntry.create({
              data: {
                submissionId,
                firstName: (a.firstName ?? '').trim(),
                lastName: (a.lastName ?? '').trim(),
                name,
                email: typeof a.email === 'undefined' ? null : a.email,
                affiliations: normalizeAffiliationsFromLegacy(typeof a.affiliation === 'undefined' ? null : a.affiliation),
                phone: typeof a.phone === 'undefined' ? null : a.phone,
                orcid: typeof a.orcid === 'undefined' ? null : a.orcid,
                order: i,
                isPresenter: i === presenterIndex,
                isExternal: i !== presenterIndex,
              },
            });
          }
        } else {
          const author = await tx.user.findUnique({
            where: { id: updatedSubmission.authorId },
            select: { name: true, email: true, organization: true },
          });
          if (author) {
            const primary = await tx.submissionAuthorEntry.findFirst({
              where: { submissionId },
              orderBy: { order: 'asc' },
            });
            const affiliations =
              normalizeAffiliationsFromLegacy(updatedSubmission.authorAffiliation).length > 0
                ? normalizeAffiliationsFromLegacy(updatedSubmission.authorAffiliation)
                : normalizeAffiliationsFromLegacy(author.organization ?? null);
            if (primary) {
              await tx.submissionAuthorEntry.update({
                where: { id: primary.id },
                data: {
                  name: author.name,
                  email: updatedSubmission.authorEmail ?? author.email,
                  affiliations,
                },
              });
            } else {
              await tx.submissionAuthorEntry.create({
                data: {
                  submissionId,
                  name: author.name,
                  email: updatedSubmission.authorEmail ?? author.email,
                  affiliations,
                  order: 0,
                  isPresenter: true,
                  isExternal: false,
                },
              });
            }
          }
        }
      }

      return updatedSubmission;
    });

    // Audit log for delegated updates
    if (performedByUserId !== null) {
      await writeAuditLog({
        actorId: performedByUserId,
        action: 'SUBMISSION_UPDATED_ON_BEHALF',
        entityType: 'Submission',
        entityId: submissionId,
        metadata: {
          conferenceId: submission.conferenceId,
          conferenceName: submission.conference.name,
          submissionTitle: updated.title,
          authorId: submission.authorId,
        },
        req,
        onBehalfOfUserId: submission.authorId,
      });
    }

    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

// POST /api/submissions/:submissionId/submit - transition draft->submitted
export const submitSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const submissionId = Number(req.params.submissionId);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        author: { select: { name: true, email: true, organization: true } },
      },
    });
    if (!submission) { res.status(404).json({ message: 'Not found' }); return; }
    
    // Re-check window at submit time
    const conference = await prisma.conference.findUnique({ where: { id: submission.conferenceId } });
    if (!conference) { res.status(404).json({ message: 'Conference missing' }); return; }
    
    // ===================== DELEGATION SUPPORT =====================
    const isOrganizer = isAdmin(req) || conference.createdById === userId;
    let performedByUserId: number | null = null;
    
    // Authorization: either the author, or an organizer with consent
    if (submission.authorId !== userId) {
      if (!isOrganizer) {
        res.status(403).json({ message: 'Forbidden' }); 
        return;
      }
      // Organizer must have consent to submit on behalf of author
      try {
        await assertConsentStillValid(submission.conferenceId, submission.authorId, userId);
        performedByUserId = userId;
      } catch {
        res.status(403).json({ message: 'Author has not granted consent for submission assistance' });
        return;
      }
    }
    
    const isResubmission = submission.status === 'revision_requested';
    if (submission.status !== 'draft' && submission.status !== 'revision_requested') {
      res.status(400).json({ message: 'Already submitted' });
      return;
    }
    
    // CFP gating - organizers (including those with consent) can bypass
    const bypass = isOrganizer;
    const now = new Date();
    const submissionsOpen = (!conference.submissionsOpenFrom || conference.submissionsOpenFrom <= now)
      && (!conference.submissionsOpenUntil || conference.submissionsOpenUntil >= now);
    if (!bypass && !submissionsOpen) { res.status(403).json({ message: 'Submissions are currently closed' }); return; }
    if (!bypass) {
      if (conference.submissionsVisibility === 'private') { res.status(403).json({ message: 'Submissions are private' }); return; }
      if (conference.submissionsVisibility === 'invite_only') {
        const input = parseSubmissionDraftInput(req.body as unknown);
        if (!input.inviteCode || input.inviteCode !== conference.submissionInviteCode) { res.status(403).json({ message: 'Valid invite code required' }); return; }
      }
    }

    const reqs = await getSubmissionRequirements(submission.conferenceId);

    if (reqs.authorsEnabled) {
      const authors = await prisma.submissionAuthorEntry.findMany({
        where: { submissionId: submission.id },
        orderBy: { order: 'asc' },
      });
      const authorErr = validateAuthorsForSubmit(authors, reqs);
      if (authorErr) {
        res.status(400).json({ message: authorErr });
        return;
      }
    }
    const submitError = validateSubmissionForSubmit(
      {
        title: submission.title,
        abstract: submission.abstract,
        keywords: submission.keywords,
        authorEmail: submission.authorEmail,
        authorAffiliation: submission.authorAffiliation,
        authorPhone: submission.authorPhone,
        authorOrcid: submission.authorOrcid,
        abstractFileUrl: submission.abstractFileUrl,
        abstractFileName: submission.abstractFileName,
        abstractFileMimeType: submission.abstractFileMimeType,
        abstractFileSizeBytes: submission.abstractFileSizeBytes,
        fullTextFileUrl: submission.fullTextFileUrl,
        fullTextFileName: submission.fullTextFileName,
        fullTextFileMimeType: submission.fullTextFileMimeType,
        fullTextFileSizeBytes: submission.fullTextFileSizeBytes,
      },
      reqs
    );
    if (submitError) {
      res.status(400).json({ message: submitError });
      return;
    }
    
    // Lock submission when submitted
    const updated = await prisma.submission.update({ 
      where: { id: submissionId }, 
      data: { 
        status: 'submitted',
        isLocked: true,
        lockedAt: new Date(),
        lockedReason: isResubmission ? 'Locked upon resubmission' : 'Locked upon submission',
        ...(isResubmission ? { resubmittedAt: new Date() } : {}),
      } 
    });

    if (isResubmission) {
      await writeAuditLog({
        actorId: performedByUserId ?? userId,
        action: 'SUBMISSION_RESUBMIT',
        entityType: 'Submission',
        entityId: submissionId,
        metadata: {
          conferenceId: submission.conferenceId,
          submissionTitle: submission.title,
        },
        req,
        onBehalfOfUserId: performedByUserId !== null ? submission.authorId : undefined,
      });
    }

    // Audit log for delegated submissions
    if (performedByUserId !== null && !isResubmission) {
      await writeAuditLog({
        actorId: performedByUserId,
        action: 'SUBMISSION_SUBMITTED_ON_BEHALF',
        entityType: 'Submission',
        entityId: submissionId,
        metadata: {
          conferenceId: submission.conferenceId,
          conferenceName: conference.name,
          submissionTitle: submission.title,
          authorId: submission.authorId,
        },
        req,
        onBehalfOfUserId: submission.authorId,
      });
    }

    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

// POST /api/organizer/submissions/:submissionId/request-revision - request revision (organizer/admin)
export const requestSubmissionRevision = async (req: Request, res: Response) => {
  try {
    const submissionId = Number(req.params.submissionId);
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const input = parseRevisionRequestInput(req.body as unknown);
    if (input.feedback.trim().length === 0) {
      res.status(400).json({ message: 'Feedback is required' });
      return;
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { conference: { select: { createdById: true } } },
    });
    if (!submission) {
      res.status(404).json({ message: 'Submission not found' });
      return;
    }

    const isOrganizer = isAdmin(req) || submission.conference.createdById === userId;
    if (!isOrganizer) {
      res.status(403).json({ message: 'Only organizers can request revisions' });
      return;
    }

    if (submission.status !== 'under_review') {
      res.status(400).json({ message: 'Revisions can only be requested for submissions under review' });
      return;
    }

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: 'revision_requested',
        revisionFeedback: input.feedback,
        revisionRequestedAt: new Date(),
        isLocked: false,
        lockedAt: null,
        lockedReason: null,
      },
    });

    await writeAuditLog({
      actorId: userId,
      action: 'SUBMISSION_REVISION_REQUESTED',
      entityType: 'Submission',
      entityId: submissionId,
      metadata: {
        conferenceId: submission.conferenceId,
        submissionTitle: submission.title,
        feedbackPreview: input.feedback.slice(0, 200),
      },
      req,
    });

    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

// POST /api/submissions/:submissionId/withdraw - author withdraw
export const withdrawSubmission = async (req: Request, res: Response) => {
  try {
    const submissionId = Number(req.params.submissionId);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }
    const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
    if (!submission) { res.status(404).json({ message: 'Not found' }); return; }
    if (submission.authorId !== userId) { res.status(403).json({ message: 'Forbidden' }); return; }
    if (!['draft','submitted','under_review'].includes(submission.status)) { res.status(400).json({ message: 'Cannot withdraw at this stage' }); return; }
    
    // Lock submission when withdrawn
    const updated = await prisma.submission.update({ 
      where: { id: submissionId }, 
      data: { 
        status: 'withdrawn',
        isLocked: true,
        lockedAt: new Date(),
        lockedReason: 'Withdrawn by author'
      } 
    });
    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

// POST /api/organizer/submissions/:submissionId/override-edit - Organizer override locked submission
export const organizerOverrideSubmissionEdit = async (req: Request, res: Response) => {
  try {
    const submissionId = Number(req.params.submissionId);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const { reason, changes } = req.body as { reason?: string; changes?: Partial<typeof req.body> };
    if (!reason || reason.trim().length === 0) {
      res.status(400).json({ message: 'Reason is required for override actions' });
      return;
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { conference: { select: { createdById: true } } }
    });
    if (!submission) { res.status(404).json({ message: 'Submission not found' }); return; }

    const isOrganizer = isAdmin(req) || submission.conference.createdById === userId;
    if (!isOrganizer) {
      res.status(403).json({ message: 'Only organizers can override locked submissions' });
      return;
    }

    if (!submission.isLocked) {
      res.status(400).json({ message: 'Submission is not locked' });
      return;
    }

    const input = parseSubmissionDraftInput(changes ?? {});
    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        // Override acts as an explicit unlock mechanism; keep lock fields consistent.
        isLocked: false,
        lockedAt: null,
        lockedReason: null,
        ...(input.title && { title: input.title }),
        ...(typeof input.abstract !== 'undefined' && { abstract: input.abstract }),
        ...(input.keywords && { keywords: input.keywords }),
        ...(typeof input.typeId !== 'undefined' && { typeId: input.typeId }),
        ...(typeof input.categoryId !== 'undefined' && { categoryId: input.categoryId }),
        ...(typeof input.authorEmail !== 'undefined' && { authorEmail: input.authorEmail }),
        ...(typeof input.authorAffiliation !== 'undefined' && { authorAffiliation: input.authorAffiliation }),
        ...(typeof input.authorPhone !== 'undefined' && { authorPhone: input.authorPhone }),
        ...(typeof input.authorOrcid !== 'undefined' && { authorOrcid: input.authorOrcid }),
      }
    });

    // Audit log the override action
    await logAdminAction(
      userId,
      'SUBMISSION_OVERRIDE_EDIT',
      'Submission',
      submissionId,
      {
        reason,
        changes: input,
        unlocked: true,
        previousLock: {
          isLocked: submission.isLocked,
          lockedAt: submission.lockedAt,
          lockedReason: submission.lockedReason,
        },
        conferenceId: submission.conferenceId,
        submissionTitle: submission.title,
      },
      req
    );

    res.json({ message: 'Submission updated via organizer override', submission: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
}

// POST /api/submissions/:submissionId/abstract-file - upload abstract file for draft submission
export const uploadSubmissionAbstractFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const submissionId = Number(req.params.submissionId);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const file = req.file;
    if (!file) { res.status(400).json({ message: 'File is required' }); return; }

    const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
    if (!submission) {
      await fs.unlink(file.path).catch(() => undefined);
      res.status(404).json({ message: 'Submission not found' });
      return;
    }
    if (submission.authorId !== userId) {
      await fs.unlink(file.path).catch(() => undefined);
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    if (submission.status !== 'draft' || submission.isLocked) {
      await fs.unlink(file.path).catch(() => undefined);
      res.status(400).json({ message: 'Submission is locked and cannot be modified' });
      return;
    }

    const reqs = await getSubmissionRequirements(submission.conferenceId);
    if (reqs.abstractUploadMode === AbstractUploadMode.TEXT) {
      await fs.unlink(file.path).catch(() => undefined);
      res.status(400).json({ message: 'This conference requires text abstracts; file upload is not enabled' });
      return;
    }

    const sizeErr = validateFileSize(reqs.maxFileSizeMB, file.size);
    if (sizeErr) {
      await fs.unlink(file.path).catch(() => undefined);
      res.status(400).json({ message: sizeErr });
      return;
    }
    if (!fileTypeAllowed(reqs.allowedFileTypes, file.originalname, file.mimetype)) {
      await fs.unlink(file.path).catch(() => undefined);
      res.status(400).json({ message: 'File type is not allowed by conference settings' });
      return;
    }

    // Delete old file if replacing (either from R2 or local storage)
    if (submission.abstractFileKey) {
      await deleteStorageFile(submission.abstractFileKey).catch(() => undefined);
    }

    let storageKey: string | null = null;
    let fileUrl: string | null = null;

    if (isR2Active()) {
      // Upload to R2 storage
      const fileBuffer = await fs.readFile(file.path);
      storageKey = generateStorageKey('submissions', String(submission.conferenceId), file.originalname);
      await uploadFile(storageKey, fileBuffer, file.mimetype, {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      });
      // Clean up local temp file
      await fs.unlink(file.path).catch(() => undefined);
    } else {
      // Local storage fallback
      const publicPath = getPublicPathForSubmissionFile(file.filename);
      fileUrl = buildPublicFileUrl(req, publicPath);
    }

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        abstractFileUrl: fileUrl,
        abstractFileKey: storageKey,
        abstractFileName: file.originalname,
        abstractFileMimeType: file.mimetype,
        abstractFileSizeBytes: file.size,
      },
    });

    res.json({
      message: 'Abstract file uploaded',
      submissionId: updated.id,
      abstractFile: {
        url: updated.abstractFileUrl,
        key: updated.abstractFileKey,
        name: updated.abstractFileName,
        mimeType: updated.abstractFileMimeType,
        sizeBytes: updated.abstractFileSizeBytes,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

// POST /api/submissions/:submissionId/full-text-file - upload full text file (onSubmission or afterAcceptance)
export const uploadSubmissionFullTextFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const submissionId = Number(req.params.submissionId);
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const file = req.file;
    if (!file) { res.status(400).json({ message: 'File is required' }); return; }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { presentation: { include: { section: { select: { dayId: true } } } } },
    });
    if (!submission) {
      await fs.unlink(file.path).catch(() => undefined);
      res.status(404).json({ message: 'Submission not found' });
      return;
    }
    if (submission.authorId !== userId) {
      await fs.unlink(file.path).catch(() => undefined);
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const reqs = await getSubmissionRequirements(submission.conferenceId);
    if (!reqs.collectFullText) {
      await fs.unlink(file.path).catch(() => undefined);
      res.status(400).json({ message: 'Full text upload is not enabled for this conference' });
      return;
    }

    const timing = reqs.fullTextTiming;
    if (timing === FullTextTiming.onSubmission) {
      if (submission.status !== 'draft' || submission.isLocked) {
        await fs.unlink(file.path).catch(() => undefined);
        res.status(400).json({ message: 'Submission is locked and cannot be modified' });
        return;
      }
    } else if (timing === FullTextTiming.afterAcceptance) {
      if (submission.status !== 'accepted') {
        await fs.unlink(file.path).catch(() => undefined);
        res.status(400).json({ message: 'Full text upload is only allowed after acceptance' });
        return;
      }
      const scheduled = Boolean(submission.presentation?.section?.dayId);
      if (scheduled) {
        await fs.unlink(file.path).catch(() => undefined);
        res.status(400).json({ message: 'Cannot upload full text after the presentation has been scheduled' });
        return;
      }
    }

    const sizeErr = validateFileSize(reqs.maxFileSizeMB, file.size);
    if (sizeErr) {
      await fs.unlink(file.path).catch(() => undefined);
      res.status(400).json({ message: sizeErr });
      return;
    }
    if (!fileTypeAllowed(reqs.allowedFileTypes, file.originalname, file.mimetype)) {
      await fs.unlink(file.path).catch(() => undefined);
      res.status(400).json({ message: 'File type is not allowed by conference settings' });
      return;
    }

    // Delete old file if replacing (either from R2 or local storage)
    if (submission.fullTextFileKey) {
      await deleteStorageFile(submission.fullTextFileKey).catch(() => undefined);
    }

    let storageKey: string | null = null;
    let fileUrl: string | null = null;

    if (isR2Active()) {
      // Upload to R2 storage
      const fileBuffer = await fs.readFile(file.path);
      storageKey = generateStorageKey('submissions', String(submission.conferenceId), file.originalname);
      await uploadFile(storageKey, fileBuffer, file.mimetype, {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      });
      // Clean up local temp file
      await fs.unlink(file.path).catch(() => undefined);
    } else {
      // Local storage fallback
      const publicPath = getPublicPathForSubmissionFile(file.filename);
      fileUrl = buildPublicFileUrl(req, publicPath);
    }

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        fullTextFileUrl: fileUrl,
        fullTextFileKey: storageKey,
        fullTextFileName: file.originalname,
        fullTextFileMimeType: file.mimetype,
        fullTextFileSizeBytes: file.size,
      },
    });

    res.json({
      message: 'Full text file uploaded',
      submissionId: updated.id,
      fullTextFile: {
        url: updated.fullTextFileUrl,
        key: updated.fullTextFileKey,
        name: updated.fullTextFileName,
        mimeType: updated.fullTextFileMimeType,
        sizeBytes: updated.fullTextFileSizeBytes,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

// GET /api/conferences/:id/submissions - list submissions for conference (organizer/admin or author sees own)
// Supports optional filters and pagination via query params.
export const listConferenceSubmissions = async (req: Request, res: Response) => {
  try {
    // Resolve slug or numeric ID to numeric ID
    const conferenceId = await resolveConferenceId(req.params.id);
    const userId = getUserId(req);
    const { page, pageSize, status, q } = req.query as {
      page?: string;
      pageSize?: string;
      status?: string;
      q?: string;
    };

    const conference = await prisma.conference.findUnique({ where: { id: conferenceId } });
    if (!conference) { res.status(404).json({ message: 'Conference not found' }); return; }

    const canManage = isAdmin(req) || conference.createdById === userId;

    const where: NonNullable<Parameters<typeof prisma.submission.findMany>[0]>['where'] = {
      conferenceId,
      ...(canManage ? {} : { authorId: userId || undefined }),
    };

    // Organizers/admins should never see author drafts.
    if (canManage) {
      where.NOT = { status: SubmissionStatus.draft };
    }

    if (status && Object.values(SubmissionStatus).includes(status as SubmissionStatus)) {
      where.status = status as SubmissionStatus;
    }

    if (q && q.trim().length > 0) {
      const term = q.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { abstract: { contains: term, mode: 'insensitive' } },
        { keywords: { hasSome: [term] } },
      ];
    }

    const hasPagination = typeof page !== 'undefined' || typeof pageSize !== 'undefined';
    if (hasPagination) {
      const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
      const sizeNum = Math.min(100, Math.max(1, parseInt(pageSize || '20', 10) || 20));
      const skip = (pageNum - 1) * sizeNum;

      const [items, total] = await Promise.all([
        prisma.submission.findMany({
          where,
          orderBy: [{ submittedAt: 'desc' }],
          skip,
          take: sizeNum,
          include: {
            author: {
              select: { id: true, name: true, email: true, organization: true }
            },
            authors: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                affiliations: true,
                phone: true,
                orcid: true,
                isPresenter: true,
                order: true,
              },
              orderBy: { order: 'asc' },
            },
            category: {
              select: { id: true, name: true }
            },
            type: {
              select: { id: true, name: true }
            }
          }
        }),
        prisma.submission.count({ where }),
      ]);

      res.setHeader('X-Total-Count', String(total));
      res.setHeader('X-Page', String(pageNum));
      res.setHeader('X-Page-Size', String(sizeNum));
      res.json(items);
      return;
    }

    const submissions = await prisma.submission.findMany({
      where,
      orderBy: [{ submittedAt: 'desc' }],
      include: {
        author: {
          select: { id: true, name: true, email: true, organization: true }
        },
        authors: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            affiliations: true,
            phone: true,
            orcid: true,
            isPresenter: true,
            order: true,
          },
          orderBy: { order: 'asc' },
        },
        category: {
          select: { id: true, name: true }
        },
        type: {
          select: { id: true, name: true }
        }
      }
    });
    res.json(submissions);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

// GET /api/conferences/:id/submissions/export - export submissions as CSV or JSON
// Organizer/admin only; supports same filters as list endpoint.
export const exportConferenceSubmissions = async (req: Request, res: Response) => {
  try {
    // Resolve slug or numeric ID to numeric ID
    const conferenceId = await resolveConferenceId(req.params.id);
    const userId = getUserId(req);
    const { format = 'csv', status, q } = req.query as {
      format?: string;
      status?: string;
      q?: string;
    };

    const conference = await prisma.conference.findUnique({ where: { id: conferenceId } });
    if (!conference) { res.status(404).json({ message: 'Conference not found' }); return; }

    if (!(isAdmin(req) || conference.createdById === userId)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const where: NonNullable<Parameters<typeof prisma.submission.findMany>[0]>['where'] = {
      conferenceId,
      // Organizers/admins should never see author drafts.
      NOT: { status: SubmissionStatus.draft },
    };

    if (status && Object.values(SubmissionStatus).includes(status as SubmissionStatus)) {
      where.status = status as SubmissionStatus;
    }

    if (q && q.trim().length > 0) {
      const term = q.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { abstract: { contains: term, mode: 'insensitive' } },
        { keywords: { hasSome: [term] } },
      ];
    }

    const submissions = await prisma.submission.findMany({
      where,
      orderBy: [{ submittedAt: 'desc' }],
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if ((format || '').toLowerCase() === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.json(submissions);
      return;
    }

    // Default: CSV export
    const header = [
      'id',
      'title',
      'status',
      'authorId',
      'authorName',
      'authorEmail',
      'submittedAt',
      'updatedAt',
      'keywords',
    ];

    const escapeCsv = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (/[",\n]/.test(str)) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    type ExportSubmission = Prisma.SubmissionGetPayload<{
      include: { author: { select: { id: true; name: true; email: true } } };
    }>;

    const rows = submissions.map((s: ExportSubmission) => [
      s.id,
      s.title,
      s.status,
      s.author?.id ?? '',
      s.author?.name ?? '',
      s.author?.email ?? '',
      s.submittedAt ? s.submittedAt.toISOString() : '',
      s.updatedAt ? s.updatedAt.toISOString() : '',
      (s.keywords || []).join('; '),
    ]);

    const csv = [header.map(escapeCsv).join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="conference-${conferenceId}-submissions.csv"`);
    res.send(csv);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

// POST /api/submissions/:submissionId/review - add/update review (reviewer role assumed by organizer/admin for now)
export const reviewSubmission = async (req: Request, res: Response) => {
  try {
    const submissionId = Number(req.params.submissionId);
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const scoreRaw = (req.body as { score?: unknown })?.score;
    const score = typeof scoreRaw === 'number' ? scoreRaw : undefined;
    if (score === undefined || score < 0 || score > 100) {
      res.status(400).json({ message: 'Score must be 0-100' });
      return;
    }

    const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
    if (!submission) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    // For simplicity allow organizer/admin only
    const conference = await prisma.conference.findUnique({ where: { id: submission.conferenceId } });
    if (!conference) {
      res.status(404).json({ message: 'Conference missing' });
      return;
    }
    if (!(isAdmin(req) || conference.createdById === userId)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const review = await prisma.$transaction(async (tx) => {
      const existing = await tx.submissionReview.findFirst({
        where: { submissionId, reviewerId: userId },
      });

      const nextReview = existing
        ? await tx.submissionReview.update({
            where: { id: existing.id },
            data: { score },
          })
        : await tx.submissionReview.create({
            data: { submissionId, reviewerId: userId, score },
          });

      // Clear review lifecycle: first review moves submitted -> under_review.
      if (submission.status === SubmissionStatus.submitted) {
        await tx.submission.update({
          where: { id: submissionId },
          data: { status: SubmissionStatus.under_review },
        });
      }

      return nextReview;
    });

    res.json(review);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

// POST /api/organizer/submissions/:submissionId/start-review - manually move submitted -> under_review
export const startSubmissionReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const submissionId = Number(req.params.submissionId);
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
    if (!submission) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    const conference = await prisma.conference.findUnique({ where: { id: submission.conferenceId } });
    if (!conference) {
      res.status(404).json({ message: 'Conference missing' });
      return;
    }

    if (!(isAdmin(req) || conference.createdById === userId)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    if (submission.status !== SubmissionStatus.submitted) {
      res.status(400).json({ message: 'Can only start review for submitted submissions' });
      return;
    }

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: { status: SubmissionStatus.under_review },
    });

    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

// POST /api/submissions/:submissionId/decision - accept/reject (organizer/admin)
export const decideSubmission = async (req: Request, res: Response) => {
  try {
    const submissionId = Number(req.params.submissionId);
    const decisionRaw = (req.body as { decision?: unknown })?.decision;
    const decision = typeof decisionRaw === 'string' ? decisionRaw : undefined; // 'accepted' | 'rejected'
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }
    if (decision !== 'accepted' && decision !== 'rejected') { res.status(400).json({ message: 'Invalid decision' }); return; }
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
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
    if (!submission) { res.status(404).json({ message: 'Not found' }); return; }
    const conference = await prisma.conference.findUnique({ where: { id: submission.conferenceId } });
    if (!conference) { res.status(404).json({ message: 'Conference missing' }); return; }
    if (!(isAdmin(req) || conference.createdById === userId)) { res.status(403).json({ message: 'Forbidden' }); return; }
    if (!['submitted','under_review'].includes(submission.status)) { res.status(400).json({ message: 'Cannot decide at this stage' }); return; }

    const updated = await prisma.$transaction(async (tx) => {
      let presentationId: number | null = submission.presentationId ?? null;
      if (decision === 'accepted') {
        const shapedSubmission: SubmissionWithAuthor = {
          id: submission.id,
          title: submission.title,
          abstract: submission.abstract,
          keywords: submission.keywords,
          authorId: submission.authorId,
          conferenceId: submission.conferenceId,
          presentationId: submission.presentationId ?? null,
          typeId: submission.typeId ?? null,
          categoryId: submission.categoryId ?? null,
          author: submission.author,
          authorEntries: submission.authors,
        };
        presentationId = await ensurePresentationForAcceptedSubmission(tx, shapedSubmission);
      }

      return tx.submission.update({
        where: { id: submissionId },
        data: {
          status: decision === 'accepted' ? 'accepted' : 'rejected',
          ...(decision === 'accepted'
            ? {
                isLocked: true,
                lockedAt: new Date(),
                lockedReason: 'Locked after acceptance',
                presentationId: presentationId ?? undefined,
              }
            : {}),
        },
      });
    });

    // Audit log the decision
    await logAdminAction(
      userId,
      decision === 'accepted' ? 'SUBMISSION_ACCEPT' : 'SUBMISSION_REJECT',
      'Submission',
      submissionId,
      {
        oldValue: submission.status,
        newValue: decision === 'accepted' ? 'accepted' : 'rejected',
        conferenceId: submission.conferenceId,
        submissionTitle: submission.title,
      },
      req
    );

    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};
