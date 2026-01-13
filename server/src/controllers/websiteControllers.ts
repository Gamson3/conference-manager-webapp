import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getUserId, isAdmin } from '../utils/authHelper';

type WebsiteContentBlockInput = {
  title?: string;
  markdown: string;
};

// ============================================================================
// MATERIALS MANAGEMENT
// ============================================================================

// GET /api/conferences/:id/materials - List all materials for a conference
export const listMaterials = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    // Check conference exists and user has access
    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      select: { id: true, createdById: true, isPublic: true, status: true },
    });

    if (!conference) {
      res.status(404).json({ message: 'Conference not found' });
      return;
    }

    // Organizers/admins see all materials, others see only public materials from public conferences
    const canViewAll = isAdmin(req) || conference.createdById === userId;

    const materials = await prisma.conferenceMaterial.findMany({
      where: {
        conferenceId: Number(id),
        ...(canViewAll ? {} : { isPublic: true }),
      },
      orderBy: { uploadedAt: 'desc' },
    });

    res.json(materials);
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error listing materials:', err);
    res.status(500).json({ message: 'Failed to list materials', error: err.message });
  }
};

// POST /api/conferences/:id/materials - Create a new material
export const createMaterial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { title, description, fileUrl, fileType, isPublic = true } = req.body;

    // Check conference exists and user has access
    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      select: { id: true, createdById: true },
    });

    if (!conference) {
      res.status(404).json({ message: 'Conference not found' });
      return;
    }

    const canEdit = isAdmin(req) || conference.createdById === userId;
    if (!canEdit) {
      res.status(403).json({ message: 'Not authorized to add materials' });
      return;
    }

    // Validate required fields
    if (!title?.trim()) {
      res.status(400).json({ message: 'Material title is required' });
      return;
    }
    if (!fileUrl?.trim()) {
      res.status(400).json({ message: 'File URL is required' });
      return;
    }
    if (!fileType?.trim()) {
      res.status(400).json({ message: 'File type is required' });
      return;
    }

    // Validate file type (allowed types)
    const allowedTypes = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif', 'zip'];
    const normalizedType = fileType.toLowerCase().replace('.', '');
    if (!allowedTypes.includes(normalizedType)) {
      res.status(400).json({ 
        message: `File type '${fileType}' not allowed. Allowed types: ${allowedTypes.join(', ')}` 
      });
      return;
    }

    const material = await prisma.conferenceMaterial.create({
      data: {
        conferenceId: Number(id),
        title: title.trim(),
        description: description?.trim() || null,
        fileUrl: fileUrl.trim(),
        fileType: normalizedType,
        isPublic: Boolean(isPublic),
      },
    });

    res.status(201).json(material);
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error creating material:', err);
    res.status(500).json({ message: 'Failed to create material', error: err.message });
  }
};

// PUT /api/conferences/:id/materials/:materialId - Update a material
export const updateMaterial = async (req: Request, res: Response) => {
  try {
    const { id, materialId } = req.params;
    const userId = getUserId(req);
    const { title, description, isPublic } = req.body;

    // Check conference exists and user has access
    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      select: { id: true, createdById: true },
    });

    if (!conference) {
      res.status(404).json({ message: 'Conference not found' });
      return;
    }

    const canEdit = isAdmin(req) || conference.createdById === userId;
    if (!canEdit) {
      res.status(403).json({ message: 'Not authorized to update materials' });
      return;
    }

    // Check material exists and belongs to this conference
    const existingMaterial = await prisma.conferenceMaterial.findFirst({
      where: { id: Number(materialId), conferenceId: Number(id) },
    });

    if (!existingMaterial) {
      res.status(404).json({ message: 'Material not found' });
      return;
    }

    const material = await prisma.conferenceMaterial.update({
      where: { id: Number(materialId) },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(isPublic !== undefined && { isPublic: Boolean(isPublic) }),
      },
    });

    res.json(material);
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error updating material:', err);
    res.status(500).json({ message: 'Failed to update material', error: err.message });
  }
};

// DELETE /api/conferences/:id/materials/:materialId - Delete a material
export const deleteMaterial = async (req: Request, res: Response) => {
  try {
    const { id, materialId } = req.params;
    const userId = getUserId(req);

    // Check conference exists and user has access
    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      select: { id: true, createdById: true },
    });

    if (!conference) {
      res.status(404).json({ message: 'Conference not found' });
      return;
    }

    const canEdit = isAdmin(req) || conference.createdById === userId;
    if (!canEdit) {
      res.status(403).json({ message: 'Not authorized to delete materials' });
      return;
    }

    // Check material exists and belongs to this conference
    const existingMaterial = await prisma.conferenceMaterial.findFirst({
      where: { id: Number(materialId), conferenceId: Number(id) },
    });

    if (!existingMaterial) {
      res.status(404).json({ message: 'Material not found' });
      return;
    }

    await prisma.conferenceMaterial.delete({
      where: { id: Number(materialId) },
    });

    res.json({ deleted: true, id: Number(materialId) });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error deleting material:', err);
    res.status(500).json({ message: 'Failed to delete material', error: err.message });
  }
};

