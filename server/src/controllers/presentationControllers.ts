import { Request, Response } from "express";
import { getUserId, isAdmin } from "../utils/authHelper";
import prisma from '../lib/prisma';

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
        }
      }
    });

    if (!existingPresentation) {
      res.status(404).json({ message: "Presentation not found" });
      return;
    }

    // For non-admin users, verify they are the conference creator
    if (!isAdmin(req) && existingPresentation.section.conference.createdById !== userId) {
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

    // Update order for each presentation
    await Promise.all(
      presentations.map((p: any) =>
        prisma.presentation.update({
          where: { 
            id: p.id,
            sectionId: Number(sessionId)
          },
          data: { order: p.order }
        })
      )
    );

    res.json({ message: "Presentations reordered successfully" });
  } catch (error: any) {
    console.error("Error reordering presentations:", error);
    res.status(500).json({ message: "Failed to reorder presentations" });
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
          // Role filter - only attendees and organizers
          {
            role: {
              in: ['attendee', 'organizer']
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
        { role: 'asc' }, // Show organizers first, then attendees
        { name: 'asc' }  // Then alphabetically by name
      ]
    });

    res.json(users);
  } catch (error: any) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Failed to search users', error: error.message });
  }
};