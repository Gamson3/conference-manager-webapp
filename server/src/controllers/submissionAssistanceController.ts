/**
 * Submission Assistance Controller
 *
 * Handles consent-based delegation allowing organizers to assist authors with submissions.
 * Authors explicitly grant consent; organizers can request consent if not granted.
 *
 * Key flows:
 * 1. Organizer requests consent from author (creates SubmissionAssistanceRequest)
 * 2. Author approves/denies request (updates request status, creates consent if approved)
 * 3. Author can grant consent directly without a request
 * 4. Author can revoke consent at any time
 * 5. Organizer checks consent status before assisting
 *
 * Audit: All actions are logged via AdminAuditLog with performedBy/onBehalfOf pattern.
 */

import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { Prisma, PrismaClient } from '@prisma/client';
import { getUserId, isAdmin } from '../utils/authHelper';

// ===================== TYPES =====================

interface ConsentCheckResult {
  hasConsent: boolean;
  consent: {
    id: number;
    grantedAt: Date;
    expiresAt: Date | null;
  } | null;
  pendingRequest: {
    id: number;
    createdAt: Date;
    message: string | null;
  } | null;
}

// ===================== HELPERS =====================

function getRequestIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip || null;
}

function getRequestUserAgent(req: Request): string | null {
  return req.get('user-agent') || null;
}

async function writeAuditLog(params: {
  actorId: number;
  action: string;
  entityType: 'SubmissionAssistanceConsent' | 'SubmissionAssistanceRequest';
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
        impersonatedUserId: params.onBehalfOfUserId,
      },
    });
  } catch (error: unknown) {
    console.error('Failed to write audit log:', error);
  }
}

/**
 * Validates that the user is an organizer of the conference (creator or admin).
 */
async function assertOrganizerAccess(
  userId: number,
  conferenceId: number,
  req: Request
): Promise<{ isOrganizer: boolean; conference: { id: number; name: string; createdById: number } | null }> {
  const conference = await prisma.conference.findUnique({
    where: { id: conferenceId },
    select: { id: true, name: true, createdById: true },
  });

  if (!conference) {
    return { isOrganizer: false, conference: null };
  }

  const isOrganizer = isAdmin(req) || conference.createdById === userId;
  return { isOrganizer, conference };
}

/**
 * Checks if active consent exists between organizer and author for a conference.
 * Active = not revoked AND (no expiration OR expiration in future).
 */
async function getActiveConsent(
  conferenceId: number,
  authorId: number,
  organizerId: number
): Promise<{ id: number; grantedAt: Date; expiresAt: Date | null } | null> {
  const consent = await prisma.submissionAssistanceConsent.findUnique({
    where: {
      conferenceId_authorId_organizerId: {
        conferenceId,
        authorId,
        organizerId,
      },
    },
  });

  if (!consent) return null;
  if (consent.revokedAt) return null;
  if (consent.expiresAt && consent.expiresAt < new Date()) return null;

  return {
    id: consent.id,
    grantedAt: consent.grantedAt,
    expiresAt: consent.expiresAt,
  };
}

/**
 * Helper exported for use in submission mutations.
 * Throws if consent is not valid.
 */
export async function assertConsentStillValid(
  conferenceId: number,
  authorId: number,
  organizerId: number
): Promise<void> {
  const consent = await getActiveConsent(conferenceId, authorId, organizerId);
  if (!consent) {
    throw new Error('Consent not granted or has been revoked');
  }
}

// ===================== ORGANIZER ENDPOINTS =====================

/**
 * GET /api/organizer/conferences/:id/assistance/consent/:authorId
 *
 * Check consent status for a specific author in this conference.
 * Returns whether consent is granted and any pending request.
 */
export const checkConsentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const conferenceId = Number(req.params.id);
    const authorId = Number(req.params.authorId);
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (isNaN(conferenceId) || isNaN(authorId)) {
      res.status(400).json({ message: 'Invalid conference or author ID' });
      return;
    }

    const { isOrganizer, conference } = await assertOrganizerAccess(userId, conferenceId, req);
    if (!isOrganizer || !conference) {
      res.status(403).json({ message: 'Not authorized to manage this conference' });
      return;
    }

    const consent = await getActiveConsent(conferenceId, authorId, userId);

    const pendingRequest = await prisma.submissionAssistanceRequest.findFirst({
      where: {
        conferenceId,
        authorId,
        organizerId: userId,
        status: 'pending',
      },
      select: {
        id: true,
        createdAt: true,
        message: true,
      },
    });

    const result: ConsentCheckResult = {
      hasConsent: consent !== null,
      consent,
      pendingRequest,
    };

    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

