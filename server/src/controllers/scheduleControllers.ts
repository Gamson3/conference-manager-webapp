import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getUserId, isAdmin } from '../utils/authHelper';
import { ensurePresentationForAcceptedSubmission, SubmissionWithAuthor } from '../utils/submissionToPresentation';

// GET /api/conferences/:id/schedule - Get hierarchical conference schedule
export const getConferenceSchedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    
    console.log(`[DEBUG] Getting schedule for conference ${id}, user ${userId}`); // Add debug log
    
    // Support both numeric ID and slug-based lookup
    const numericId = Number(id);
    const isNumericId = !isNaN(numericId) && numericId > 0;
    const findQuery = isNumericId 
      ? { id: numericId }
      : { slug: id };

    // Check if conference exists and is accessible
    const conference = await prisma.conference.findUnique({
      where: findQuery,
      select: {
        id: true,
        name: true,
        description: true,
        startDate: true,
        endDate: true,
        location: true,
        status: true,
        createdById: true,
        isPublic: true,
        schedulePublishedAt: true
      }
    });

    if (!conference) {
      console.log(`[DEBUG] Conference ${id} not found`);
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    // Authorization logic:
    // - Organizers/Admins: Can always view their own conference schedules (for building/testing)
    // - Public users: Can ONLY view if schedule is explicitly published (schedulePublishedAt is set)
    const isOwner = conference.createdById === userId;
    const isSchedulePublished = conference.status === 'published' 
      && conference.isPublic 
      && !!conference.schedulePublishedAt;
    
    const canView = isAdmin(req) || isOwner || isSchedulePublished;
    const canViewFullText = isAdmin(req) || isOwner;

    if (!canView) {
      console.log(`[DEBUG] Access denied - Conference ${id} schedule not published. schedulePublishedAt:`, conference.schedulePublishedAt);
      res.status(403).json({ message: "Schedule not yet published" });
      return;
    }

    console.log(`[DEBUG] Fetching schedule data for conference ${id}`); // Add debug log

    // Get the hierarchical schedule structure
    const days = await prisma.day.findMany({
      where: { conferenceId: conference.id },
      include: {
        sections: {
          include: {
            presentations: {
              include: {
                submission: {
                  select: {
                    id: true,
                    abstractFileKey: true,
                    abstractFileUrl: true,
                    abstractFileName: true,
                    abstractFileMimeType: true,
                    abstractFileSizeBytes: true,
                    fullTextFileKey: true,
                    fullTextFileUrl: true,
                    fullTextFileName: true,
                    fullTextFileMimeType: true,
                    fullTextFileSizeBytes: true,
                  },
                },
                authors: {
                  orderBy: { order: 'asc' },
                  include: {
                    internalUser: true // Add this line to include the relation
                  }
                },
                type: {
                  select: { id: true, name: true, defaultDuration: true },
                },
                category: {
                  select: { id: true, name: true },
                },
                favorites: userId ? {
                  where: { userId: userId }
                } : false,
                _count: {
                  select: { favorites: true }
                }
              },
              orderBy: { order: 'asc' }
            },
            _count: {
              select: { 
                presentations: true,
                attendees: true 
              }
            }
          },
          orderBy: [
            { startTime: 'asc' },
            { order: 'asc' }
          ]
        }
      },
      orderBy: [
        { date: 'asc' },
        { order: 'asc' }
      ]
    });

    console.log(`[DEBUG] Found ${days.length} days for conference ${id}`); // Add debug log

    // Format the response for tree view
    const formattedSchedule = {
      conference: {
        id: conference.id,
        name: conference.name,
        description: conference.description,
        startDate: conference.startDate?.toISOString(),
        endDate: conference.endDate?.toISOString(),
        location: conference.location,
        status: conference.status,
        schedulePublishedAt: conference.schedulePublishedAt?.toISOString() || null
      },
      days: days.map(day => ({
        id: day.id,
        name: day.name,
        date: day.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        order: day.order,
        sections: day.sections.map(section => ({
          id: section.id,
          name: section.name,
          type: section.type,
          description: section.description,
          startTime: section.startTime?.toISOString(),
          endTime: section.endTime?.toISOString(),
          room: section.room,
          capacity: section.capacity,
          order: section.order,
          attendeeCount: section._count.attendees,
          presentationCount: section._count.presentations,
          presentations: section.presentations.map(presentation => ({
            id: presentation.id,
            title: presentation.title,
            abstract: presentation.abstract,
            // File metadata - URLs are NOT returned directly, use /api/submissions/:id/file endpoint
            submissionId: presentation.submission?.id ?? null,
            hasAbstractFile: Boolean(presentation.submission?.abstractFileKey || presentation.submission?.abstractFileUrl),
            abstractFileName: presentation.submission?.abstractFileName ?? null,
            abstractFileMimeType: presentation.submission?.abstractFileMimeType ?? null,
            abstractFileSizeBytes: presentation.submission?.abstractFileSizeBytes ?? null,
            hasFullTextFile: canViewFullText && Boolean(presentation.submission?.fullTextFileKey || presentation.submission?.fullTextFileUrl),
            fullTextFileName: canViewFullText ? (presentation.submission?.fullTextFileName ?? null) : null,
            fullTextFileMimeType: canViewFullText ? (presentation.submission?.fullTextFileMimeType ?? null) : null,
            fullTextFileSizeBytes: canViewFullText ? (presentation.submission?.fullTextFileSizeBytes ?? null) : null,
            keywords: presentation.keywords,
            duration: presentation.duration,
            order: presentation.order,
            status: presentation.status,
            submissionType: presentation.submissionType,
            sectionId: section.id, // Add this for navigation
            type: presentation.type
              ? {
                  id: presentation.type.id,
                  name: presentation.type.name,
                  defaultDuration: presentation.type.defaultDuration,
                }
              : null,
            category: presentation.category
              ? {
                  id: presentation.category.id,
                  name: presentation.category.name,
                }
              : null,
            authors: presentation.authors.map(author => ({
              id: author.id,
              name: author.authorName,
              email: author.authorEmail,
              affiliation: author.affiliation,
              isPresenter: author.isPresenter,
              isExternal: author.isExternal,
              order: author.order,
              // NEW: Add these optional fields when available
              title: author.title,
              bio: author.bio || author.internalUser?.bio, // Fallback to user bio
              profileUrl: author.profileUrl,
              department: author.department,
              country: author.country
            })),
            isFavorite: userId ? (presentation.favorites?.length > 0) : false,
            favoriteCount: presentation._count.favorites
          }))
        }))
      }))
    };

    console.log(`[DEBUG] Sending schedule response for conference ${id}`); // Add debug log
    res.json(formattedSchedule);
  } catch (error: unknown) {
    console.error('Error fetching conference schedule:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch conference schedule';
    res.status(500).json({ message: 'Failed to fetch conference schedule', error: message });
  }
};