// ============================================================================
// VISIBILITY SETTINGS
// ============================================================================

// GET /api/conferences/:id/visibility - Get visibility settings
export const getVisibilitySettings = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        createdById: true,
        isPublic: true,
        status: true,
        schedulePublishedAt: true,
        submissionsVisibility: true,
        // Registration visibility can be inferred from registrationOpenFrom/Until
        registrationOpenFrom: true,
        registrationOpenUntil: true,
      },
    });

    if (!conference) {
      res.status(404).json({ message: 'Conference not found' });
      return;
    }

    const canView = isAdmin(req) || conference.createdById === userId;
    if (!canView) {
      res.status(403).json({ message: 'Not authorized to view visibility settings' });
      return;
    }

    // Build visibility response
    res.json({
      conferenceId: conference.id,
      isPublic: conference.isPublic,
      status: conference.status,
      schedulePublished: !!conference.schedulePublishedAt,
      schedulePublishedAt: conference.schedulePublishedAt,
      abstractsVisibility: conference.submissionsVisibility, // 'public', 'private', 'invite_only'
      registrationOpen: conference.registrationOpenFrom && conference.registrationOpenUntil
        ? new Date() >= conference.registrationOpenFrom && new Date() <= conference.registrationOpenUntil
        : false,
      registrationOpenFrom: conference.registrationOpenFrom,
      registrationOpenUntil: conference.registrationOpenUntil,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error getting visibility settings:', err);
    res.status(500).json({ message: 'Failed to get visibility settings', error: err.message });
  }
};

// PUT /api/conferences/:id/visibility - Update visibility settings
export const updateVisibilitySettings = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { isPublic, abstractsVisibility } = req.body;

    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      select: { id: true, createdById: true },
    });

    if (!conference) {
      res.status(404).json({ message: 'Conference not found' });
      return;
    }

    const canEdit = isAdmin(req) || conference.createdById === userId;
    if (!canEdit) {
      res.status(403).json({ message: 'Not authorized to update visibility settings' });
      return;
    }

    // Validate abstractsVisibility
    const validVisibilities = ['public', 'private', 'invite_only'];
    if (abstractsVisibility && !validVisibilities.includes(abstractsVisibility)) {
      res.status(400).json({ 
        message: `Invalid abstracts visibility. Must be one of: ${validVisibilities.join(', ')}` 
      });
      return;
    }

    const updated = await prisma.conference.update({
      where: { id: Number(id) },
      data: {
        ...(isPublic !== undefined && { isPublic: Boolean(isPublic) }),
        ...(abstractsVisibility && { submissionsVisibility: abstractsVisibility }),
      },
      select: {
        id: true,
        isPublic: true,
        status: true,
        schedulePublishedAt: true,
        submissionsVisibility: true,
        registrationOpenFrom: true,
        registrationOpenUntil: true,
      },
    });

    res.json({
      conferenceId: updated.id,
      isPublic: updated.isPublic,
      status: updated.status,
      schedulePublished: !!updated.schedulePublishedAt,
      schedulePublishedAt: updated.schedulePublishedAt,
      abstractsVisibility: updated.submissionsVisibility,
      registrationOpen: updated.registrationOpenFrom && updated.registrationOpenUntil
        ? new Date() >= updated.registrationOpenFrom && new Date() <= updated.registrationOpenUntil
        : false,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error updating visibility settings:', err);
    res.status(500).json({ message: 'Failed to update visibility settings', error: err.message });
  }
};

// ============================================================================
// PUBLIC PAGE CONTENT
// ============================================================================

// GET /api/conferences/:id/public-page - Get public page content
export const getPublicPageContent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        location: true,
        venue: true,
        venueAddress: true,
        startDate: true,
        endDate: true,
        timezone: true,
        bannerImageUrl: true,
        websiteUrl: true,
        // Organizer info
        organizerName: true,
        organizerEmail: true,
        organizerPhone: true,
        organizerWebsite: true,
        organizerLogoUrl: true,
        organizerNotes: true,
        // Status
        isPublic: true,
        status: true,
        createdById: true,
      },
    });

    if (!conference) {
      res.status(404).json({ message: 'Conference not found' });
      return;
    }

    res.json(conference);
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error getting public page content:', err);
    res.status(500).json({ message: 'Failed to get public page content', error: err.message });
  }
};