/**
 * POST /api/organizer/conferences/:id/assistance/request/:authorId
 *
 * Request consent from an author to assist with their submissions.
 * If consent already exists, returns success without creating a request.
 * If a pending request exists, returns that request.
 */
export const requestConsent = async (req: Request, res: Response): Promise<void> => {
  try {
    const conferenceId = Number(req.params.id);
    const authorId = Number(req.params.authorId);
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (isNaN(conferenceId) || isNaN(authorId)) {
      res.status(400).json({ message: 'Invalid conference or author ID' });
      return;
    }

    const { isOrganizer, conference } = await assertOrganizerAccess(userId, conferenceId, req);
    if (!isOrganizer || !conference) {
      res.status(403).json({ message: 'Not authorized to manage this conference' });
      return;
    }

    // Verify author exists
    const author = await prisma.user.findUnique({
      where: { id: authorId },
      select: { id: true, name: true, email: true },
    });

    if (!author) {
      res.status(404).json({ message: 'Author not found' });
      return;
    }

    // Check if consent already exists
    const existingConsent = await getActiveConsent(conferenceId, authorId, userId);
    if (existingConsent) {
      res.json({
        status: 'already_granted',
        consent: existingConsent,
      });
      return;
    }

    // Check for existing pending request
    const existingRequest = await prisma.submissionAssistanceRequest.findFirst({
      where: {
        conferenceId,
        authorId,
        organizerId: userId,
        status: 'pending',
      },
    });

    if (existingRequest) {
      res.json({
        status: 'pending',
        request: existingRequest,
      });
      return;
    }

    // Parse optional message from body
    const body = typeof req.body === 'object' && req.body !== null ? req.body as Record<string, unknown> : {};
    const message = typeof body.message === 'string' ? body.message.trim() : null;

    // Create new request
    const request = await prisma.submissionAssistanceRequest.create({
      data: {
        conferenceId,
        authorId,
        organizerId: userId,
        message: message || null,
        status: 'pending',
      },
    });

    await writeAuditLog({
      actorId: userId,
      action: 'ASSISTANCE_REQUEST_CREATED',
      entityType: 'SubmissionAssistanceRequest',
      entityId: request.id,
      metadata: {
        conferenceId,
        conferenceName: conference.name,
        authorId,
        authorName: author.name,
        authorEmail: author.email,
      },
      req,
    });

    res.status(201).json({
      status: 'requested',
      request,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

/**
 * GET /api/organizer/conferences/:id/assistance/authors
 *
 * List all authors in this conference with their consent status.
 * Useful for the People page to show "Assist" button state.
 */
export const listAuthorsWithConsentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const conferenceId = Number(req.params.id);
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (isNaN(conferenceId)) {
      res.status(400).json({ message: 'Invalid conference ID' });
      return;
    }

    const { isOrganizer, conference } = await assertOrganizerAccess(userId, conferenceId, req);
    if (!isOrganizer || !conference) {
      res.status(403).json({ message: 'Not authorized to manage this conference' });
      return;
    }

    // Get all submissions for this conference grouped by author
    const submissions = await prisma.submission.findMany({
      where: { conferenceId },
      select: {
        id: true,
        authorId: true,
        status: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Deduplicate by author
    const authorMap = new Map<number, { id: number; name: string; email: string; submissionCount: number }>();
    for (const sub of submissions) {
      const existing = authorMap.get(sub.authorId);
      if (existing) {
        existing.submissionCount += 1;
      } else {
        authorMap.set(sub.authorId, {
          id: sub.author.id,
          name: sub.author.name,
          email: sub.author.email,
          submissionCount: 1,
        });
      }
    }

    // Get all consents and pending requests for this organizer in this conference
    const [consents, requests] = await Promise.all([
      prisma.submissionAssistanceConsent.findMany({
        where: {
          conferenceId,
          organizerId: userId,
          revokedAt: null,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        select: {
          authorId: true,
          grantedAt: true,
          expiresAt: true,
        },
      }),
      prisma.submissionAssistanceRequest.findMany({
        where: {
          conferenceId,
          organizerId: userId,
          status: 'pending',
        },
        select: {
          authorId: true,
          createdAt: true,
        },
      }),
    ]);

    const consentByAuthor = new Map(consents.map((c: { authorId: number; grantedAt: Date; expiresAt: Date | null }) => [c.authorId, c]));
    const requestByAuthor = new Map(requests.map((r: { authorId: number; createdAt: Date }) => [r.authorId, r]));

    const authors = Array.from(authorMap.values()).map((author) => ({
      ...author,
      hasConsent: consentByAuthor.has(author.id),
      consent: consentByAuthor.get(author.id) || null,
      hasPendingRequest: requestByAuthor.has(author.id),
      pendingRequest: requestByAuthor.get(author.id) || null,
    }));

    res.json(authors);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

// ===================== AUTHOR ENDPOINTS =====================

/**
 * GET /api/account/assistance/requests
 *
 * Get all pending assistance requests for the current user (author).
 */
export const getMyPendingRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const requests = await prisma.submissionAssistanceRequest.findMany({
      where: {
        authorId: userId,
        status: 'pending',
      },
      include: {
        conference: {
          select: { id: true, name: true, slug: true },
        },
        organizer: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

/**
 * GET /api/account/assistance/consents
 *
 * Get all active consents granted by the current user (author).
 */
export const getMyGrantedConsents = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const consents = await prisma.submissionAssistanceConsent.findMany({
      where: {
        authorId: userId,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        conference: {
          select: { id: true, name: true, slug: true },
        },
        organizer: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { grantedAt: 'desc' },
    });

    res.json(consents);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

/**
 * POST /api/account/assistance/requests/:requestId/respond
 *
 * Respond to an assistance request (approve or deny).
 * If approved, creates a consent record.
 */
export const respondToRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const requestId = Number(req.params.requestId);
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (isNaN(requestId)) {
      res.status(400).json({ message: 'Invalid request ID' });
      return;
    }

    const body = typeof req.body === 'object' && req.body !== null ? req.body as Record<string, unknown> : {};
    const action = body.action;
    const responseNote = typeof body.responseNote === 'string' ? body.responseNote.trim() : null;

    if (action !== 'approve' && action !== 'deny') {
      res.status(400).json({ message: 'Action must be "approve" or "deny"' });
      return;
    }

    const request = await prisma.submissionAssistanceRequest.findUnique({
      where: { id: requestId },
      include: {
        conference: { select: { id: true, name: true } },
        organizer: { select: { id: true, name: true, email: true } },
      },
    });

    if (!request) {
      res.status(404).json({ message: 'Request not found' });
      return;
    }

    if (request.authorId !== userId) {
      res.status(403).json({ message: 'Not authorized to respond to this request' });
      return;
    }

    if (request.status !== 'pending') {
      res.status(400).json({ message: 'Request has already been responded to' });
      return;
    }

    type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;
    const result = await prisma.$transaction(async (tx: TxClient) => {
      // Update request status
      const updatedRequest = await tx.submissionAssistanceRequest.update({
        where: { id: requestId },
        data: {
          status: action === 'approve' ? 'approved' : 'denied',
          respondedAt: new Date(),
          responseNote: responseNote || null,
        },
      });

      let consent = null;
      if (action === 'approve') {
        // Create or update consent (upsert to handle edge cases)
        consent = await tx.submissionAssistanceConsent.upsert({
          where: {
            conferenceId_authorId_organizerId: {
              conferenceId: request.conferenceId,
              authorId: userId,
              organizerId: request.organizerId,
            },
          },
          update: {
            revokedAt: null, // Re-activate if previously revoked
            grantedAt: new Date(),
            expiresAt: null,
          },
          create: {
            conferenceId: request.conferenceId,
            authorId: userId,
            organizerId: request.organizerId,
          },
        });
      }

      return { request: updatedRequest, consent };
    });

    await writeAuditLog({
      actorId: userId,
      action: action === 'approve' ? 'ASSISTANCE_REQUEST_APPROVED' : 'ASSISTANCE_REQUEST_DENIED',
      entityType: 'SubmissionAssistanceRequest',
      entityId: requestId,
      metadata: {
        conferenceId: request.conferenceId,
        conferenceName: request.conference.name,
        organizerId: request.organizerId,
        organizerName: request.organizer.name,
        responseNote: responseNote || null,
      },
      req,
    });

    if (result.consent) {
      await writeAuditLog({
        actorId: userId,
        action: 'ASSISTANCE_CONSENT_GRANTED',
        entityType: 'SubmissionAssistanceConsent',
        entityId: result.consent.id,
        metadata: {
          conferenceId: request.conferenceId,
          conferenceName: request.conference.name,
          organizerId: request.organizerId,
          organizerName: request.organizer.name,
          viaRequestId: requestId,
        },
        req,
      });
    }

    res.json({
      status: action === 'approve' ? 'approved' : 'denied',
      request: result.request,
      consent: result.consent,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

/**
 * POST /api/account/assistance/consents
 *
 * Grant consent directly without a request (author-initiated).
 */
export const grantConsentDirectly = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const body = typeof req.body === 'object' && req.body !== null ? req.body as Record<string, unknown> : {};
    const conferenceId = typeof body.conferenceId === 'number' ? body.conferenceId : null;
    const organizerId = typeof body.organizerId === 'number' ? body.organizerId : null;

    if (!conferenceId || !organizerId) {
      res.status(400).json({ message: 'conferenceId and organizerId are required' });
      return;
    }

    // Verify conference exists
    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
      select: { id: true, name: true, createdById: true },
    });

    if (!conference) {
      res.status(404).json({ message: 'Conference not found' });
      return;
    }

    // Verify organizer is actually an organizer of this conference
    const isOrganizerOfConference = conference.createdById === organizerId;
    const organizerUser = await prisma.user.findUnique({
      where: { id: organizerId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!organizerUser) {
      res.status(404).json({ message: 'Organizer not found' });
      return;
    }

    const isAdminUser = organizerUser.role === 'admin';
    if (!isOrganizerOfConference && !isAdminUser) {
      res.status(400).json({ message: 'Specified user is not an organizer of this conference' });
      return;
    }

    // Create or reactivate consent
    const consent = await prisma.submissionAssistanceConsent.upsert({
      where: {
        conferenceId_authorId_organizerId: {
          conferenceId,
          authorId: userId,
          organizerId,
        },
      },
      update: {
        revokedAt: null,
        grantedAt: new Date(),
        expiresAt: null,
      },
      create: {
        conferenceId,
        authorId: userId,
        organizerId,
      },
    });

    await writeAuditLog({
      actorId: userId,
      action: 'ASSISTANCE_CONSENT_GRANTED',
      entityType: 'SubmissionAssistanceConsent',
      entityId: consent.id,
      metadata: {
        conferenceId,
        conferenceName: conference.name,
        organizerId,
        organizerName: organizerUser.name,
        directGrant: true,
      },
      req,
    });

    res.status(201).json(consent);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

/**
 * DELETE /api/account/assistance/consents/:consentId
 *
 * Revoke a previously granted consent.
 */
export const revokeConsent = async (req: Request, res: Response): Promise<void> => {
  try {
    const consentId = Number(req.params.consentId);
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (isNaN(consentId)) {
      res.status(400).json({ message: 'Invalid consent ID' });
      return;
    }

    const consent = await prisma.submissionAssistanceConsent.findUnique({
      where: { id: consentId },
      include: {
        conference: { select: { id: true, name: true } },
        organizer: { select: { id: true, name: true } },
      },
    });

    if (!consent) {
      res.status(404).json({ message: 'Consent not found' });
      return;
    }

    if (consent.authorId !== userId) {
      res.status(403).json({ message: 'Not authorized to revoke this consent' });
      return;
    }

    if (consent.revokedAt) {
      res.status(400).json({ message: 'Consent has already been revoked' });
      return;
    }

    const updated = await prisma.submissionAssistanceConsent.update({
      where: { id: consentId },
      data: { revokedAt: new Date() },
    });

    await writeAuditLog({
      actorId: userId,
      action: 'ASSISTANCE_CONSENT_REVOKED',
      entityType: 'SubmissionAssistanceConsent',
      entityId: consentId,
      metadata: {
        conferenceId: consent.conferenceId,
        conferenceName: consent.conference.name,
        organizerId: consent.organizerId,
        organizerName: consent.organizer.name,
      },
      req,
    });

    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};
