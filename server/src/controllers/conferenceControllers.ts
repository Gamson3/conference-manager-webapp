import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { ConferenceStatus } from "@prisma/client";

// Get all published conferences with filtering options
export const getPublicConferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      category,
      startDate,
      endDate,
      location,
      page = 1,
      limit = 10,
      sort = "startDate",
      order = "asc"
    } = req.query;

    // Build filter conditions
    const where: any = {
      status: ConferenceStatus.published,
      isPublic: true
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (category) {
      where.categories = {
        some: {
          name: { contains: category as string, mode: 'insensitive' }
        }
      };
    }

    if (startDate) {
      where.startDate = { gte: new Date(startDate as string) };
    }

    if (endDate) {
      where.endDate = { lte: new Date(endDate as string) };
    }

    if (location) {
      where.location = { contains: location as string, mode: 'insensitive' };
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Build sort object
    const orderBy: any = {};
    orderBy[sort as string] = order;

    // Fetch conferences with count
    const [conferences, totalCount] = await Promise.all([
      prisma.conference.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          categories: true,
          _count: {
            select: {
              sections: true,
              presentations: true,
              attendances: true
            }
          }
        },
        orderBy,
        skip,
        take: Number(limit)
      }),
      prisma.conference.count({ where })
    ]);

    // Format response
    const totalPages = Math.ceil(totalCount / Number(limit));

    res.json({
      conferences,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalCount,
        hasMore: Number(page) < totalPages
      }
    });
  } catch (error: any) {
    console.error("Error fetching public conferences:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get conference details with hierarchical structure
export const getConferenceDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get authenticated user if available (optional)
    const userId = req.user?.id;

    // Fetch conference with all related data
    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            organization: true
          }
        },
        categories: true,
        presentationTypes: true,
        days: {
          orderBy: {
            date: 'asc'
          },
          include: {
            sections: {
              orderBy: {
                startTime: 'asc'
              },
              include: {
                category: true,
                timeSlots: {
                  orderBy: {
                    startTime: 'asc'
                  },
                  include: {
                    presentation: {
                      include: {
                        authors: {
                          orderBy: {
                            order: 'asc'
                          },
                          include: {
                            internalUser: {
                              select: {
                                id: true,
                                name: true,
                                organization: true
                              }
                            }
                          }
                        },
                        category: true,
                        presentationType: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        materials: {
          where: {
            isPublic: true
          }
        },
        _count: {
          select: {
            attendances: true
          }
        }
      }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    // Check if conference is published or user is the creator
    if (conference.status !== 'published' && conference.createdById !== userId) {
      res.status(403).json({ message: "You don't have permission to view this conference" });
      return;
    }

    // If user is authenticated, check if they've favorited/registered
    let userInteractions = null;
    if (userId) {
      userInteractions = await prisma.$transaction([
        prisma.conferenceFavorite.findUnique({
          where: {
            userId_conferenceId: {
              userId,
              conferenceId: Number(id)
            }
          },
          select: { id: true }
        }),
        prisma.attendance.findFirst({
          where: {
            userId,
            conferenceId: Number(id)
          },
          select: { id: true, status: true }
        })
      ]);
    }

    // Format response with user-specific data
    res.json({
      ...conference,
      userInteractions: userInteractions ? {
        isFavorited: !!userInteractions[0],
        isRegistered: !!userInteractions[1],
        registrationStatus: userInteractions[1]?.status
      } : null
    });
  } catch (error: any) {
    console.error("Error fetching conference details:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get popular/featured conferences
export const getFeaturedConferences = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get most popular conferences based on registrations
    const popularConferences = await prisma.conference.findMany({
      where: {
        status: ConferenceStatus.published,
        isPublic: true,
        startDate: { gte: new Date() } // Upcoming conferences
      },
      include: {
        categories: true,
        createdBy: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            attendances: true
          }
        }
      },
      orderBy: {
        attendances: {
          _count: 'desc'
        }
      },
      take: 5
    });

    // Get upcoming conferences
    const upcomingConferences = await prisma.conference.findMany({
      where: {
        status: ConferenceStatus.published,
        isPublic: true,
        startDate: { 
          gte: new Date(),
          lte: new Date(new Date().setDate(new Date().getDate() + 30)) // Next 30 days
        }
      },
      include: {
        categories: true,
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      },
      take: 5
    });

    res.json({
      popular: popularConferences,
      upcoming: upcomingConferences
    });
  } catch (error: any) {
    console.error("Error fetching featured conferences:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get categories for filtering
export const getConferenceCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get all unique categories across conferences
    const categories = await prisma.category.findMany({
      where: {
        conference: {
          status: ConferenceStatus.published,
          isPublic: true
        }
      },
      distinct: ['name'],
      select: {
        name: true,
        color: true
      }
    });

    res.json(categories);
  } catch (error: any) {
    console.error("Error fetching conference categories:", error);
    res.status(500).json({ message: error.message });
  }
};