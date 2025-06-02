import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getUserId, isAdmin } from '../utils/authHelper';

// GET /api/conferences/:id/schedule - Get hierarchical conference schedule
export const getConferenceSchedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    
    // Check if conference exists and is accessible
    const conference = await prisma.conference.findFirst({
      where: {
        id: Number(id),
        OR: [
          { status: 'published', isPublic: true }, // Public published conferences
          { createdById: userId }, // User's own conferences
          ...(isAdmin(req) ? [{}] : []) // Admins can see all
        ]
      },
      select: {
        id: true,
        name: true,
        status: true,
        createdById: true
      }
    });

    if (!conference) {
        res.status(404).json({ message: "Conference not found or not accessible" });
        return;
    }

    // Get the hierarchical schedule structure
    const days = await prisma.day.findMany({
      where: { conferenceId: Number(id) },
      include: {
        sections: {
          include: {
            presentations: {
              include: {
                authors: {
                  orderBy: { order: 'asc' }
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

    // Format the response for tree view
    const formattedSchedule = {
      conference: {
        id: conference.id,
        name: conference.name,
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
          startTime: section.startTime?.toISOString(),
          endTime: section.endTime?.toISOString(),
          room: section.room,
          capacity: section.capacity,
          description: section.description,
          order: section.order,
          presentationCount: section._count.presentations,
          attendeeCount: section._count.attendees,
          presentations: section.presentations.map(presentation => ({
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
              order: author.order
            })),
            isFavorite: userId ? (presentation.favorites?.length > 0) : false,
            favoriteCount: presentation._count.favorites
          }))
        }))
      }))
    };

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
          orderBy: { order: 'asc' }
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
        order: author.order
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

// POST/DELETE /api/presentations/:id/favorite - Toggle presentation favorite
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
            conference: true
          }
        }
      }
    });

    if (!presentation) {
        res.status(404).json({ message: "Presentation not found" });
        return;
    }

    // Check if user has access to this conference
    const hasAccess = presentation.section.conference.isPublic && 
                     presentation.section.conference.status === 'published' ||
                     presentation.section.conference.createdById === userId ||
                     isAdmin(req);

    if (!hasAccess) {
        res.status(403).json({ message: "Not authorized to access this presentation" });
        return
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

    if (req.method === 'POST') {
      // Add to favorites
      if (existingFavorite) {
        res.status(400).json({ message: "Presentation already in favorites" });
        return;
      }

      await prisma.presentationFavorite.create({
        data: {
          userId: userId,
          presentationId: Number(id)
        }
      });

      res.json({ message: "Added to favorites", isFavorite: true });
    } else if (req.method === 'DELETE') {
      // Remove from favorites
      if (!existingFavorite) {
        res.status(400).json({ message: "Presentation not in favorites" });
        return;
      }

      await prisma.presentationFavorite.delete({
        where: {
          userId_presentationId: {
            userId: userId,
            presentationId: Number(id)
          }
        }
      });

      res.json({ message: "Removed from favorites", isFavorite: false });
    } else {
      res.status(405).json({ message: "Method not allowed" });
    }
  } catch (error: any) {
    console.error('Error toggling presentation favorite:', error);
    res.status(500).json({ message: 'Failed to update favorite', error: error.message });
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