import { Request, Response } from "express";
import { getUserId, isAdmin } from "../utils/authHelper";
import prisma from '../lib/prisma';
import { Prisma } from "@prisma/client";

// Get presentations for a session
export const getSessionPresentations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    
    // First fetch the section to check permissions
    const existingSection = await prisma.section.findUnique({
      where: { id: Number(sessionId) },
      include: {
        conference: {
          select: {
            createdById: true
          }
        }
      }
    });
    
    if (!existingSection) {
      res.status(404).json({ message: "Section not found" });
      return;
    }

    // For non-admin users, verify they are the conference creator
    if (!isAdmin(req) && existingSection.conference.createdById !== getUserId(req)) {
      res.status(403).json({ message: "Not authorized to view presentations for this section" });
      return;
    }
    
    const presentations = await prisma.presentation.findMany({
      where: { 
        sectionId: Number(sessionId) 
      },
      include: {
        // Use PresentationAuthor instead of authorAssignments
        authors: {
          include: {
            internalUser: {
              select: {
                id: true,
                name: true,
                email: true,
                organization: true
              }
            }
          },
          orderBy: { order: 'asc' }
        },
        materials: {
          select: {
            id: true,
            title: true,        // Use correct field names from schema
            fileType: true,
            uploadedAt: true
          }
        },
        _count: {
          select: {
            materials: true
          }
        }
      },
      orderBy: { order: 'asc' }
    });

    // Transform the data to match the frontend interface
    const transformedPresentations = presentations.map((p: any) => ({
      id: p.id,
      title: p.title,
      abstract: p.abstract,
      keywords: p.keywords,
      duration: p.duration,
      order: p.order,
      status: p.status,
      createdAt: p.createdAt,
      // Map from PresentationAuthor to the expected format
      authors: p.authors?.map((author: any) => ({
        id: author.userId || author.id, // Use userId for internal, id for external
        name: author.authorName,
        email: author.authorEmail,
        affiliation: author.affiliation || author.internalUser?.organization || '',
        isPresenter: author.isPresenter,
        isInternal: !author.isExternal // Convert isExternal to isInternal
      })) || [],
      materials: p.materials?.map((m: any) => ({
        id: m.id,
        name: m.title,      // Map 'title' to 'name' for frontend
        type: m.fileType,   // Map 'fileType' to 'type' for frontend
        uploadedAt: m.uploadedAt
      })) || []
    }));

    res.json(transformedPresentations);
  } catch (error: any) {
    console.error("Error fetching presentations:", error);
    res.status(500).json({ message: "Failed to fetch presentations" });
  }
};

// Create new presentation
export const createPresentation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, abstract, duration, keywords, sectionId } = req.body;
    const organizerId = getUserId(req);

    if (!organizerId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Verify section exists and user has permission
    const section = await prisma.section.findUnique({
      where: { id: Number(sectionId) },
      include: {
        conference: {
          select: {
            createdById: true
          }
        }
      }
    });

    if (!section) {
      res.status(404).json({ message: "Section not found" });
      return;
    }

    // For non-admin users, verify they are the conference creator
    if (!isAdmin(req) && section.conference.createdById !== organizerId) {
      res.status(403).json({ message: "Not authorized to create presentations for this section" });
      return;
    }

    // Get the highest order number for this session
    const lastPresentation = await prisma.presentation.findFirst({
      where: { sectionId: Number(sectionId) },
      orderBy: { order: 'desc' }
    });

    const presentation = await prisma.presentation.create({
      data: {
        title,
        abstract,
        duration: Number(duration),
        keywords: keywords || [],
        affiliations: [], // Add required affiliations field
        sectionId: Number(sectionId),
        order: (lastPresentation?.order || 0) + 1,
        status: 'draft',
        submissionType: 'internal'
      },
      include: {
        // Use 'authors' instead of 'authorAssignments' for new presentations
        authors: {
          include: {
            internalUser: {
              select: {
                id: true,
                name: true,
                email: true,
                organization: true
              }
            }
          },
          orderBy: { order: 'asc' }
        },
        materials: {
          select: {
            id: true,
            title: true,        // Use correct field names
            fileType: true,
            uploadedAt: true
          }
        }
      }
    });

    res.status(201).json(presentation);
  } catch (error: any) {
    console.error("Error creating presentation:", error);
    res.status(500).json({ message: "Failed to create presentation" });
  }
};

