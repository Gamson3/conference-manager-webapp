import { Request, Response } from "express";
import prisma from '../lib/prisma';
import { getUserId, isAdmin } from "../utils/authHelper";


// GET /sections/conference/:conferenceId - List sections by conference
export const getSectionsByConference = async (req: Request, res: Response) => {
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
export const createSection = async (req: Request, res: Response) => {
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
export const getSectionById = async (req: Request, res: Response) => {
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
export const updateSection = async (req: Request, res: Response) => {
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
export const deleteSection = async (req: Request, res: Response) => {
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
export const getSectionPresentations = async (req: Request, res: Response) => {
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
        _count: {
          select: {
            materials: true,
            feedback: true
          }
        }
      },
      orderBy: {
        title: 'asc'
      }
    });
    
    res.json(presentations);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// GET /sections/:id/attendance - Get section attendance
export const getSectionAttendance = async (req: Request, res: Response) => {
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
    
    const attendance = await prisma.sessionAttendance.findMany({
      where: { sectionId: Number(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        checkinTime: 'desc'
      }
    });
    
    // Calculate statistics
    const stats = {
      total: attendance.length,
      checkedIn: attendance.filter(a => a.checkedIn).length,
      checkedInPercentage: attendance.length > 0 
        ? Math.round((attendance.filter(a => a.checkedIn).length / attendance.length) * 100) 
        : 0
    };
    
    res.json({
      stats,
      attendance
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};