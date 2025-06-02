import { Request, Response } from "express";
import prisma from '../lib/prisma';
import { getUserId, isAdmin } from "../utils/authHelper";

// GET /sections/conference/:conferenceId - List sections by conference
export const getSectionsByConference = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conferenceId } = req.params;
    
    // Verify the conference exists
    const conference = await prisma.conference.findUnique({
      where: { id: Number(conferenceId) },
      select: { 
        id: true,
        createdById: true 
      }
    });
    
    if (!conference) {
       res.status(404).json({ message: "Conference not found" });
       return;
    }
    
    // No need to convert - req.user.id is now a number from authMiddleware
    // For non-admin users, verify they are the conference creator
    if (!isAdmin(req) && conference.createdById !== getUserId(req)) {
        res.status(403).json({ 
            message: "Not authorized to view sections for this conference", 
            details: `User ID ${getUserId(req)} does not match creator ID ${conference.createdById}`
       });
       return;
    }
    
    const sections = await prisma.section.findMany({
      where: { conferenceId: Number(conferenceId) },
      orderBy: [
        { startTime: 'asc' },
        { name: 'asc' }
      ],
      include: {
        _count: {
          select: {
            presentations: true,
            attendees: true
          }
        }
      }
    });
    
    res.json(sections);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// POST /sections - Create section
export const createSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      name, 
      startTime, 
      endTime, 
      conferenceId, 
      room, 
      capacity, 
      description, 
      type 
    } = req.body;
    
    // No need for user lookup - authMiddleware sets req.user with the numeric ID

    // Verify the conference exists
    const conference = await prisma.conference.findUnique({
      where: { id: Number(conferenceId) },
      select: { 
        id: true,
        createdById: true 
      }
    });
    
    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }
    
    console.log(`Authorization check: User ID ${getUserId(req)} vs Creator ID ${conference.createdById}`);
    
    // For non-admin users, verify they are the conference creator
    if (!isAdmin(req) && conference.createdById !== getUserId(req)) {
      console.log(`Authorization failed: User ID ${getUserId(req)} != Creator ID ${conference.createdById}`);
      res.status(403).json({ 
        message: "Not authorized to create sections for this conference"
      });
      return;
    }
    
    const section = await prisma.section.create({
      data: {
        name,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        conferenceId: Number(conferenceId),
        room,
        capacity: capacity ? Number(capacity) : null,
        description,
        type
      }
    });
    
    res.status(201).json(section);
  } catch (error: any) {
    console.error("Error creating section:", error);
    res.status(500).json({ message: error.message });
  }
};

// GET /sections/:id - Get section details
export const getSectionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const section = await prisma.section.findUnique({
      where: { id: Number(id) },
      include: {
        conference: {
          select: {
            id: true,
            name: true,
            createdById: true
          }
        },
        _count: {
          select: {
            presentations: true,
            attendees: true
          }
        }
      }
    });
    
    if (!section) {
       res.status(404).json({ message: "Section not found" });
       return;
    }
    
    // For non-admin users, verify they are the conference creator
    if (!isAdmin(req) && section.conference.createdById !== getUserId(req)) {
       res.status(403).json({ message: "Not authorized to view this section" });
       return;
    }
    
    res.json(section);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /sections/:id - Update section