// GET /api/conferences/:id/presentations - Get all presentations for a conference (flat view)
export const getConferencePresentations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    
    // Verify conference access (same logic as above)
    const conference = await prisma.conference.findFirst({
      where: {
        id: Number(id),
        OR: [
          { status: 'published', isPublic: true },
          { createdById: userId },
          ...(isAdmin(req) ? [{}] : [])
        ]
      }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found or not accessible" });
      return;
    }

    const canViewFullText = isAdmin(req) || conference.createdById === userId;

    const presentations = await prisma.presentation.findMany({
      where: {
        section: {
          conferenceId: Number(id)
        }
      },
      include: {
        submission: {
          select: {
            id: true,
            abstractFileKey: true,
            abstractFileUrl: true,
            abstractFileName: true,
            abstractFileMimeType: true,
            abstractFileSizeBytes: true,
            fullTextFileKey: true,
            fullTextFileUrl: true,
            fullTextFileName: true,
            fullTextFileMimeType: true,
            fullTextFileSizeBytes: true,
          },
        },
        authors: {
          orderBy: { order: 'asc' },
          include: {
            internalUser: true // Add this line to include the relation
          }
        },
        section: {
          include: {
            day: true
          }
        },
        favorites: userId ? {
          where: { userId: userId }
        } : false,
        _count: {
          select: { favorites: true }
        }
      },
      orderBy: [
        { section: { day: { order: 'asc' } } },
        { section: { order: 'asc' } },
        { order: 'asc' }
      ]
    });

    const formattedPresentations = presentations.map(presentation => ({
      id: presentation.id,
      submissionId: presentation.submission?.id ?? null,
      title: presentation.title,
      abstract: presentation.abstract,
      // File metadata - URLs are NOT returned directly, use /api/submissions/:id/file endpoint
      hasAbstractFile: Boolean(presentation.submission?.abstractFileKey || presentation.submission?.abstractFileUrl),
      abstractFileName: presentation.submission?.abstractFileName ?? null,
      abstractFileMimeType: presentation.submission?.abstractFileMimeType ?? null,
      abstractFileSizeBytes: presentation.submission?.abstractFileSizeBytes ?? null,
      hasFullTextFile: canViewFullText && Boolean(presentation.submission?.fullTextFileKey || presentation.submission?.fullTextFileUrl),
      fullTextFileName: canViewFullText ? (presentation.submission?.fullTextFileName ?? null) : null,
      fullTextFileMimeType: canViewFullText ? (presentation.submission?.fullTextFileMimeType ?? null) : null,
      fullTextFileSizeBytes: canViewFullText ? (presentation.submission?.fullTextFileSizeBytes ?? null) : null,
      keywords: presentation.keywords,
      affiliations: presentation.affiliations,
      duration: presentation.duration,
      order: presentation.order,
      status: presentation.status,
      submissionType: presentation.submissionType,
      authors: presentation.authors.map(author => ({
        id: author.id,
        name: author.authorName,
        email: author.authorEmail,
        affiliation: author.affiliation,
        isPresenter: author.isPresenter,
        isExternal: author.isExternal,
        order: author.order,
        // NEW: Add these optional fields when available
        title: author.title,
        bio: author.bio || author.internalUser?.bio, // Fallback to user bio
        profileUrl: author.profileUrl,
        department: author.department,
        country: author.country
      })),
      section: {
        id: presentation.section.id,
        name: presentation.section.name,
        type: presentation.section.type,
        startTime: presentation.section.startTime?.toISOString(),
        endTime: presentation.section.endTime?.toISOString(),
        room: presentation.section.room,
        day: presentation.section.day ? {
          id: presentation.section.day.id,
          name: presentation.section.day.name,
          date: presentation.section.day.date.toISOString().split('T')[0]
        } : null
      },
      isFavorite: userId ? (presentation.favorites?.length > 0) : false,
      favoriteCount: presentation._count.favorites
    }));

    res.json(formattedPresentations);
  } catch (error: unknown) {
    console.error('Error fetching conference presentations:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch presentations';
    res.status(500).json({ message: 'Failed to fetch presentations', error: message });
  }
};