// PUT /api/conferences/:id/public-page - Update public page content
export const updatePublicPageContent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const {
      description,
      location,
      venue,
      venueAddress,
      bannerImageUrl,
      websiteUrl,
      organizerName,
      organizerEmail,
      organizerPhone,
      organizerWebsite,
      organizerLogoUrl,
      organizerNotes,
    } = req.body;

    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      select: { id: true, createdById: true },
    });

    if (!conference) {
      res.status(404).json({ message: 'Conference not found' });
      return;
    }

    const canEdit = isAdmin(req) || conference.createdById === userId;
    if (!canEdit) {
      res.status(403).json({ message: 'Not authorized to update public page content' });
      return;
    }

    const updated = await prisma.conference.update({
      where: { id: Number(id) },
      data: {
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(location !== undefined && { location: location?.trim() || null }),
        ...(venue !== undefined && { venue: venue?.trim() || null }),
        ...(venueAddress !== undefined && { venueAddress: venueAddress?.trim() || null }),
        ...(bannerImageUrl !== undefined && { bannerImageUrl: bannerImageUrl?.trim() || null }),
        ...(websiteUrl !== undefined && { websiteUrl: websiteUrl?.trim() || null }),
        ...(organizerName !== undefined && { organizerName: organizerName?.trim() || null }),
        ...(organizerEmail !== undefined && { organizerEmail: organizerEmail?.trim() || null }),
        ...(organizerPhone !== undefined && { organizerPhone: organizerPhone?.trim() || null }),
        ...(organizerWebsite !== undefined && { organizerWebsite: organizerWebsite?.trim() || null }),
        ...(organizerLogoUrl !== undefined && { organizerLogoUrl: organizerLogoUrl?.trim() || null }),
        ...(organizerNotes !== undefined && { organizerNotes: organizerNotes?.trim() || null }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        location: true,
        venue: true,
        venueAddress: true,
        startDate: true,
        endDate: true,
        timezone: true,
        bannerImageUrl: true,
        websiteUrl: true,
        organizerName: true,
        organizerEmail: true,
        organizerPhone: true,
        organizerWebsite: true,
        organizerLogoUrl: true,
        organizerNotes: true,
        isPublic: true,
        status: true,
      },
    });

    res.json(updated);
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error updating public page content:', err);
    res.status(500).json({ message: 'Failed to update public page content', error: err.message });
  }
};

// ============================================================================
// CFP CONTENT (V2 - Content Blocks)
// ============================================================================

// GET /api/organizer/conferences/:id/website/cfp - Get CFP content (organizer)
export const getOrganizerCfpContent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      select: { id: true, createdById: true, submissionPortalUrl: true },
    });

    if (!conference) {
      res.status(404).json({ message: 'Conference not found' });
      return;
    }

    const canEdit = isAdmin(req) || conference.createdById === userId;
    if (!canEdit) {
      res.status(403).json({ message: 'Not authorized to view CFP content' });
      return;
    }

    const blocks = await prisma.conferenceWebsiteContentBlock.findMany({
      where: { conferenceId: Number(id), area: 'cfp' },
      orderBy: { order: 'asc' },
      select: { id: true, title: true, markdown: true, order: true, updatedAt: true },
    });

    res.json({
      conferenceId: conference.id,
      submissionPortalUrl: conference.submissionPortalUrl,
      blocks,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error getting CFP content:', err);
    res.status(500).json({ message: 'Failed to get CFP content', error: err.message });
  }
};

// PUT /api/organizer/conferences/:id/website/cfp - Replace CFP content (organizer)
export const updateOrganizerCfpContent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { submissionPortalUrl, blocks } = req.body as {
      submissionPortalUrl?: string | null;
      blocks?: WebsiteContentBlockInput[];
    };

    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      select: { id: true, createdById: true },
    });

    if (!conference) {
      res.status(404).json({ message: 'Conference not found' });
      return;
    }

    const canEdit = isAdmin(req) || conference.createdById === userId;
    if (!canEdit) {
      res.status(403).json({ message: 'Not authorized to update CFP content' });
      return;
    }

    const normalizedBlocks = (Array.isArray(blocks) ? blocks : []).map((b) => ({
      title: b.title?.trim() || null,
      markdown: (b.markdown || '').toString(),
    }));

    // Basic validation: require markdown for blocks we keep
    for (const b of normalizedBlocks) {
      if (!b.markdown.trim()) {
        res.status(400).json({ message: 'Each CFP content block must have markdown content' });
        return;
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.conference.update({
        where: { id: Number(id) },
        data: { submissionPortalUrl: submissionPortalUrl?.trim() || null },
        select: { id: true },
      });

      await tx.conferenceWebsiteContentBlock.deleteMany({
        where: { conferenceId: Number(id), area: 'cfp' },
      });

      if (normalizedBlocks.length > 0) {
        await tx.conferenceWebsiteContentBlock.createMany({
          data: normalizedBlocks.map((b, idx) => ({
            conferenceId: Number(id),
            area: 'cfp',
            title: b.title,
            markdown: b.markdown,
            order: idx + 1,
          })),
        });
      }
    });

    // Return fresh payload
    const updatedConference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      select: { id: true, submissionPortalUrl: true },
    });

    const updatedBlocks = await prisma.conferenceWebsiteContentBlock.findMany({
      where: { conferenceId: Number(id), area: 'cfp' },
      orderBy: { order: 'asc' },
      select: { id: true, title: true, markdown: true, order: true, updatedAt: true },
    });

    res.json({
      conferenceId: updatedConference?.id,
      submissionPortalUrl: updatedConference?.submissionPortalUrl ?? null,
      blocks: updatedBlocks,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error updating CFP content:', err);
    res.status(500).json({ message: 'Failed to update CFP content', error: err.message });
  }
};
