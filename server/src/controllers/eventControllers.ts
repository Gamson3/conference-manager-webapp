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
      res.status(401).json({ message: "User not authenticated" });
      return;
    }
    
    // Verify ownership
    const existingEvent = await prisma.conference.findFirst({
      where: {
        id: Number(id),
        createdById: Number(userId),
      },
    });
    
    if (!existingEvent) {
      res.status(404).json({ message: "Event not found or not authorized" });
      return;
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

// Update the deleteEvent function - replace step 3:

// DELETE
export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // First, verify the conference exists and user has permission
    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        name: true,
        createdById: true
      }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    // Check permissions - only conference creator or admin can delete
    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to delete this conference" });
      return;
    }

    // Perform cascading delete in a transaction
    await prisma.$transaction(async (tx) => {
      console.log(`[DELETE] Starting cascading delete for conference ${id}`);

      // 1. Delete presentation materials first
      await tx.presentationMaterial.deleteMany({
        where: {
          presentation: {
            section: {
              conferenceId: Number(id)
            }
          }
        }
      });
      console.log(`[DELETE] Deleted presentation materials for conference ${id}`);

      // 2. Delete presentation authors
      await tx.presentationAuthor.deleteMany({
        where: {
          presentation: {
            section: {
              conferenceId: Number(id)
            }
          }
        }
      });
      console.log(`[DELETE] Deleted presentation authors for conference ${id}`);

      // 3. Delete presentation favorites
      await tx.presentationFavorite.deleteMany({
        where: {
          presentation: {
            section: {
              conferenceId: Number(id)
            }
          }
        }
      });
      console.log(`[DELETE] Deleted presentation favorites for conference ${id}`);

      // 4. Delete presentation feedback
      await tx.presentationFeedback.deleteMany({
        where: {
          presentation: {
            section: {
              conferenceId: Number(id)
            }
          }
        }
      });
      console.log(`[DELETE] Deleted presentation feedback for conference ${id}`);

      // 5. Delete author assignments
      await tx.authorAssignment.deleteMany({
        where: {
          presentation: {
            section: {
              conferenceId: Number(id)
            }
          }
        }
      });
      console.log(`[DELETE] Deleted author assignments for conference ${id}`);

      // 6. Delete session attendance
      await tx.sessionAttendance.deleteMany({
        where: {
          section: {
            conferenceId: Number(id)
          }
        }
      });
      console.log(`[DELETE] Deleted session attendance for conference ${id}`);

      // 7. Delete presentations
      await tx.presentation.deleteMany({
        where: {
          section: {
            conferenceId: Number(id)
          }
        }
      });
      console.log(`[DELETE] Deleted presentations for conference ${id}`);

      // 8. Delete sections
      await tx.section.deleteMany({
        where: {
          conferenceId: Number(id)
        }
      });
      console.log(`[DELETE] Deleted sections for conference ${id}`);

      // 9. Delete days
      await tx.day.deleteMany({
        where: {
          conferenceId: Number(id)
        }
      });
      console.log(`[DELETE] Deleted days for conference ${id}`);

      // 10. Delete conference attendances
      await tx.attendance.deleteMany({
        where: {
          conferenceId: Number(id)
        }
      });
      console.log(`[DELETE] Deleted attendances for conference ${id}`);

      // 11. Delete conference favorites
      await tx.conferenceFavorite.deleteMany({
        where: {
          conferenceId: Number(id)
        }
      });
      console.log(`[DELETE] Deleted conference favorites for conference ${id}`);

      // 12. Delete conference feedback
      await tx.conferenceFeedback.deleteMany({
        where: {
          conferenceId: Number(id)
        }
      });
      console.log(`[DELETE] Deleted conference feedback for conference ${id}`);

      // 13. Delete conference materials
      await tx.conferenceMaterial.deleteMany({
        where: {
          conferenceId: Number(id)
        }
      });
      console.log(`[DELETE] Deleted conference materials for conference ${id}`);

      // 14. Delete abstract submissions and reviews
      await tx.abstractReview.deleteMany({
        where: {
          abstract: {
            conferenceId: Number(id)
          }
        }
      });
      console.log(`[DELETE] Deleted abstract reviews for conference ${id}`);

      await tx.abstractSubmission.deleteMany({
        where: {
          conferenceId: Number(id)
        }
      });
      console.log(`[DELETE] Deleted abstract submissions for conference ${id}`);

      // 15. Finally, delete the conference itself
      await tx.conference.delete({
        where: { id: Number(id) }
      });
      console.log(`[DELETE] Deleted conference ${id}`);
    });

    res.json({ 
      message: "Conference and all related data deleted successfully",
      conferenceName: conference.name 
    });

  } catch (error: any) {
    console.error("Error deleting conference:", error);
    res.status(500).json({ 
      message: "Failed to delete conference", 
      error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
    });
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
    if (!['draft', 'published', 'completed', 'canceled'].includes(status)) {
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

// Validate if conference is ready to publish
export const validateConferenceForPublishing = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      include: {
        days: {
          include: {
            sections: {
              include: {
                presentations: {
                  include: {
                    authors: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    // Check permissions
    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to publish this conference" });
      return;
    }

    // Validation checks
    const issues = [];
    
    // Check basic conference info
    if (!conference.name || !conference.description) {
      issues.push("Conference must have a name and description");
    }
    
    if (!conference.startDate || !conference.endDate) {
      issues.push("Conference must have start and end dates");
    }
    
    if (!conference.location) {
      issues.push("Conference must have a location");
    }

    // Check if conference has content
    if (!conference.days || conference.days.length === 0) {
      issues.push("Conference must have at least one day");
    } else {
      const totalSections = conference.days.reduce((sum, day) => sum + day.sections.length, 0);
      if (totalSections === 0) {
        issues.push("Conference must have at least one session");
      }
      
      const totalPresentations = conference.days.reduce((sum, day) => 
        sum + day.sections.reduce((secSum, section) => secSum + section.presentations.length, 0), 0
      );
      
      if (totalPresentations === 0) {
        issues.push("Conference must have at least one presentation");
      }

      // Check for presentations without authors
      const presentationsWithoutAuthors: string[] = [];
      conference.days.forEach(day => {
        day.sections.forEach(section => {
          section.presentations.forEach(presentation => {
            if (!presentation.authors || presentation.authors.length === 0) {
              presentationsWithoutAuthors.push(presentation.title);
            }
          });
        });
      });

      if (presentationsWithoutAuthors.length > 0) {
        issues.push(`These presentations need authors: ${presentationsWithoutAuthors.join(', ')}`);
      }
    }

    const isReady = issues.length === 0;

    res.json({
      isReady,
      issues,
      conference: {
        id: conference.id,
        name: conference.name,
        status: conference.status,
        dayCount: conference.days.length,
        sectionCount: conference.days.reduce((sum, day) => sum + day.sections.length, 0),
        presentationCount: conference.days.reduce((sum, day) => 
          sum + day.sections.reduce((secSum, section) => secSum + section.presentations.length, 0), 0
        )
      }
    });
  } catch (error: any) {
    console.error("Error validating conference:", error);
    res.status(500).json({ message: "Failed to validate conference" });
  }
};

// Publish conference
export const publishConference = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      include: {
        days: {
          include: {
            sections: {
              include: {
                presentations: {
                  include: {
                    authors: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    // Check permissions
    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to publish this conference" });
      return;
    }

    // Validate before publishing
    const issues = [];
    
    if (!conference.days || conference.days.length === 0) {
      issues.push("Conference must have at least one day");
    }
    
    if (issues.length > 0) {
      res.status(400).json({ 
        message: "Conference cannot be published", 
        issues 
      });
      return;
    }

    // Update conference status
    const publishedConference = await prisma.conference.update({
      where: { id: Number(id) },
      data: { 
        status: 'published',
        updatedAt: new Date()
      }
    });

    res.json({ 
      message: "Conference published successfully",
      conference: publishedConference
    });
  } catch (error: any) {
    console.error("Error publishing conference:", error);
    res.status(500).json({ message: "Failed to publish conference" });
  }
};

// Unpublish conference (return to draft)
export const unpublishConference = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    // Check permissions
    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to unpublish this conference" });
      return;
    }

    // Update conference status back to draft
    const unpublishedConference = await prisma.conference.update({
      where: { id: Number(id) },
      data: { 
        status: 'draft',
        updatedAt: new Date()
      }
    });

    res.json({ 
      message: "Conference unpublished successfully",
      conference: unpublishedConference
    });
  } catch (error: any) {
    console.error("Error unpublishing conference:", error);
    res.status(500).json({ message: "Failed to unpublish conference" });
  }
};