// POST /api/presentations/:id/favorite - Add presentation to favorites
export const addPresentationToFavorites = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!userId) {
        res.status(401).json({ message: "User not authenticated" });
        return;
    }

    // Check if presentation exists and is accessible
    const presentation = await prisma.presentation.findUnique({
      where: { id: Number(id) },
      include: {
        section: {
          include: {
            day: {
              include: {
                conference: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!presentation) {
        res.status(404).json({ message: "Presentation not found" });
        return;
    }

    // Add null checks for section.day
    if (!presentation.section.day) {
        res.status(400).json({ message: "Presentation section has no associated day" });
        return;
    }
    if (!presentation.section.day.conference) {
        res.status(400).json({ message: "Presentation day has no associated conference" });
        return;
    }

    // Check if already favorited
    const existingFavorite = await prisma.presentationFavorite.findUnique({
      where: {
        userId_presentationId: {
          userId: userId,
          presentationId: Number(id)
        }
      }
    });

    if (existingFavorite) {
      res.status(400).json({ message: "Presentation already in favorites" });
      return;
    }

    // Add to favorites
    const favorite = await prisma.presentationFavorite.create({
      data: {
        userId: userId,
        presentationId: Number(id)
      }
    });

    res.status(201).json({
      message: "Added to favorites",
      favorite: {
        id: favorite.id,
        createdAt: favorite.createdAt,
        navigationContext: {
          conferenceId: presentation.section.day.conference.id,
          conferenceName: presentation.section.day.conference.name,
          dayId: presentation.section.day.id,
          sectionId: presentation.section.id,
          treeUrl: `/attendee/conferences/${presentation.section.day.conference.id}/tree?expandDay=${presentation.section.day.id}&expandSection=${presentation.section.id}&highlight=${presentation.id}`
        }
      }
    });
  } catch (error: any) {
    console.error("Error adding presentation to favorites:", error);
    res.status(500).json({ message: "Failed to add to favorites", error: error.message });
  }
};

// DELETE /api/presentations/:id/favorite - Remove presentation from favorites
export const removePresentationFromFavorites = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!userId) {
        res.status(401).json({ message: "User not authenticated" });
        return;
    }

    // Check if presentation exists and is accessible
    const presentation = await prisma.presentation.findUnique({
      where: { id: Number(id) },
    });

    if (!presentation) {
        res.status(404).json({ message: "Presentation not found" });
        return;
    }

    // Check if favorited
    const existingFavorite = await prisma.presentationFavorite.findUnique({
      where: {
        userId_presentationId: {
          userId: userId,
          presentationId: Number(id)
        }
      }
    });

    if (!existingFavorite) {
      res.status(400).json({ message: "Presentation not in favorites" });
      return;
    }

    // Remove from favorites
    await prisma.presentationFavorite.delete({
      where: {
        userId_presentationId: {
          userId: userId,
          presentationId: Number(id)
        }
      }
    });

    res.json({ message: "Removed from favorites", isFavorite: false });
  } catch (error: any) {
    console.error("Error removing presentation from favorites:", error);
    res.status(500).json({ message: "Failed to remove from favorites", error: error.message });
  }
};

// PATCH /api/account/favorites/presentations/:id - Toggle presentation favorite status
export const togglePresentationFavorite = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Check if presentation exists
    const presentation = await prisma.presentation.findUnique({
      where: { id: Number(id) },
      include: {
        section: {
          include: {
            day: {
              include: {
                conference: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!presentation) {
      res.status(404).json({ message: "Presentation not found" });
      return;
    }

    // Check for required nested data
    if (!presentation.section?.day?.conference) {
      res.status(400).json({ message: "Presentation data incomplete" });
      return;
    }

    // Check if already favorited
    const existingFavorite = await prisma.presentationFavorite.findUnique({
      where: {
        userId_presentationId: {
          userId: userId,
          presentationId: Number(id)
        }
      }
    });

    if (existingFavorite) {
      // Remove from favorites
      await prisma.presentationFavorite.delete({
        where: {
          userId_presentationId: {
            userId: userId,
            presentationId: Number(id)
          }
        }
      });

      res.json({ 
        message: "Removed from favorites", 
        isFavorite: false 
      });
    } else {
      // Add to favorites
      const favorite = await prisma.presentationFavorite.create({
        data: {
          userId: userId,
          presentationId: Number(id)
        }
      });

      res.json({
        message: "Added to favorites",
        isFavorite: true,
        favorite: {
          id: favorite.id,
          createdAt: favorite.createdAt,
          navigationContext: {
            conferenceId: presentation.section.day.conference.id,
            conferenceName: presentation.section.day.conference.name,
            dayId: presentation.section.day.id,
            sectionId: presentation.section.id,
            treeUrl: `/attendee/conferences/${presentation.section.day.conference.id}/tree?expandDay=${presentation.section.day.id}&expandSection=${presentation.section.id}&highlight=${presentation.id}`
          }
        }
      });
    }
  } catch (error: any) {
    console.error("Error toggling presentation favorite:", error);
    res.status(500).json({ message: "Failed to toggle favorite", error: error.message });
  }
};

// GET /api/users/presentation-favorites - Get user's favorite presentations
export const getUserFavoriteePresentations = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
        res.status(401).json({ message: "User not authenticated" });
        return;
    }

    const favorites = await prisma.presentationFavorite.findMany({
      where: { userId: userId },
      include: {
        presentation: {
          include: {
            authors: {
              orderBy: { order: 'asc' }
            },
            section: {
              include: {
                day: {
                  select: {
                    id: true,
                    name: true,
                    date: true,
                  }
                },
                conference: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    startDate: true,
                    endDate: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform to match FavoritePresentation interface expected by frontend
    const formattedFavorites = favorites
      .filter(favorite => favorite.presentation.section.day) // Skip if no day (shouldn't happen)
      .map(favorite => ({
        id: favorite.presentation.id.toString(),
        title: favorite.presentation.title,
        abstract: favorite.presentation.abstract || undefined,
        keywords: favorite.presentation.keywords || [],
        authors: favorite.presentation.authors.map(author => ({
          id: author.id.toString(),
          name: author.authorName,
          affiliation: author.affiliation || undefined,
        })),
        session: {
          id: favorite.presentation.section.id.toString(),
          title: favorite.presentation.section.name || 'Session',
          startTime: favorite.presentation.section.startTime?.toISOString() || '',
          endTime: favorite.presentation.section.endTime?.toISOString() || '',
          room: favorite.presentation.section.room || undefined,
        },
        day: {
          id: favorite.presentation.section.day!.id.toString(),
          date: favorite.presentation.section.day!.date.toISOString().split('T')[0],
          label: favorite.presentation.section.day!.name || undefined,
        },
        conference: {
          id: favorite.presentation.section.conference.id.toString(),
          name: favorite.presentation.section.conference.name,
          slug: favorite.presentation.section.conference.slug || undefined,
        },
        favoritedAt: favorite.createdAt.toISOString(),
      }));

    res.json({ favorites: formattedFavorites });
  } catch (error: any) {
    console.error('Error fetching favorite presentations:', error);
    res.status(500).json({ message: 'Failed to fetch favorites', error: error.message });
  }
};

// GET /api/conferences/:id/accepted-presentations - Accepted submissions (with optional presentation link)
export const getAcceptedPresentationsForConference = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const conferenceId = Number(id);
    const userId = getUserId(req);

    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
      select: { id: true, createdById: true, status: true, isPublic: true }
    });
    if (!conference) { res.status(404).json({ message: 'Conference not found' }); return; }

    const canView = isAdmin(req) || conference.createdById === userId || (conference.status === 'published' && conference.isPublic);
    const canViewFullText = isAdmin(req) || conference.createdById === userId;
    if (!canView) { res.status(403).json({ message: 'Not authorized to view accepted presentations' }); return; }

    const acceptedWithPresentations = await prisma.submission.findMany({
      where: { conferenceId, status: 'accepted' },
      include: {
        author: { select: { id: true, name: true, email: true } },
        presentation: {
          include: {
            authors: { orderBy: { order: 'asc' } },
            type: { select: { id: true, name: true, defaultDuration: true } },
            category: { select: { id: true, name: true } },
            section: { include: { day: true } }
          }
        }
      },
      orderBy: { submittedAt: 'asc' }
    });

    const payload = acceptedWithPresentations.map(s => ({
      id: s.id,
      title: s.title,
      abstract: s.abstract,
      // File metadata - URLs are NOT returned directly, use /api/submissions/:id/file endpoint
      hasAbstractFile: Boolean(s.abstractFileKey || s.abstractFileUrl),
      abstractFileName: s.abstractFileName ?? null,
      abstractFileMimeType: s.abstractFileMimeType ?? null,
      abstractFileSizeBytes: s.abstractFileSizeBytes ?? null,
      hasFullTextFile: canViewFullText && Boolean(s.fullTextFileKey || s.fullTextFileUrl),
      fullTextFileName: canViewFullText ? (s.fullTextFileName ?? null) : null,
      fullTextFileMimeType: canViewFullText ? (s.fullTextFileMimeType ?? null) : null,
      fullTextFileSizeBytes: canViewFullText ? (s.fullTextFileSizeBytes ?? null) : null,
      keywords: s.keywords,
      author: s.author,
      presentation: s.presentation ? {
        id: s.presentation.id,
        title: s.presentation.title,
        duration: s.presentation.duration,
        type: s.presentation.type
          ? {
              id: s.presentation.type.id,
              name: s.presentation.type.name,
              defaultDuration: s.presentation.type.defaultDuration ?? 15,
            }
          : null,
        category: s.presentation.category
          ? {
              id: s.presentation.category.id,
              name: s.presentation.category.name,
            }
          : null,
        section: s.presentation.section ? {
          id: s.presentation.section.id,
          name: s.presentation.section.name,
          day: s.presentation.section.day ? {
            id: s.presentation.section.day.id,
            name: s.presentation.section.day.name,
            date: s.presentation.section.day.date.toISOString().split('T')[0]
          } : null
        } : null,
        authors: s.presentation.authors
      } : null
    }));

    res.json(payload);
  } catch (error: unknown) {
    console.error('Error fetching accepted presentations:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch accepted presentations';
    res.status(500).json({ message: 'Failed to fetch accepted presentations', error: message });
  }
};

// GET /api/conferences/:id/speakers - Distinct speakers derived from scheduled presentations
export const getConferenceSpeakers = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const numericId = Number(id);
    const userId = getUserId(req);

    // Support both numeric ID and slug-based lookup
    const isNumericId = !isNaN(numericId) && numericId > 0;
    const findQuery = isNumericId 
      ? { id: numericId }
      : { slug: id };

    const conference = await prisma.conference.findUnique({
      where: findQuery,
      select: { id: true, createdById: true, status: true, isPublic: true }
    });
    if (!conference) { res.status(404).json({ message: 'Conference not found' }); return; }

    const canView = isAdmin(req) || conference.createdById === userId || (conference.status === 'published' && conference.isPublic);
    if (!canView) { res.status(403).json({ message: 'Not authorized to view speakers' }); return; }

    const authors = await prisma.presentationAuthor.findMany({
      where: {
        presentation: {
          section: { conferenceId: conference.id },
          status: { in: ['scheduled', 'locked'] }
        },
        isPresenter: true
      },
      orderBy: [ { authorName: 'asc' } ]
    });

    // Deduplicate by email if present, else by name + affiliation
    const seen = new Set<string>();
    const deduped = [] as typeof authors;
    for (const a of authors) {
      const key = (a.authorEmail && a.authorEmail.trim().toLowerCase()) || `${a.authorName}|${a.affiliation || ''}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(a);
    }

    res.json(deduped.map(a => ({
      id: a.id,
      name: a.authorName,
      email: a.authorEmail,
      affiliation: a.affiliation,
      title: a.title,
      bio: a.bio,
      profileUrl: a.profileUrl,
      orcidId: a.orcidId,
      department: a.department,
      country: a.country
    })));
  } catch (error: any) {
    console.error('Error fetching speakers:', error);
    res.status(500).json({ message: 'Failed to fetch speakers', error: error.message });
  }
};

// ============================================================================
// SCHEDULE MANAGEMENT ENDPOINTS (Phase 5)
// ============================================================================

// Types for validation
interface ScheduleConflict {
  type: 'SESSION_OVERFLOW' | 'ROOM_OVERLAP' | 'PRESENTER_CONFLICT';
  sessionId?: number;
  roomKey?: string;
  sessions?: number[];
  presenter?: string;
  presentations?: number[];
}

interface SchedulePresentation {
  id: number;
  order: number;
  durationMins?: number;
  presenters?: string[];
}

interface ScheduleSession {
  id: number;
  name: string;
  room?: string;
  startTime?: string;
  endTime?: string;
  presentations: SchedulePresentation[];
}

interface ScheduleDay {
  id: number;
  date: string;
  sessions: ScheduleSession[];
}

interface SchedulePayload {
  conferenceId: number;
  days: ScheduleDay[];
  timezone?: string;
}

// Helper: Convert date+time to timestamp
const toTimestamp = (dateStr: string, timeStr: string | undefined): number => {
  if (!timeStr) return 0;
  // Parse as ISO-like format
  const dt = new Date(`${dateStr}T${timeStr}`);
  return dt.getTime();
};

// Helper: Check if two intervals overlap
const intervalsOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number): boolean => {
  return aStart < bEnd && bStart < aEnd;
};

// Shared validation logic - validates schedule for conflicts
export const validateSchedulePayload = (schedule: SchedulePayload): ScheduleConflict[] => {
  const conflicts: ScheduleConflict[] = [];
  const presenterMap = new Map<string, Array<{ start: number; end: number; sessionId: number; presentationId: number }>>();
  const roomMap = new Map<string, Array<{ start: number; end: number; sessionId: number }>>();

  schedule.days.forEach(day => {
    day.sessions.forEach(session => {
      const sessStart = toTimestamp(day.date, session.startTime);
      const sessEnd = toTimestamp(day.date, session.endTime);

      // Room-level overlaps tracking
      if (session.room) {
        const roomKey = `${day.date}::${session.room}`;
        if (!roomMap.has(roomKey)) roomMap.set(roomKey, []);
        roomMap.get(roomKey)!.push({ start: sessStart, end: sessEnd, sessionId: session.id });
      }

      // Calculate session capacity in minutes
      const sessionCapacityMins = sessEnd && sessStart ? (sessEnd - sessStart) / (1000 * 60) : 0;

      // Sum presentation durations
      const totalPresMins = session.presentations.reduce((sum, p) => sum + (p.durationMins || 0), 0);

      // Session overflow check
      if (sessionCapacityMins > 0 && totalPresMins > sessionCapacityMins) {
        conflicts.push({ type: 'SESSION_OVERFLOW', sessionId: session.id });
      }

      // Track presenter allocations for double-booking check
      let cursor = sessStart;
      session.presentations.forEach(p => {
        const pStart = cursor;
        const pEnd = pStart + ((p.durationMins || 0) * 60 * 1000);
        cursor = pEnd;

        (p.presenters || []).forEach(presenter => {
          if (!presenterMap.has(presenter)) presenterMap.set(presenter, []);
          presenterMap.get(presenter)!.push({
            start: pStart,
            end: pEnd,
            sessionId: session.id,
            presentationId: p.id
          });
        });
      });
    });
  });

  // Check for room overlaps
  roomMap.forEach((slots, key) => {
    slots.sort((a, b) => a.start - b.start);
    for (let i = 0; i < slots.length - 1; i++) {
      if (intervalsOverlap(slots[i].start, slots[i].end, slots[i + 1].start, slots[i + 1].end)) {
        conflicts.push({
          type: 'ROOM_OVERLAP',
          roomKey: key,
          sessions: [slots[i].sessionId, slots[i + 1].sessionId]
        });
      }
    }
  });

  // Check for presenter double-booking
  presenterMap.forEach((allocs, presenter) => {
    allocs.sort((a, b) => a.start - b.start);
    for (let i = 0; i < allocs.length - 1; i++) {
      if (intervalsOverlap(allocs[i].start, allocs[i].end, allocs[i + 1].start, allocs[i + 1].end)) {
        conflicts.push({
          type: 'PRESENTER_CONFLICT',
          presenter,
          presentations: [allocs[i].presentationId, allocs[i + 1].presentationId]
        });
      }
    }
  });

  return conflicts;
};

// POST /api/conferences/:id/schedule/validate - Validate schedule without saving
export const validateSchedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const schedulePayload: SchedulePayload = req.body;

    // Check authorization
    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      select: { id: true, createdById: true }
    });

    if (!conference) {
      res.status(404).json({ message: 'Conference not found' });
      return;
    }

    const canEdit = isAdmin(req) || conference.createdById === userId;
    if (!canEdit) {
      res.status(403).json({ message: 'Not authorized to validate schedule' });
      return;
    }

    // Validate the payload
    const conflicts = validateSchedulePayload(schedulePayload);

    res.json({ conflicts });
  } catch (error: any) {
    console.error('Error validating schedule:', error);
    res.status(500).json({ message: 'Failed to validate schedule', error: error.message });
  }
};

// PUT /api/conferences/:id/schedule - Save schedule with batch presentation assignments
export const saveSchedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const schedulePayload: SchedulePayload = req.body;

    console.log(`[DEBUG] Saving schedule for conference ${id}, user ${userId}`);

    // Check authorization
    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      select: { id: true, createdById: true, timezone: true }
    });

    if (!conference) {
      res.status(404).json({ message: 'Conference not found' });
      return;
    }

    const canEdit = isAdmin(req) || conference.createdById === userId;
    if (!canEdit) {
      res.status(403).json({ message: 'Not authorized to edit schedule' });
      return;
    }

    // Validate the payload first
    const conflicts = validateSchedulePayload(schedulePayload);

    // Even if there are warnings, we allow saving (soft validation)
    // But we return the conflicts so the frontend can display them

    // Track issues during save
    const skippedPresentations: Array<{ id: number; reason: string }> = [];
    const warnings: string[] = [];

    // Process the schedule transactionally
    await prisma.$transaction(async (tx) => {
      // Get all current presentations for this conference to track assignments
      const existingPresentations = await tx.presentation.findMany({
        where: { section: { conferenceId: Number(id) } },
        select: { id: true, sectionId: true, status: true, lockedById: true }
      });

      const lockedPresentationIds = new Set(
        existingPresentations
          .filter(p => p.lockedById !== null)
          .map(p => p.id)
      );

      // Track which presentations are being assigned in this payload
      const assignedPresentationIds = new Set<number>();

      // Process each day
      for (const dayPayload of schedulePayload.days) {
        // Verify day belongs to this conference
        const day = await tx.day.findFirst({
          where: { id: dayPayload.id, conferenceId: Number(id) }
        });

        if (!day) {
          console.log(`[DEBUG] Day ${dayPayload.id} not found for conference ${id}, skipping`);
          continue;
        }

        // Process each session in this day
        for (const sessionPayload of dayPayload.sessions) {
          // Verify session belongs to this conference
          const session = await tx.section.findFirst({
            where: { id: sessionPayload.id, conferenceId: Number(id) }
          });

          if (!session) {
            console.log(`[DEBUG] Session ${sessionPayload.id} not found for conference ${id}, skipping`);
            continue;
          }

          // Update session metadata if provided
          if (sessionPayload.room !== undefined || sessionPayload.startTime !== undefined || sessionPayload.endTime !== undefined) {
            // Validate and parse time strings before creating Date objects
            let startTime = session.startTime;
            let endTime = session.endTime;
            
            if (sessionPayload.startTime !== undefined && sessionPayload.startTime !== null && sessionPayload.startTime !== '') {
              // Extract time part if sent as ISO timestamp (e.g., '2026-06-15T08:00:00.000Z' -> '08:00:00')
              let timeStr = sessionPayload.startTime;
              if (timeStr.includes('T')) {
                // Full ISO timestamp - extract time part
                timeStr = timeStr.split('T')[1]?.replace('Z', '') || timeStr;
              }
              
              const startDateStr = `${dayPayload.date}T${timeStr}`;
              const parsedStart = new Date(startDateStr);
              if (!isNaN(parsedStart.getTime())) {
                startTime = parsedStart;
              } else {
                console.warn(`[WARN] Invalid startTime for session ${sessionPayload.id}: '${sessionPayload.startTime}' (extracted: '${timeStr}', parsed: '${startDateStr}')`);
              }
            }
            
            if (sessionPayload.endTime !== undefined && sessionPayload.endTime !== null && sessionPayload.endTime !== '') {
              // Extract time part if sent as ISO timestamp
              let timeStr = sessionPayload.endTime;
              if (timeStr.includes('T')) {
                // Full ISO timestamp - extract time part
                timeStr = timeStr.split('T')[1]?.replace('Z', '') || timeStr;
              }
              
              const endDateStr = `${dayPayload.date}T${timeStr}`;
              const parsedEnd = new Date(endDateStr);
              if (!isNaN(parsedEnd.getTime())) {
                endTime = parsedEnd;
              } else {
                console.warn(`[WARN] Invalid endTime for session ${sessionPayload.id}: '${sessionPayload.endTime}' (extracted: '${timeStr}', parsed: '${endDateStr}')`);
              }
            }
            
            await tx.section.update({
              where: { id: sessionPayload.id },
              data: {
                room: sessionPayload.room ?? session.room,
                startTime,
                endTime
              }
            });
          }

          // Process presentations in this session
          for (const presPayload of sessionPayload.presentations) {
            // Skip locked presentations
            if (lockedPresentationIds.has(presPayload.id)) {
              console.log(`[DEBUG] Presentation ${presPayload.id} is locked, skipping`);
              continue;
            }

            // Check if presentation exists before updating
            const presentationExists = await tx.presentation.findUnique({
              where: { id: presPayload.id }
            });

            if (!presentationExists) {
              console.warn(`[WARN] Presentation ${presPayload.id} not found, skipping`);
              skippedPresentations.push({ id: presPayload.id, reason: 'Presentation not found in database' });
              continue;
            }

            // Update presentation assignment
            await tx.presentation.update({
              where: { id: presPayload.id },
              data: {
                sectionId: sessionPayload.id,
                order: presPayload.order,
                duration: presPayload.durationMins,
                status: 'scheduled'
              }
            });

            assignedPresentationIds.add(presPayload.id);
          }
        }
      }

      // Unassign presentations that were previously scheduled but not in this payload
      // (They go back to "submitted" status, keeping their sectionId for reference)
      const presentationsToUnschedule = existingPresentations.filter(
        p => p.status === 'scheduled' && !assignedPresentationIds.has(p.id) && !lockedPresentationIds.has(p.id)
      );

      for (const pres of presentationsToUnschedule) {
        await tx.presentation.update({
          where: { id: pres.id },
          data: { status: 'submitted' }
        });
      }
    });

    const lastSavedAt = new Date().toISOString();

    console.log(`[DEBUG] Schedule saved successfully for conference ${id}`);
    if (skippedPresentations.length > 0) {
      console.log(`[DEBUG] Skipped ${skippedPresentations.length} presentations:`, skippedPresentations);
    }

    res.json({
      saved: true,
      lastSavedAt,
      conflicts,
      skippedPresentations,
      warnings: warnings.length > 0 ? warnings : undefined
    });
  } catch (error: any) {
    console.error('Error saving schedule:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    });
    res.status(500).json({
      saved: false,
      message: 'Failed to save schedule',
      error: error.message,
      conflicts: []
    });
  }
};

// POST /api/conferences/:id/schedule/publish - Publish the schedule
export const publishSchedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    console.log(`[DEBUG] Publishing schedule for conference ${id}, user ${userId}`);

    // Check authorization
    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        createdById: true,
        schedulePublishedAt: true,
        timezone: true
      }
    });

    if (!conference) {
      res.status(404).json({ message: 'Conference not found' });
      return;
    }

    const canEdit = isAdmin(req) || conference.createdById === userId;
    if (!canEdit) {
      res.status(403).json({ message: 'Not authorized to publish schedule' });
      return;
    }

    // Get current schedule to validate before publishing
    const days = await prisma.day.findMany({
      where: { conferenceId: Number(id) },
      include: {
        sections: {
          include: {
            presentations: {
              where: { status: 'scheduled' },
              include: {
                authors: {
                  where: { isPresenter: true },
                  select: { authorEmail: true, authorName: true }
                }
              },
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { date: 'asc' }
    });

    // Build schedule payload for validation
    const schedulePayload: SchedulePayload = {
      conferenceId: Number(id),
      days: days.map(day => ({
        id: day.id,
        date: day.date.toISOString().split('T')[0],
        sessions: day.sections.map(section => ({
          id: section.id,
          name: section.name,
          room: section.room || undefined,
          startTime: section.startTime ? section.startTime.toISOString().split('T')[1].substring(0, 5) : undefined,
          endTime: section.endTime ? section.endTime.toISOString().split('T')[1].substring(0, 5) : undefined,
          presentations: section.presentations.map(p => ({
            id: p.id,
            order: p.order,
            durationMins: p.duration || undefined,
            presenters: p.authors.map(a => a.authorEmail || a.authorName)
          }))
        }))
      }))
    };

    // Validate
    const conflicts = validateSchedulePayload(schedulePayload);

    // Block publishing if there are critical conflicts
    const criticalConflicts = conflicts.filter(c => 
      c.type === 'ROOM_OVERLAP' || c.type === 'PRESENTER_CONFLICT'
    );

    if (criticalConflicts.length > 0) {
      res.status(400).json({
        published: false,
        message: 'Cannot publish schedule with critical conflicts',
        conflicts: criticalConflicts
      });
      return;
    }

    // Set schedulePublishedAt
    const publishedAt = new Date();
    await prisma.conference.update({
      where: { id: Number(id) },
      data: { schedulePublishedAt: publishedAt }
    });

    console.log(`[DEBUG] Schedule published successfully for conference ${id}`);

    res.json({
      published: true,
      publishedAt: publishedAt.toISOString(),
      conflicts // Return any warnings (like SESSION_OVERFLOW)
    });
  } catch (error: any) {
    console.error('Error publishing schedule:', error);
    res.status(500).json({
      published: false,
      message: 'Failed to publish schedule',
      error: error.message
    });
  }
};

// POST /api/conferences/:id/schedule/unpublish - Unpublish the schedule
export const unpublishSchedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    console.log(`[DEBUG] Unpublishing schedule for conference ${id}, user ${userId}`);

    // Check authorization
    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      select: { id: true, createdById: true, schedulePublishedAt: true }
    });

    if (!conference) {
      res.status(404).json({ message: 'Conference not found' });
      return;
    }

    const canEdit = isAdmin(req) || conference.createdById === userId;
    if (!canEdit) {
      res.status(403).json({ message: 'Not authorized to unpublish schedule' });
      return;
    }

    if (!conference.schedulePublishedAt) {
      res.status(400).json({ message: 'Schedule is not currently published' });
      return;
    }

    // Clear schedulePublishedAt
    await prisma.conference.update({
      where: { id: Number(id) },
      data: { schedulePublishedAt: null }
    });

    console.log(`[DEBUG] Schedule unpublished successfully for conference ${id}`);

    res.json({ unpublished: true });
  } catch (error: any) {
    console.error('Error unpublishing schedule:', error);
    res.status(500).json({
      unpublished: false,
      message: 'Failed to unpublish schedule',
      error: error.message
    });
  }
};