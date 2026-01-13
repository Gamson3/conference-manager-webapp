import { Request, Response } from "express";
import prisma from '../lib/prisma';
import { getUserId, isAdmin } from "../utils/authHelper";
import { generateUniqueSlug } from '../utils/slugGenerator';
import { generateConferenceDays } from '../utils/dayGenerator';

// Get all published conferences
export const getPublicConferences = async (req: Request, res: Response) => {
  try {
    const conferences = await prisma.conference.findMany({
      where: { 
        status: "published",
        isPublic: true 
      },
      orderBy: { startDate: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        startDate: true,
        endDate: true,
        location: true,
        venue: true,
        timezone: true,
        bannerImageUrl: true,
        topics: true,
        // windows for computed flags
        submissionsOpenFrom: true,
        submissionsOpenUntil: true,
        registrationOpenFrom: true,
        registrationOpenUntil: true,
      }
    });
    const now = new Date();
    const withFlags = conferences.map(c => ({
      ...c,
      isSubmissionOpen: (
        (!c.submissionsOpenFrom || c.submissionsOpenFrom <= now) &&
        (!c.submissionsOpenUntil || c.submissionsOpenUntil >= now)
      ),
      isRegistrationOpen: (
        c.registrationOpenFrom && c.registrationOpenUntil &&
        c.registrationOpenFrom <= now &&
        c.registrationOpenUntil >= now
      )
    }));
    res.json(withFlags);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// CREATE (Organizer/Admin)
export const createConference = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const {
      name,
      description,
      startDate,
      endDate,
      location,
      timezone = 'UTC',
      topics = [],
      isPublic = false,
      websiteUrl,
      venue,
      venueAddress,
      organizerNotes,
      bannerImageUrl,
      capacity,
      // Organizer profile (optional)
      organizerName,
      organizerEmail,
      organizerPhone,
      organizerWebsite,
      organizerLogoUrl,
      // Review window & submission limits (optional)
      reviewStartsAt,
      reviewEndsAt,
      maxSubmissionsPerUser,
    } = req.body;

    if (!name || !startDate || !endDate) {
      res.status(400).json({ message: 'Name, startDate and endDate are required' });
      return;
    }

    // Generate unique slug from conference name and year
    const slug = await generateUniqueSlug(name, new Date(startDate));

    const conference = await prisma.conference.create({
      data: {
        name: String(name),
        slug, // Auto-generated unique slug
        description: description ? String(description) : undefined,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location: location ? String(location) : undefined,
        timezone: String(timezone),
        topics: Array.isArray(topics) ? topics.map((t: any) => String(t)) : [],
        isPublic: Boolean(isPublic),
        websiteUrl: websiteUrl ? String(websiteUrl) : undefined,
        venue: venue ? String(venue) : undefined,
        venueAddress: venueAddress ? String(venueAddress) : undefined,
        organizerNotes: organizerNotes ? String(organizerNotes) : undefined,
        bannerImageUrl: bannerImageUrl ? String(bannerImageUrl) : undefined,
          capacity: capacity ? Number(capacity) : undefined,
          // Organizer profile
          organizerName: organizerName ? String(organizerName) : undefined,
          organizerEmail: organizerEmail ? String(organizerEmail) : undefined,
          organizerPhone: organizerPhone ? String(organizerPhone) : undefined,
          organizerWebsite: organizerWebsite ? String(organizerWebsite) : undefined,
          organizerLogoUrl: organizerLogoUrl ? String(organizerLogoUrl) : undefined,
          // Review window & limits
          reviewStartsAt: reviewStartsAt ? new Date(reviewStartsAt) : undefined,
          reviewEndsAt: reviewEndsAt ? new Date(reviewEndsAt) : undefined,
          maxSubmissionsPerUser: typeof maxSubmissionsPerUser === 'number' ? maxSubmissionsPerUser : undefined,
        createdById: Number(userId),
        status: 'draft',
        // Safe-by-default windows and visibility
        submissionsVisibility: 'private',
        submissionsOpenFrom: null,
        submissionsOpenUntil: null,
        registrationOpenFrom: null,
        registrationOpenUntil: null,
      }
    });

    // Auto-generate days based on start and end dates
    await generateConferenceDays(conference.id, new Date(startDate), new Date(endDate));

    res.status(201).json(conference);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// GET organizer/admin owned conferences
export const getMyConferences = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }
    const conferences = await prisma.conference.findMany({
      where: { createdById: Number(userId) },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { sections: true, participants: true } }
      }
    });
    res.json(conferences);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get public conference details
export const getPublicConferenceDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const numericId = Number(id);
    const userId = getUserId(req);
    const admin = isAdmin(req);

    // Support both numeric ID and slug-based lookup
    const isNumericId = !isNaN(numericId) && numericId > 0;
    const findQuery = isNumericId 
      ? { id: numericId }
      : { slug: id };

    // Always fetch conference (owner/admin may view drafts/private)
    const conference = await prisma.conference.findUnique({
      where: findQuery,
      include: {
        milestones: {
          select: {
            id: true,
            name: true,
            description: true,
            date: true,
            type: true,
          },
          orderBy: { date: 'asc' },
        },
        websiteContentBlocks: {
          where: { area: 'cfp' },
          select: { id: true, title: true, markdown: true, order: true, updatedAt: true },
          orderBy: { order: 'asc' },
        },
        sections: {
          select: {
            id: true,
            name: true,
            description: true,
            startTime: true,
            endTime: true,
            room: true,
          }
        }
      }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    const isPublishedPublic = conference.status === 'published' && conference.isPublic;
    const isOwner = userId && conference.createdById === Number(userId);
    const canViewDraft = isOwner || admin;

    // Hide drafts/private unless owner/admin
    if (!isPublishedPublic && !canViewDraft) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    const now = new Date();
    const flags = {
      isSubmissionOpen: (
        (!conference.submissionsOpenFrom || conference.submissionsOpenFrom <= now) &&
        (!conference.submissionsOpenUntil || conference.submissionsOpenUntil >= now)
      ),
      isRegistrationOpen: (
        conference.registrationOpenFrom && conference.registrationOpenUntil &&
        conference.registrationOpenFrom <= now &&
        conference.registrationOpenUntil >= now
      ),
      isDraftAccessible: !isPublishedPublic && canViewDraft
    } as const;

    // Requirements (public subset). If viewing draft as owner, include anyway for preview
    const reqs = await prisma.submissionRequirement.findUnique({
      where: { conferenceId: conference.id },
      select: {
        maxFileSizeMB: true,
        allowedFileTypes: true,
      }
    });

    res.json({
      ...conference,
      ...flags,
      requirementsPublic: reqs,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get public conference materials
export const getPublicConferenceMaterials = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const materials = await prisma.conferenceMaterial.findMany({
      where: { 
        conferenceId: Number(id),
        isPublic: true
      },
      orderBy: { uploadedAt: "desc" },
    });
    res.json(materials);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};