// Update presentation
export const updatePresentation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, abstract, duration, keywords } = req.body;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Verify presentation exists and user has permission
    const existingPresentation = await prisma.presentation.findUnique({
      where: { id: Number(id) },
      include: {
        section: {
          include: {
            conference: {
              select: {
                createdById: true
              }
            }
          }
        },
        submission: {
          select: {
            authorId: true
          }
        }
      }
    });

    if (!existingPresentation) {
      res.status(404).json({ message: "Presentation not found" });
      return;
    }

    const isOrganizer = isAdmin(req) || existingPresentation.section.conference.createdById === userId;
    const isAuthor = existingPresentation.submission?.authorId === userId;

    // Phase 1.2: Block author edits when presentation is scheduled or locked
    if (isAuthor && !isOrganizer) {
      if (existingPresentation.status === 'scheduled' || existingPresentation.lockedById) {
        res.status(403).json({ 
          message: 'This presentation is locked and cannot be edited. Contact the organizer if changes are needed.', 
          locked: true,
          lockedBy: existingPresentation.lockedById,
          status: existingPresentation.status
        });
        return;
      }
    }

    // For non-admin/non-organizer users, deny access
    if (!isOrganizer && !isAuthor) {
      res.status(403).json({ message: "Not authorized to update this presentation" });
      return;
    }

    const presentation = await prisma.presentation.update({
      where: { id: Number(id) },
      data: {
        title,
        abstract,
        duration: Number(duration),
        keywords: keywords || []
      },
      include: {
        // Use 'authors' instead of 'authorAssignments'
        authors: {
          include: {
            internalUser: {
              select: {
                id: true,
                name: true,
                email: true,
                organization: true
              }
            }
          },
          orderBy: { order: 'asc' }
        },
        materials: {
          select: {
            id: true,
            title: true,        // Use correct field names
            fileType: true,
            uploadedAt: true
          }
        }
      }
    });

    res.json(presentation);
  } catch (error: any) {
    console.error("Error updating presentation:", error);
    res.status(500).json({ message: "Failed to update presentation" });
  }
};

// Delete presentation
export const deletePresentation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Verify presentation exists and user has permission
    const existingPresentation = await prisma.presentation.findUnique({
      where: { id: Number(id) },
      include: {
        section: {
          include: {
            conference: {
              select: {
                createdById: true
              }
            }
          }
        }
      }
    });

    if (!existingPresentation) {
      res.status(404).json({ message: "Presentation not found" });
      return;
    }

    // For non-admin users, verify they are the conference creator
    if (!isAdmin(req) && existingPresentation.section.conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to delete this presentation" });
      return;
    }

    await prisma.presentation.delete({
      where: { id: Number(id) }
    });

    res.json({ message: "Presentation deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting presentation:", error);
    res.status(500).json({ message: "Failed to delete presentation" });
  }
};

