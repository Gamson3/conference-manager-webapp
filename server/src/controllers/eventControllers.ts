import { Request, Response } from "express";
import prisma from '../lib/prisma';
import { getUserId, isAdmin } from "../utils/authHelper";




// CREATE
export const createEvent = async (req: Request, res: Response) => {
  try {
    const {
      name, description, startDate, endDate, location, createdById,
      capacity, registrationDeadline, isPublic, timezone, registrationFee,
      websiteUrl, venue, venueAddress, organizerNotes, bannerImageUrl, topics
    } = req.body;

    const event = await prisma.conference.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        createdById,
        // New fields
        capacity: capacity ? Number(capacity) : null,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        isPublic: isPublic !== undefined ? isPublic : true,
        timezone,
        // registrationFee: registrationFee ? parseFloat(registrationFee) : null,
        websiteUrl,
        venue,
        venueAddress,
        organizerNotes,
        bannerImageUrl,
        topics: topics || [],
        status: 'draft'
      },
    });

    res.status(201).json(event);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


// READ (getEventsByOrganizer)
export const getEventsByOrganizer = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const isUserAdmin = isAdmin(req);
    
    // Admins can see all events by default, but can filter by organizer if needed
    const organizerId = req.query.organizerId ? 
      Number(req.query.organizerId) : 
      (isUserAdmin ? undefined : userId);
    
    // Ensure organizerId is converted to a number for Prisma
    const where = organizerId ? { createdById: Number(organizerId) } : {};
    
    const events = await prisma.conference.findMany({
      where,
      orderBy: { startDate: "desc" },
      include: {
        _count: {
          select: {
            sections: true,
            attendances: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// GET /events/:id - Get single event by ID
export const getEventById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await prisma.conference.findUnique({
      where: { id: Number(id) },
    });
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }
    res.json(event);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


// UPDATE
export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name, description, startDate, endDate, location
    } = req.body;

    const event = await prisma.conference.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
      },
    });

    res.json(event);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Updater Function for existing drafts
export const updateEventDraft = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, startDate, endDate, location, topics } = req.body;
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    // Verify ownership
    const existingEvent = await prisma.conference.findFirst({
      where: {
        id: Number(id),
        createdById: Number(userId),
      },
    });
    
    if (!existingEvent) {
      return res.status(404).json({ message: "Event not found or not authorized" });
    }
    
    const updatedDraft = await prisma.conference.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        topics: topics || [],
        status: 'draft',
      },
    });
    
    res.json(updatedDraft);
  } catch (error) {
    console.error("Error updating draft:", error);
    res.status(500).json({ message: "Failed to update draft" });
  }
};

// DELETE
export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.conference.delete({
      where: { id: Number(id) },
    });
    res.json({ message: "Event deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Save Events As Drafts
export const saveEventDraft = async (req: Request, res: Response) => {
  try {
    const { name, description, startDate, endDate, location, topics } = req.body;
    const organizerId = getUserId(req);
    
    if (!organizerId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }
    
    const draft = await prisma.conference.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        topics: topics || [],
        createdById: Number(organizerId),
        status: 'draft', // Important: set status to draft
      },
    });
    
    res.status(201).json(draft);
  } catch (error) {
    console.error("Error creating draft:", error);
    res.status(500).json({ message: "Failed to create draft" });
  }
};

// Get all conferences
export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const events = await prisma.conference.findMany({
      orderBy: { startDate: "desc" },
      include: {
        _count: {
          select: {
            sections: true,
            attendances: true,
          }
        }
      }
    });
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Update conference status
export const updateEventStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status is a valid enum value
    if (!['DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELED'].includes(status)) {
      res.status(400).json({ message: "Invalid status value" });
      return;
    }

    const event = await prisma.conference.update({
      where: { id: Number(id) },
      data: { status },
    });

    res.json(event);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get conference materials
export const getEventMaterials = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const materials = await prisma.conferenceMaterial.findMany({
      where: { conferenceId: Number(id) },
      orderBy: { uploadedAt: "desc" },
    });
    res.json(materials);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get conference attendees
export const getEventAttendees = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const attendees = await prisma.attendance.findMany({
      where: { conferenceId: Number(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      },
    });
    res.json(attendees);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get conference feedback
export const getEventFeedback = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const feedback = await prisma.conferenceFeedback.findMany({
      where: { conferenceId: Number(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: { submittedAt: "desc" },
    });
    res.json(feedback);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get abstract submissions for conference
export const getEventAbstracts = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const abstracts = await prisma.abstractSubmission.findMany({
      where: { conferenceId: Number(id) },
      include: {
        submitter: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        reviews: true, // Using the correct relation name from the Prisma schema
      },
      orderBy: { submissionDate: "desc" },
    });
    res.json(abstracts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Publish conference
export const publishEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // First, verify conference is ready to publish
    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
    });
    
    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }
    
    // Optional: add validation checks here
    // (e.g., required fields, dates, etc.)
    
    const publishedEvent = await prisma.conference.update({
      where: { id: Number(id) },
      data: { 
        status: "published",
        isPublic: true
      },
    });
    
    res.json({
      message: "Conference published successfully",
      conference: publishedEvent
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};