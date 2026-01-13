import { Request, Response } from "express";
import prisma from '../lib/prisma';
import { getUserId, isAdmin } from "../utils/authHelper";
import { generateConferenceDays } from "../utils/dayGenerator";
import { addUserToGroup } from "../utils/cognitoAdminClient";

// CREATE
export const createEvent = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      name, description, startDate, endDate, location, createdById,
      capacity, registrationDeadline, isPublic, timezone,
      websiteUrl, venue, venueAddress, organizerNotes, bannerImageUrl, topics
    } = req.body;

    const shouldUpgrade = user.role === 'user';

    // Atomic operation: upgrade DB mirror (if needed) + create conference in a single transaction.
    // Cognito mutation happens after commit, with rollback on failure.
    const result = await prisma.$transaction(async (tx) => {
      let upgradedUser = user;
      if (shouldUpgrade) {
        upgradedUser = await tx.user.update({
          where: { id: user.id },
          data: { role: 'organizer' },
        });
      }

      const event = await tx.conference.create({
        data: {
          name,
          description,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          location,
          createdById: upgradedUser.id,
          capacity: capacity ? Number(capacity) : null,
          registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
          isPublic: isPublic !== undefined ? isPublic : true,
          timezone,
          websiteUrl,
          venue,
          venueAddress,
          organizerNotes,
          bannerImageUrl,
          topics: topics || [],
          status: 'draft'
        },
      });

      return { user: upgradedUser, conference: event };
    });

    // Authoritative upgrade: add user to Cognito group after DB commit.
    // If this fails, roll back DB changes so we don't create a conference without upgrading.
    if (shouldUpgrade) {
      try {
        await addUserToGroup(user.cognitoId, 'organizer');
      } catch (error: unknown) {
        console.error('Failed to add user to organizer group after conference creation:', error);

        try {
          await prisma.$transaction(async (tx) => {
            await tx.conference.delete({ where: { id: result.conference.id } });
            await tx.user.update({ where: { id: user.id }, data: { role: 'user' } });
          });
        } catch (rollbackError: unknown) {
          console.error('Failed to roll back conference creation after Cognito upgrade failure:', rollbackError);
        }

        return res.status(502).json({
          message: 'Conference creation failed during role upgrade. Please retry.',
        });
      }
    }

    // Return conference (and optionally upgraded user info for frontend to update state)
    res.status(201).json({
      ...result.conference,
      _userUpgraded: shouldUpgrade,
      _requiresTokenRefresh: shouldUpgrade,
    });
  } catch (error: unknown) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Unexpected error" });
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
            participants: true,
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
    const userId = getUserId(req);
    
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // Verify ownership or admin access
    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      select: { id: true, createdById: true }
    });

    if (!conference) {
      res.status(404).json({ message: 'Conference not found' });
      return;
    }

    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: 'Not authorized to update this conference' });
      return;
    }

    const {
      name, description, startDate, endDate, location,
      websiteUrl, venue, capacity, timezone, topics, isPublic,
      // New organizer profile fields
      organizerName, organizerEmail, organizerPhone, organizerWebsite, organizerLogoUrl,
      // Review window and limits
      reviewStartsAt, reviewEndsAt, maxSubmissionsPerUser,
      // CFP and registration windows
      submissionsOpenFrom, submissionsOpenUntil,
      registrationOpenFrom, registrationOpenUntil
    } = req.body;

    // Build update data object, only including fields that are explicitly provided
    const updateData: any = {};

    // Required fields (if provided)
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    
    // Optional string fields
    if (location !== undefined) updateData.location = location;
    if (websiteUrl !== undefined) updateData.websiteUrl = websiteUrl || null;
    if (venue !== undefined) updateData.venue = venue || null;
    if (timezone !== undefined) updateData.timezone = timezone;
    
    // Capacity handling
    if (capacity !== undefined) {
      updateData.capacity = capacity && String(capacity).length > 0 ? Number(capacity) : null;
    }
    
    // Topics array
    if (topics !== undefined) {
      updateData.topics = Array.isArray(topics) ? topics.map((t: any) => String(t)) : [];
    }
    
    // Boolean fields
    if (isPublic !== undefined) updateData.isPublic = Boolean(isPublic);
    
    // Organizer profile fields
    if (organizerName !== undefined) updateData.organizerName = organizerName || null;
    if (organizerEmail !== undefined) updateData.organizerEmail = organizerEmail || null;
    if (organizerPhone !== undefined) updateData.organizerPhone = organizerPhone || null;
    if (organizerWebsite !== undefined) updateData.organizerWebsite = organizerWebsite || null;
    if (organizerLogoUrl !== undefined) updateData.organizerLogoUrl = organizerLogoUrl || null;
    
    // Review window fields
    if (reviewStartsAt !== undefined) {
      updateData.reviewStartsAt = reviewStartsAt ? new Date(reviewStartsAt) : null;
    }
    if (reviewEndsAt !== undefined) {
      updateData.reviewEndsAt = reviewEndsAt ? new Date(reviewEndsAt) : null;
    }
    if (maxSubmissionsPerUser !== undefined) {
      updateData.maxSubmissionsPerUser = typeof maxSubmissionsPerUser === 'number' ? maxSubmissionsPerUser : null;
    }
    
    // CFP window fields
    if (submissionsOpenFrom !== undefined) {
      updateData.submissionsOpenFrom = submissionsOpenFrom ? new Date(submissionsOpenFrom) : null;
    }
    if (submissionsOpenUntil !== undefined) {
      updateData.submissionsOpenUntil = submissionsOpenUntil ? new Date(submissionsOpenUntil) : null;
    }
    
    // Registration window fields
    if (registrationOpenFrom !== undefined) {
      updateData.registrationOpenFrom = registrationOpenFrom ? new Date(registrationOpenFrom) : null;
    }
    if (registrationOpenUntil !== undefined) {
      updateData.registrationOpenUntil = registrationOpenUntil ? new Date(registrationOpenUntil) : null;
    }

    const event = await prisma.conference.update({
      where: { id: Number(id) },
      data: updateData,
    });

    // If dates changed, regenerate conference days
    if (startDate !== undefined || endDate !== undefined) {
      const { startDate: finalStart, endDate: finalEnd } = await prisma.conference.findUniqueOrThrow({
        where: { id: Number(id) },
        select: { startDate: true, endDate: true }
      });
      
      await generateConferenceDays(Number(id), finalStart, finalEnd);
    }

    res.json(event);
  } catch (error: any) {
    console.error('Error updating conference:', error);
    res.status(500).json({ message: error.message || 'Failed to update conference' });
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

      // 10. Delete conference participants
      await tx.conferenceParticipant.deleteMany({
        where: {
          conferenceId: Number(id)
        }
      });
      console.log(`[DELETE] Deleted participants for conference ${id}`);

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

      // 14. Delete submissions and reviews
      await tx.submissionReview.deleteMany({
        where: { submission: { conferenceId: Number(id) } }
      });
      console.log(`[DELETE] Deleted submission reviews for conference ${id}`);

      await tx.submission.deleteMany({ where: { conferenceId: Number(id) } });
      console.log(`[DELETE] Deleted submissions for conference ${id}`);

      // 16. Delete RegistrationQuestions
      await tx.registrationQuestion.deleteMany({ where: { conferenceId: Number(id) } });
      console.log(`[DELETE] Deleted registration questions for conference ${id}`);

      // 17. Delete ConferenceCategory
      await tx.conferenceCategory.deleteMany({ where: { conferenceId: Number(id) } });
      console.log(`[DELETE] Deleted conference categories for conference ${id}`);

      // 18. Delete PresentationType
      await tx.presentationType.deleteMany({ where: { conferenceId: Number(id) } });
      console.log(`[DELETE] Deleted presentation types for conference ${id}`);

      // 19. Delete TimelineMilestone
      await tx.timelineMilestone.deleteMany({ where: { conferenceId: Number(id) } });
      console.log(`[DELETE] Deleted timeline milestones for conference ${id}`);

      // 20. Delete SubmissionRequirement (unique constraint - use deleteMany for safety)
      await tx.submissionRequirement.deleteMany({ where: { conferenceId: Number(id) } });
      console.log(`[DELETE] Deleted submission requirements for conference ${id}`);

      // 21. Finally, delete the conference itself
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
            participants: true,
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
    const attendees = await prisma.conferenceParticipant.findMany({
      where: { conferenceId: Number(id), role: 'attendee', status: 'registered' },
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
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(feedback);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get abstract submissions for conference
export const getConferenceSubmissions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const submissions = await prisma.submission.findMany({
      where: { conferenceId: Number(id) },
      include: {
        author: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } },
        type: { select: { id: true, name: true } },
        reviews: true
      },
      orderBy: { submittedAt: 'desc' }
    });
    
    // Transform to include form-submitted author details
    const formattedSubmissions = submissions.map(submission => ({
      ...submission,
      presentationType: submission.type,
      // Override system author with form-submitted details if available
      author: {
        id: submission.author.id,
        name: submission.author.name, // Use system name (no authorName field in Submission)
        email: submission.authorEmail || submission.author.email,
        organization: submission.authorAffiliation
      }
    }));
    
    res.json({ submissions: formattedSubmissions });
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

    // Validate before publishing - only require basic conference info
    // This allows early-stage organizers to publish before building program
    const issues = [];
    
    if (!conference.name || conference.name.trim().length === 0) {
      issues.push("Conference must have a name");
    }
    
    if (!conference.startDate || !conference.endDate) {
      issues.push("Conference must have start and end dates");
    }
    
    if (!conference.location || conference.location.trim().length === 0) {
      issues.push("Conference must have a location");
    }

    // Days are auto-generated, but check they exist
    if (!conference.days || conference.days.length === 0) {
      issues.push("Conference days not generated - please set valid start/end dates");
    }
    
    if (issues.length > 0) {
      res.status(400).json({ 
        message: "Conference cannot be published", 
        issues 
      });
      return;
    }

    // Update conference status and visibility
    const publishedConference = await prisma.conference.update({
      where: { id: Number(id) },
      data: { 
        status: 'published',
        isPublic: true,  // Set public so it appears in public listing
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

    // Update conference status back to draft and make private
    const unpublishedConference = await prisma.conference.update({
      where: { id: Number(id) },
      data: { 
        status: 'draft',
        isPublic: false,  // Make private when unpublishing
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