// Reorder presentations
export const reorderPresentations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { presentations } = req.body;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Verify section exists and user has permission
    const section = await prisma.section.findUnique({
      where: { id: Number(sessionId) },
      include: {
        conference: {
          select: {
            createdById: true
          }
        }
      }
    });

    if (!section) {
      res.status(404).json({ message: "Section not found" });
      return;
    }

    // For non-admin users, verify they are the conference creator
    if (!isAdmin(req) && section.conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to reorder presentations for this section" });
      return;
    }

    // Validate payload continuous ordering starting at 1 (or 0) without gaps
    const orders = presentations.map((p: any) => p.order).sort((a: number,b: number) => a-b);
    const min = orders[0];
    for (let i=0;i<orders.length;i++) {
      if (orders[i] !== min + i) {
        res.status(400).json({ message: "Non-continuous ordering detected" });
        return;
      }
    }

    // Prevent reordering if any selected presentation is locked
    const ids = presentations.map((p: any) => p.id);
    const existing = await prisma.presentation.findMany({ where: { id: { in: ids }, sectionId: Number(sessionId) }, select: { id: true, status: true } });
    const locked = existing.filter(p => p.status === 'locked');
    if (locked.length) {
      res.status(400).json({ message: 'One or more presentations are locked', lockedIds: locked.map(l => l.id) });
      return;
    }

    // Two-phase transactional update to avoid unique (sectionId, order) collisions during reordering
    // Phase 1: move all targeted presentations to temporary high order values
    const maxExisting = await prisma.presentation.aggregate({ where: { sectionId: Number(sessionId) }, _max: { order: true } });
    const base = (maxExisting._max.order || 0) + 1000; // large gap
    await prisma.$transaction(
      presentations.map((p: any, idx: number) => prisma.presentation.update({
        where: { id: p.id },
        data: { order: base + idx }
      }))
    );
    // Phase 2: apply final intended orders
    await prisma.$transaction(
      presentations.map((p: any) => prisma.presentation.update({
        where: { id: p.id },
        data: { order: p.order }
      }))
    );

    res.json({ message: "Presentations reordered successfully" });
  } catch (error: any) {
    console.error("Error reordering presentations:", error);
    res.status(500).json({ message: "Failed to reorder presentations" });
  }
};

// POST /api/presentations/:id/assign-section - move presentation to another section with conflict checks
export const assignPresentationToSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // presentation id
    const { targetSectionId, targetOrder } = req.body as { targetSectionId: number; targetOrder?: number };
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ message: "User not authenticated" }); return; }

    const presentation = await prisma.presentation.findUnique({
      where: { id: Number(id) },
      include: {
        section: { include: { conference: { select: { createdById: true } } } },
        authors: { include: { internalUser: true } }
      }
    });
    if (!presentation) { res.status(404).json({ message: "Presentation not found" }); return; }
    if (!isAdmin(req) && presentation.section.conference.createdById !== userId) { res.status(403).json({ message: "Not authorized" }); return; }
    if (presentation.status === 'locked') { res.status(400).json({ message: 'Presentation is locked' }); return; }

    const targetSection = await prisma.section.findUnique({
      where: { id: Number(targetSectionId) },
      include: { conference: { select: { createdById: true } } }
    });
    if (!targetSection) { res.status(404).json({ message: 'Target section not found' }); return; }
    if (presentation.section.conferenceId !== targetSection.conferenceId) { res.status(400).json({ message: 'Cross-conference move not allowed' }); return; }

    // Author conflict check: any presenter authors double-booked in overlapping time ranges
    const presenterAuthorIds = presentation.authors.filter(a => a.isPresenter && a.userId).map(a => a.userId as number);
    if (presenterAuthorIds.length) {
      // Fetch presentations in target section time window for those authors
      const conflicts = await prisma.presentation.findMany({
        where: {
          sectionId: Number(targetSectionId),
          authors: { some: { isPresenter: true, userId: { in: presenterAuthorIds } } },
          id: { not: presentation.id }
        },
        select: { id: true, title: true }
      });
      if (conflicts.length) {
        res.status(409).json({ message: 'Presenter conflict detected', conflicts });
        return;
      }
    }

    // Determine order: place at end if not provided
    let newOrder = targetOrder;
    if (typeof newOrder !== 'number') {
      const last = await prisma.presentation.findFirst({ where: { sectionId: Number(targetSectionId) }, orderBy: { order: 'desc' } });
      newOrder = (last?.order || 0) + 1;
    }

    // Transaction: shift orders if inserting into middle
    await prisma.$transaction(async (tx) => {
      if (targetOrder !== undefined) {
        await tx.presentation.updateMany({
          where: { sectionId: Number(targetSectionId), order: { gte: targetOrder } },
          data: { order: { increment: 1 } }
        });
      }

      // Enforce "after acceptance" full-text requirement only when actually scheduling into the program.
      const isSchedulingIntoProgram = targetSection.dayId != null;
      const linkedSubmission = await tx.submission.findFirst({
        where: { presentationId: presentation.id },
        select: { id: true, status: true, isLocked: true, fullTextFileUrl: true, conferenceId: true },
      });
      if (isSchedulingIntoProgram && linkedSubmission && linkedSubmission.status === 'accepted') {
        const requirements = await tx.submissionRequirement.findUnique({
          where: { conferenceId: linkedSubmission.conferenceId },
          select: { collectFullText: true, fullTextTiming: true },
        });
        if (requirements?.collectFullText && requirements.fullTextTiming === 'afterAcceptance') {
          if (!linkedSubmission.fullTextFileUrl) {
            throw new Error('Full text file is required before scheduling this presentation');
          }
        }
      }

      await tx.presentation.update({
        where: { id: presentation.id },
        data: { sectionId: Number(targetSectionId), order: newOrder }
      });
      
      // Lock the linked submission when it is scheduled into the program
      if (isSchedulingIntoProgram && linkedSubmission && !linkedSubmission.isLocked) {
        await tx.submission.update({
          where: { id: linkedSubmission.id },
          data: {
            isLocked: true,
            lockedAt: new Date(),
            lockedReason: 'Locked when scheduled to program'
          }
        });
      }
    });

    res.json({ message: 'Presentation assigned', presentationId: presentation.id, sectionId: targetSectionId, order: newOrder });
  } catch (error: unknown) {
    console.error('Error assigning presentation to section:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ message: 'Order conflict' });
      return;
    }
    if (error instanceof Error && error.message === 'Full text file is required before scheduling this presentation') {
      res.status(400).json({ message: error.message });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to assign presentation';
    res.status(500).json({ message: 'Failed to assign presentation', error: message });
  }
};