export const updateSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      name, 
      startTime, 
      endTime, 
      room, 
      capacity, 
      description, 
      type 
    } = req.body;
    
    // First fetch the section to check permissions
    const existingSection = await prisma.section.findUnique({
      where: { id: Number(id) },
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
       res.status(403).json({ message: "Not authorized to update this section" });
       return;
    }
    
    const section = await prisma.section.update({
      where: { id: Number(id) },
      data: {
        name,
        startTime: startTime ? new Date(startTime) : existingSection.startTime,
        endTime: endTime ? new Date(endTime) : existingSection.endTime,
        room,
        capacity: capacity ? Number(capacity) : existingSection.capacity,
        description,
        type
      }
    });
    
    res.json(section);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /sections/:id - Delete section
export const deleteSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // First fetch the section to check permissions
    const existingSection = await prisma.section.findUnique({
      where: { id: Number(id) },
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
        res.status(403).json({ message: "Not authorized to delete this section" });
        return;
    }
    
    // Delete the section
    await prisma.section.delete({
      where: { id: Number(id) }
    });
    
    res.json({ message: "Section deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// GET /sections/:id/presentations - Get presentations in section
export const getSectionPresentations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // First fetch the section to check permissions
    const existingSection = await prisma.section.findUnique({
      where: { id: Number(id) },
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
      where: { sectionId: Number(id) },
      include: {
        authorAssignments: {
          include: {
            internalAuthor: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
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
            materials: true,
            feedback: true
          }
        }
      },
      orderBy: {
        order: 'asc'
      }
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
      authors: p.authorAssignments?.map((aa: any) => ({
        id: aa.internalAuthor?.id || 0,
        name: aa.internalAuthor?.name || aa.externalAuthorName || 'Unknown',
        email: aa.internalAuthor?.email || aa.externalAuthorEmail || '',
        affiliation: aa.externalAuthorAffiliation || '',
        isPresenter: aa.isPresenter
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
    console.error("Error fetching section presentations:", error);
    res.status(500).json({ message: error.message });
  }
};

// POST /sections/:id/presentations/reorder - Reorder presentations in section
export const reorderSectionPresentations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { presentations } = req.body;

    // First fetch the section to check permissions
    const existingSection = await prisma.section.findUnique({
      where: { id: Number(id) },
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
       res.status(403).json({ message: "Not authorized to reorder presentations for this section" });
       return;
    }

    // Update order for each presentation
    await Promise.all(
      presentations.map((p: any) =>
        prisma.presentation.update({
          where: { 
            id: p.id,
            sectionId: Number(id)
          },
          data: { order: p.order }
        })
      )
    );

    res.json({ message: "Presentations reordered successfully" });
  } catch (error: any) {
    console.error("Error reordering section presentations:", error);
    res.status(500).json({ message: "Failed to reorder presentations" });
  }
};

// GET /sections/:id/summary - Get section summary with counts
export const getSectionSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // First fetch the section to check permissions
    const existingSection = await prisma.section.findUnique({
      where: { id: Number(id) },
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
       res.status(403).json({ message: "Not authorized to view this section summary" });
       return;
    }

    // Get comprehensive section data
    const section = await prisma.section.findUnique({
      where: { id: Number(id) },
      include: {
        conference: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        presentations: {
          include: {
            authorAssignments: true,
            materials: true
          }
        },
        _count: {
          select: {
            presentations: true,
            attendees: true
          }
        }
      }
    });

    // Calculate summary statistics - Use correct enum values
    const summary = {
      section: {
        id: section?.id,
        name: section?.name,
        type: section?.type,
        startTime: section?.startTime,
        endTime: section?.endTime,
        room: section?.room,
        capacity: section?.capacity,
        description: section?.description
      },
      conference: section?.conference,
      stats: {
        totalPresentations: section?._count.presentations || 0,
        totalAttendees: section?._count.attendees || 0,
        presentationsByStatus: {
          draft: section?.presentations.filter(p => p.status === 'draft').length || 0,
          submitted: section?.presentations.filter(p => p.status === 'submitted').length || 0,
          scheduled: section?.presentations.filter(p => p.status === 'scheduled').length || 0,
          locked: section?.presentations.filter(p => p.status === 'locked').length || 0
        },
        totalDuration: section?.presentations.reduce((sum, p) => sum + (p.duration || 0), 0) || 0,
        totalMaterials: section?.presentations.reduce((sum, p) => sum + p.materials.length, 0) || 0,
        totalAuthors: section?.presentations.reduce((sum, p) => sum + p.authorAssignments.length, 0) || 0
      }
    };
    
    res.json(summary);
  } catch (error: any) {
    console.error("Error fetching section summary:", error);
    res.status(500).json({ message: error.message });
  }
};

// PUT /sections/:id/status - Update section status
export const updateSectionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // First fetch the section to check permissions
    const existingSection = await prisma.section.findUnique({
      where: { id: Number(id) },
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
       res.status(403).json({ message: "Not authorized to update this section status" });
       return;
    }

    // Just return the section as-is since there's no status field to update
    const section = await prisma.section.findUnique({
      where: { id: Number(id) }
    });

    res.json(section);
  } catch (error: any) {
    console.error("Error updating section status:", error);
    res.status(500).json({ message: "Failed to update section status" });
  }
};

// GET /sections/:id/attendance - Get section attendance
export const getSectionAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // First fetch the section to check permissions
    const existingSection = await prisma.section.findUnique({
      where: { id: Number(id) },
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
       res.status(403).json({ message: "Not authorized to view attendance for this section" });
       return;
    }

    // Get attendance data - use correct field name
    const attendance = await prisma.sessionAttendance.findMany({
      where: { sectionId: Number(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc' // Use 'createdAt' instead of 'attendedAt'
      }
    });

    res.json(attendance);
  } catch (error: any) {
    console.error("Error fetching section attendance:", error);
    res.status(500).json({ message: "Failed to fetch section attendance" });
  }
};

// ... keep all other existing functions ...