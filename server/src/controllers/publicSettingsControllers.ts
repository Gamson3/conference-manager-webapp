/**
 * Public Settings Controllers
 * Endpoints for authenticated users to view conference settings
 * (registration and submission requirements)
 * 
 * These expose organizer-configured settings to users without
 * requiring organizer permissions
 */

import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { resolveConferenceId } from '../utils/conferenceResolver';
import { sendError } from '../utils/httpError';

function isConferenceNotFoundError(error: unknown): boolean {
  return error instanceof Error && error.message === "Conference not found";
}

/**
 * GET /api/conferences/:id/registration/public-settings
 * Get public registration settings for a conference
 * Accessible to authenticated users
 */
export const getPublicRegistrationSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    // Resolve slug or numeric ID to numeric ID
    const conferenceId = await resolveConferenceId(req.params.id);

    // Registration settings are stored as fields in the Conference model
    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
      select: {
        id: true,
        registrationEnabled: true,
        registrationOpenFrom: true,
        registrationOpenUntil: true,
        maxAttendees: true,
        waitlistEnabled: true,
        requireApproval: true,
      }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    res.json(conference);
  } catch (error: unknown) {
    console.error('Error fetching public registration settings:', error);
    if (isConferenceNotFoundError(error)) {
      sendError(res, 404, "NOT_FOUND", "Conference not found");
      return;
    }
    sendError(res, 500, "INTERNAL", "Failed to load registration settings.");
  }
};

/**
 * GET /api/conferences/:id/abstracts/public-settings
 * Get public abstract submission settings for a conference
 * Accessible to authenticated users
 */
export const getPublicAbstractSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    // Resolve slug or numeric ID to numeric ID
    const conferenceId = await resolveConferenceId(req.params.id);

    // Get conference with submission window dates
    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
      select: {
        id: true,
        submissionsOpenFrom: true,
        submissionsOpenUntil: true,
      }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    // Get submission requirements (stored in SubmissionRequirement model)
    const requirements = await prisma.submissionRequirement.findUnique({
      where: { conferenceId },
      select: {
        id: true,
        abstractMinLength: true,
        abstractMaxLength: true,
        minKeywords: true,
        maxKeywords: true,
        maxFileSizeMB: true,
        allowedFileTypes: true,
        abstractUploadMode: true,
        // Author collection fields
        authorsEnabled: true,
        collectAuthorEmail: true,
        collectAuthorAffiliation: true,
        collectAuthorPhone: true,
        collectAuthorOrcid: true,
        // Title and body text configuration
        titleMaxWords: true,
        bodyTextLabel: true,
        bodyTextMinWords: true,
        bodyTextMaxWords: true,
        // File upload configuration
        fileFieldLabel: true,
        fileFieldRequired: true,
        // Full text collection
        collectFullText: true,
        fullTextTiming: true,
        requiresOrcid: true,
      }
    });

    const normalizedAuthorsEnabled = requirements?.authorsEnabled ?? true;
    const normalizedRequiresOrcid = normalizedAuthorsEnabled ? (requirements?.requiresOrcid ?? false) : false;
    const normalizedCollectAuthorOrcid = normalizedAuthorsEnabled
      ? (normalizedRequiresOrcid ? true : (requirements?.collectAuthorOrcid ?? false))
      : false;
    const normalizedCollectAuthorEmail = normalizedAuthorsEnabled ? (requirements?.collectAuthorEmail ?? true) : false;
    const normalizedCollectAuthorAffiliation = normalizedAuthorsEnabled ? (requirements?.collectAuthorAffiliation ?? true) : false;
    const normalizedCollectAuthorPhone = normalizedAuthorsEnabled ? (requirements?.collectAuthorPhone ?? false) : false;

    const storedMaxKeywords = requirements?.maxKeywords ?? 8;
    const keywordsEnabled = storedMaxKeywords > 0;
    const normalizedMaxKeywords = keywordsEnabled ? Math.max(5, storedMaxKeywords) : 0;
    const storedMinKeywords = requirements?.minKeywords ?? 5;
    const normalizedMinKeywords = keywordsEnabled
      ? Math.min(normalizedMaxKeywords, Math.max(5, storedMinKeywords))
      : 0;

    // Get categories and presentation types
    const [categories, presentationTypes] = await Promise.all([
      prisma.conferenceCategory.findMany({
        where: { conferenceId },
        select: {
          id: true,
          name: true,
          description: true,
        },
        orderBy: { name: 'asc' }
      }),
      prisma.presentationType.findMany({
        where: { conferenceId },
        select: {
          id: true,
          name: true,
          description: true,
          defaultDuration: true,
        },
        orderBy: { name: 'asc' }
      })
    ]);

    // Calculate if submissions are currently open based on dates
    const now = new Date();
    const isSubmissionOpen = conference.submissionsOpenFrom && conference.submissionsOpenUntil
      ? now >= new Date(conference.submissionsOpenFrom) && now <= new Date(conference.submissionsOpenUntil)
      : false;

    // Combine conference submission window with requirements
    const settings = {
      id: conference.id,
      isSubmissionOpen,
      submissionsOpenFrom: conference.submissionsOpenFrom,
      submissionsOpenUntil: conference.submissionsOpenUntil,
      categories,
      presentationTypes,
      ...requirements, // Include all requirement fields
      authorsEnabled: normalizedAuthorsEnabled,
      requiresOrcid: normalizedRequiresOrcid,
      collectAuthorOrcid: normalizedCollectAuthorOrcid,
      collectAuthorEmail: normalizedCollectAuthorEmail,
      collectAuthorAffiliation: normalizedCollectAuthorAffiliation,
      collectAuthorPhone: normalizedCollectAuthorPhone,
      minKeywords: normalizedMinKeywords,
      maxKeywords: normalizedMaxKeywords,
    };

    res.json(settings);
  } catch (error: unknown) {
    console.error('Error fetching public abstract settings:', error);
    if (isConferenceNotFoundError(error)) {
      sendError(res, 404, "NOT_FOUND", "Conference not found");
      return;
    }
    sendError(res, 500, "INTERNAL", "Failed to load submission settings.");
  }
};
