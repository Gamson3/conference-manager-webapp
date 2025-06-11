import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getUserId, isAdmin } from '../utils/authHelper';

// GET /api/conferences/:id/schedule - Get hierarchical conference schedule
export const getConferenceSchedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    
    console.log(`[DEBUG] Getting schedule for conference ${id}, user ${userId}`); // Add debug log
    
    // Check if conference exists and is accessible
    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        name: true,
        description: true,
        startDate: true,
        endDate: true,
        location: true,
        status: true,
        createdById: true
      }
    });

    if (!conference) {
      console.log(`[DEBUG] Conference ${id} not found`); // Add debug log
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    // For organizers, allow access to their own conferences regardless of status
    // Allow attendees to view only published conferences
    const canView = isAdmin(req) || 
                   conference.createdById === userId || 
                   conference.status === 'published';

    if (!canView) {
      console.log(`[DEBUG] User ${userId} not authorized for conference ${id}`);
      res.status(403).json({ message: "Not authorized to view this conference schedule" });
      return;
    }

    console.log(`[DEBUG] Fetching schedule data for conference ${id}`); // Add debug log

    // Get the hierarchical schedule structure
    const days = await prisma.day.findMany({
      where: { conferenceId: Number(id) },
      include: {
        sections: {
          include: {
            presentations: {
              include: {
                authors: {
                  orderBy: { order: 'asc' },
                  include: {
                    internalUser: true // Add this line to include the relation
                  }
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
        status: conference.status
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
            keywords: presentation.keywords,
            duration: presentation.duration,
            order: presentation.order,
            status: presentation.status,
            submissionType: presentation.submissionType,
            sectionId: section.id, // Add this for navigation
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
  } catch (error: any) {
    console.error('Error fetching conference schedule:', error);
    res.status(500).json({ message: 'Failed to fetch conference schedule', error: error.message });
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
    }

    const presentations = await prisma.presentation.findMany({
      where: {
        section: {
          conferenceId: Number(id)
        }
      },
      include: {
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
      title: presentation.title,
      abstract: presentation.abstract,
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
  } catch (error: any) {
    console.error('Error fetching conference presentations:', error);
    res.status(500).json({ message: 'Failed to fetch presentations', error: error.message });
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
                day: true,
                conference: {
                  select: {
                    id: true,
                    name: true,
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

    const formattedFavorites = favorites.map(favorite => ({
      id: favorite.id,
      createdAt: favorite.createdAt,
      presentation: {
        id: favorite.presentation.id,
        title: favorite.presentation.title,
        abstract: favorite.presentation.abstract,
        keywords: favorite.presentation.keywords,
        duration: favorite.presentation.duration,
        authors: favorite.presentation.authors.map(author => ({
          name: author.authorName,
          affiliation: author.affiliation,
          isPresenter: author.isPresenter
        })),
        section: {
          id: favorite.presentation.section.id,
          name: favorite.presentation.section.name,
          type: favorite.presentation.section.type,
          startTime: favorite.presentation.section.startTime?.toISOString(),
          endTime: favorite.presentation.section.endTime?.toISOString(),
          room: favorite.presentation.section.room,
          day: favorite.presentation.section.day ? {
            id: favorite.presentation.section.day.id,
            name: favorite.presentation.section.day.name,
            date: favorite.presentation.section.day.date.toISOString().split('T')[0]
          } : null
        },
        conference: {
          id: favorite.presentation.section.conference.id,
          name: favorite.presentation.section.conference.name,
          startDate: favorite.presentation.section.conference.startDate,
          endDate: favorite.presentation.section.conference.endDate
        }
      }
    }));

    res.json(formattedFavorites);
  } catch (error: any) {
    console.error('Error fetching favorite presentations:', error);
    res.status(500).json({ message: 'Failed to fetch favorites', error: error.message });
  }
};