// POST /api/presentations/:id/authors - Assign authors to presentation (SIMPLIFIED)
export const assignAuthorsToPresentation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { authors } = req.body;
    const userId = getUserId(req);

    console.log('Assigning authors to presentation:', id); // Debug log
    console.log('Authors data:', authors); // Debug log

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Verify presentation exists and get conference info
    const presentation = await prisma.presentation.findUnique({
      where: { id: Number(id) },
      include: {
        section: {
          include: {
            conference: true  // Direct conference relation
          }
        }
      }
    });

    if (!presentation) {
      res.status(404).json({ message: "Presentation not found" });
      return;
    }

    // Check permissions using direct conference relation
    if (!isAdmin(req) && presentation.section.conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to assign authors to this presentation" });
      return;
    }

    // Delete existing presentation authors
    await prisma.presentationAuthor.deleteMany({
      where: { presentationId: Number(id) }
    });

    console.log('Deleted existing authors for presentation:', id); // Debug log

    // Create new presentation authors
    const createdAuthors = await Promise.all(
      authors.map(async (author: any, index: number) => {
        console.log('Creating author:', author); // Debug log
        
        return prisma.presentationAuthor.create({
          data: {
            presentationId: Number(id),
            authorName: author.authorName,
            authorEmail: author.authorEmail,
            affiliation: author.affiliation || '',
            isPresenter: author.isPresenter,
            isExternal: author.isExternal,
            userId: author.isExternal ? null : author.internalUserId,
            order: index + 1
          }
        });
      })
    );

    console.log('Created authors:', createdAuthors); // Debug log

    res.json({ message: 'Authors assigned successfully', authors: createdAuthors });
  } catch (error: any) {
    console.error('Error assigning authors:', error);
    res.status(500).json({ message: 'Failed to assign authors', error: error.message });
  }
};

// GET /api/users/search - Search internal users for author assignment
export const searchUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      res.json([]);
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          // Search filter
          {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } }
            ]
          },
          // Role filter - only base users and organizers
          {
            role: {
              in: ['user', 'organizer']
            }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        organization: true
      },
      take: 20,
      orderBy: [
        { role: 'asc' }, // Show organizers first, then users
        { name: 'asc' }  // Then alphabetically by name
      ]
    });

    res.json(users);
  } catch (error: any) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Failed to search users', error: error.message });
  }
};