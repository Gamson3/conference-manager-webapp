import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
// CHANGED: use helpers for unified auth + userContext
import { requireAuth, getUserId, buildUserContext } from "../utils/authHelper";

const prisma = new PrismaClient();

// Get attendee profile (Authenticated)
export const getAttendeeProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // CHANGED: requireAuth instead of getUserCognitoId + user lookup by cognitoId
    const userId = requireAuth(req, res);
    if (!userId) return;

    const user = await prisma.user.findUnique({
      where: { id: userId }, // CHANGED
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        profileImage: true,
        phoneNumber: true,
        address: true,
        organization: true,
        jobTitle: true,
        socialLinks: true,
        interests: true,          // CHANGED: include interests for consistency
        preferences: true,        // CHANGED: include preferences for consistency
        createdAt: true,
        updatedAt: true,          // CHANGED: include updatedAt for parity
      }
    });

    if (!user) {
      res.status(404).json({ message: "User not found", userContext: buildUserContext(req) }); // CHANGED: append userContext
      return;
    }

    // CHANGED: append userContext
    res.json({ user, userContext: buildUserContext(req) });
  } catch (error: any) {
    console.error("Error fetching attendee profile:", error);
    res.status(500).json({ message: "Failed to fetch profile", error: error.message, userContext: buildUserContext(req) }); // CHANGED
  }
};

// Update attendee profile (Authenticated)
export const updateAttendeeProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // CHANGED: requireAuth instead of cognito-based lookup
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { 
      name, bio, phoneNumber, address, 
      organization, jobTitle, socialLinks, 
      interests,
      preferences
    } = req.body;

    const updateData: any = {
      name,
      bio,
      phoneNumber,
      address,
      organization,
      jobTitle,
      socialLinks
    };

    if (interests !== undefined) {
      updateData.interests = Array.isArray(interests) ? interests : [interests];
    }
    if (preferences !== undefined) {
      updateData.preferences = preferences;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId }, // CHANGED
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        profileImage: true,
        phoneNumber: true,
        address: true,
        organization: true,
        jobTitle: true,
        socialLinks: true,
        interests: true,
        preferences: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log('[DEBUG] Updated user profile:', {
      userId: updatedUser.id,
      name: updatedUser.name,
      interests: updatedUser.interests,
      preferences: updatedUser.preferences
    });

    // CHANGED: append userContext
    res.json({ user: updatedUser, userContext: buildUserContext(req) });
  } catch (error: any) {
    console.error("Error updating attendee profile:", error);
    res.status(500).json({ message: "Failed to update profile", error: error.message, userContext: buildUserContext(req) }); // CHANGED
  }
};

// Get dashboard statistics (Authenticated)
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // CHANGED: requireAuth + use userId directly
    const userId = requireAuth(req, res);
    if (!userId) return;

    const now = new Date();

    const [
      totalRegistered,
      upcomingConferences,
      completedConferences,
      favoritePresentations
    ] = await Promise.all([
      prisma.attendance.count({
        where: { userId }
      }),
      prisma.attendance.count({
        where: {
          userId,
          conference: { startDate: { gt: now } }
        }
      }),
      prisma.attendance.count({
        where: {
          userId,
          conference: { endDate: { lt: now } }
        }
      }),
      prisma.presentationFavorite.count({
        where: { userId }
      })
    ]);

    const stats = {
      upcomingConferences,
      registeredConferences: totalRegistered,
      completedConferences,
      favoritePresentations,
      unreadMaterials: 0,
      pendingFeedback: 0,
      connections: 0,
      notifications: 0
    };

    // CHANGED: append userContext
    res.json({ stats, userContext: buildUserContext(req) });
  } catch (error: any) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats", error: error.message, userContext: buildUserContext(req) }); // CHANGED
  }
};

// Get recent conferences (Authenticated)
export const getRecentConferences = async (req: Request, res: Response): Promise<void> => {
  try {
    // CHANGED: requireAuth + use userId directly
    const userId = requireAuth(req, res);
    if (!userId) return;

    const recentConferences = await prisma.attendance.findMany({
      where: { userId },
      include: {
        conference: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            location: true,
            status: true
          }
        }
      },
      orderBy: {
        conference: { startDate: 'desc' }
      },
      take: 5
    });

    const formattedConferences = recentConferences.map(attendance => ({
      id: attendance.conference.id,
      name: attendance.conference.name,
      date: attendance.conference.startDate,
      location: attendance.conference.location,
      status: attendance.conference.startDate > new Date() ? 'upcoming' : 
              attendance.conference.endDate < new Date() ? 'completed' : 'active'
    }));

    // CHANGED: append userContext
    res.json({ conferences: formattedConferences, userContext: buildUserContext(req) });
  } catch (error: any) {
    console.error("Error fetching recent conferences:", error);
    res.status(500).json({ message: "Failed to fetch recent conferences", error: error.message, userContext: buildUserContext(req) }); // CHANGED
  }
};

// Register for conference (Authenticated)
export const registerForConference = async (req: Request, res: Response): Promise<void> => {
  try {
    // CHANGED: requireAuth + use userId directly
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { conferenceId } = req.body as { conferenceId: number };
    if (!conferenceId) {
      res.status(400).json({ message: "conferenceId is required", userContext: buildUserContext(req) }); // CHANGED
      return;
    }

    const conference = await prisma.conference.findUnique({
      where: { id: Number(conferenceId) }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found", userContext: buildUserContext(req) }); // CHANGED
      return;
    }

    const existingAttendance = await prisma.attendance.findFirst({
      where: { userId, conferenceId: Number(conferenceId) }
    });

    if (existingAttendance) {
      res.status(400).json({ message: "Already registered for this conference", userContext: buildUserContext(req) }); // CHANGED
      return;
    }

    const attendance = await prisma.attendance.create({
      data: {
        userId,
        conferenceId: Number(conferenceId),
        status: "registered"
      }
    });

    // CHANGED: append userContext
    res.json({ message: "Successfully registered for conference", attendance, userContext: buildUserContext(req) });
  } catch (error: any) {
    console.error("Error registering for conference:", error);
    res.status(500).json({ message: "Failed to register for conference", error: error.message, userContext: buildUserContext(req) }); // CHANGED
  }
};

// Unregister (Authenticated)
export const cancelConferenceRegistration = async (req: Request, res: Response): Promise<void> => {
  try {
    // CHANGED: requireAuth + use userId directly
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { conferenceId } = req.params;
    if (!conferenceId) {
      res.status(400).json({ message: "conferenceId param is required", userContext: buildUserContext(req) }); // CHANGED
      return;
    }

    const attendance = await prisma.attendance.findFirst({
      where: { userId, conferenceId: Number(conferenceId) }
    });

    if (!attendance) {
      res.status(404).json({ message: "Registration not found", userContext: buildUserContext(req) }); // CHANGED
      return;
    }

    await prisma.attendance.delete({ where: { id: attendance.id } });

    // CHANGED: append userContext
    res.json({ message: "Successfully unregistered from conference", userContext: buildUserContext(req) });
  } catch (error: any) {
    console.error("Error unregistering from conference:", error);
    res.status(500).json({ message: "Failed to unregister", error: error.message, userContext: buildUserContext(req) }); // CHANGED
  }
};

// Get attendee's registered conferences (Authenticated)
export const getRegisteredConferences = async (req: Request, res: Response): Promise<void> => {
  try {
    // CHANGED: requireAuth + use userId directly
    const userId = requireAuth(req, res);
    if (!userId) return;

    const registeredConferences = await prisma.attendance.findMany({
      where: { userId },
      include: {
        conference: {
          select: {
            id: true,
            name: true,
            description: true,
            startDate: true,
            endDate: true,
            location: true,
            status: true,
            venue: true,
            capacity: true,
            websiteUrl: true,
            createdBy: { select: { name: true } }
          }
        }
      },
      orderBy: { conference: { startDate: 'desc' } }
    });

    const formattedConferences = registeredConferences.map(attendance => {
      const conference = attendance.conference;
      const now = new Date();

      let status: 'upcoming' | 'active' | 'past';
      if (conference.startDate > now) status = 'upcoming';
      else if (conference.endDate < now) status = 'past';
      else status = 'active';
      
      return {
        id: conference.id,
        title: conference.name,
        description: conference.description,
        startDate: conference.startDate,
        endDate: conference.endDate,
        location: conference.location,
        organizer: conference.createdBy.name,
        registrationDate: attendance.registeredAt,
        registrationId: `REG-${attendance.id}`,
        status
      };
    });

    // CHANGED: append userContext
    res.json({ conferences: formattedConferences, userContext: buildUserContext(req) });
  } catch (error: any) {
    console.error("Error fetching registered conferences:", error);
    res.status(500).json({ message: "Failed to fetch registered conferences", error: error.message, userContext: buildUserContext(req) }); // CHANGED
  }
};

// Get attendee's favorite presentations (Authenticated)
export const getFavoritesPresentations = async (req: Request, res: Response): Promise<void> => {
  try {
    // CHANGED: requireAuth + use userId directly
    const userId = requireAuth(req, res);
    if (!userId) return;

    const favorites = await prisma.presentationFavorite.findMany({
      where: { userId },
      include: {
        presentation: {
          include: {
            authors: {
              select: {
                id: true,
                authorName: true,
                affiliation: true,
                isPresenter: true
              }
            },
            section: {
              include: {
                day: {
                  include: {
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
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // CHANGED: append userContext
    res.json({ favorites, userContext: buildUserContext(req) });
  } catch (error: any) {
    console.error("Error fetching favorite presentations:", error);
    res.status(500).json({ message: "Failed to fetch favorite presentations", error: error.message, userContext: buildUserContext(req) }); // CHANGED
  }
};

// Bulk favorites status for presentations (Authenticated)
export const getFavoriteStatusBulk = async (req: Request, res: Response): Promise<void> => {
  try {
    // CHANGED: requireAuth + use userId directly
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { presentationIds } = req.body as { presentationIds: number[] };
    if (!Array.isArray(presentationIds)) {
      res.status(400).json({ message: "presentationIds must be an array", userContext: buildUserContext(req) }); // CHANGED
      return;
    }

    const favorites = await prisma.presentationFavorite.findMany({
      where: {
        userId,
        presentationId: { in: presentationIds.map(Number) }
      },
      select: { presentationId: true }
    });

    const favoriteMap = favorites.reduce((acc, fav) => {
      acc[fav.presentationId] = true;
      return acc;
    }, {} as Record<number, boolean>);

    const result = presentationIds.reduce((acc: Record<number, boolean>, id: number) => {
      acc[id] = favoriteMap[id] || false;
      return acc;
    }, {});

    // CHANGED: append userContext
    res.json({ status: result, userContext: buildUserContext(req) });
  } catch (error: any) {
    console.error("Error fetching bulk favorite status:", error);
    res.status(500).json({ message: "Failed to fetch favorite status", error: error.message, userContext: buildUserContext(req) }); // CHANGED
  }
};

// Get conference details with people information (Optional auth)
export const getConferenceWithPeople = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // CHANGED: use getUserId for optional auth
    const userId = getUserId(req);

    let isRegistered = false;
    let isFavorited = false;

    if (userId) {
      // CHANGED: use userId directly, and correct favorites model
      const [attendance, favorite] = await prisma.$transaction([
        prisma.attendance.findFirst({
          where: { userId, conferenceId: Number(id) },
          select: { id: true }
        }),
        prisma.conferenceFavorite.findFirst({
          where: { userId, conferenceId: Number(id) },
          select: { id: true }
        })
      ]);
      isRegistered = !!attendance;
      isFavorited = !!favorite;
    }

    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            jobTitle: true,
            organization: true,
            bio: true,
            profileImage: true
          }
        },
        days: {
          include: {
            sections: {
              include: {
                presentations: {
                  include: {
                    authors: {
                      where: { isPresenter: true },
                      include: {
                        internalUser: {
                          select: {
                            id: true,
                            name: true,
                            email: true,
                            organization: true,
                            jobTitle: true,
                            bio: true,
                            profileImage: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found", userContext: buildUserContext(req) }); // CHANGED
      return;
    }

    // Extract unique presenters (unchanged)
    const presentersMap = new Map();
    conference.days.forEach(day => {
      day.sections.forEach(section => {
        section.presentations.forEach(presentation => {
          presentation.authors.forEach(author => {
            if (author.isPresenter) {
              const key = author.authorEmail || author.id;
              if (!presentersMap.has(key)) {
                presentersMap.set(key, {
                  id: author.id,
                  name: author.authorName,
                  email: author.authorEmail,
                  affiliation: author.affiliation,
                  profilePicture: author.internalUser?.profileImage,
                  bio: author.internalUser?.bio,
                  organization: author.internalUser?.organization,
                  presentations: []
                });
              }
              presentersMap.get(key).presentations.push({
                id: presentation.id,
                title: presentation.title
              });
            }
          });
        });
      });
    });

    const presenters = Array.from(presentersMap.values());

    const response = {
      id: conference.id,
      title: conference.name,
      name: conference.name,
      description: conference.description || "",
      startDate: conference.startDate,
      endDate: conference.endDate,
      location: conference.location || "",
      topics: conference.topics || [],
      websiteUrl: conference.websiteUrl,
      venue: conference.venue,
      capacity: conference.capacity,
      status: conference.status,
      organizers: [
        {
          id: conference.createdBy.id,
          name: conference.createdBy.name,
          email: conference.createdBy.email,
          title: conference.createdBy.jobTitle,
          organization: conference.createdBy.organization,
          bio: conference.createdBy.bio,
          profilePicture: conference.createdBy.profileImage
        }
      ],
      presenters,
      userInteractions: {
        isRegistered, // false for guests
        isFavorited
      },
      // CHANGED: standardized userContext
      userContext: buildUserContext(req)
    };

    res.json(response);
  } catch (error: any) {
    console.error("Error fetching conference details:", error);
    res.status(500).json({ message: "Failed to fetch conference details", error: error.message, userContext: buildUserContext(req) }); // CHANGED
  }
};

// Discover conferences (public/optional)
export const discoverConferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req); // null for guests
    const {
      page = 1,
      limit = 10,
      search,
      topics,
      status,
      includeCallForPapers = false,
      category,               // CHANGED: support category filter
      sort = "startDate",     // CHANGED: support sort field
      order = "asc"           // CHANGED: support sort order
    } = req.query as any;

    const skip = (Number(page) - 1) * Number(limit);
    const now = new Date();

    const whereClause: any = { isPublic: true, endDate: { gte: now } };
    if (includeCallForPapers === 'true' || status === 'call_for_papers') {
      whereClause.status = { in: ['published', 'call_for_papers'] };
    } else {
      whereClause.status = 'published';
    }
    if (search) {
      whereClause.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
        { location: { contains: String(search), mode: 'insensitive' } }
      ];
    }
    if (topics && typeof topics === 'string') {
      whereClause.topics = { hasSome: (topics as string).split(',').map((t) => t.trim()) };
    }
    // CHANGED: filter by category name (case-insensitive)
    if (category && typeof category === "string" && category.trim() && category !== "all") {
      whereClause.categories = {
        some: { name: { equals: category.trim(), mode: "insensitive" } }
      };
    }

    // CHANGED: map sort + order to Prisma orderBy
    const allowedSort: Record<string, "name" | "startDate" | "createdAt"> = {
      name: "name",
      startDate: "startDate",
      createdAt: "createdAt"
    };
    const sortField: "name" | "startDate" | "createdAt" =
      allowedSort[String(sort)] || "startDate";
    const sortOrder: "asc" | "desc" =
      String(order).toLowerCase() === "desc" ? "desc" : "asc";

    const [conferences, total] = await Promise.all([
      prisma.conference.findMany({
        where: whereClause,
        include: {
          createdBy: { select: { id: true, name: true, organization: true } },
          submissionSettings: { select: { submissionDeadline: true, allowLateSubmissions: true } },
          categories: { select: { id: true, name: true, color: true } }, // CHANGED: include categories
          _count: { select: { attendances: true } },
          attendances: userId ? { where: { userId }, select: { id: true } } : undefined,
          favorites: userId ? { where: { userId }, select: { id: true } } : undefined
        },
        skip,
        take: Number(limit),
        orderBy: [{ [sortField]: sortOrder }, { createdAt: "desc" }] // CHANGED
      }),
      prisma.conference.count({ where: whereClause })
    ]);

    const formattedConferences = conferences.map((conf) => ({
      id: conf.id,
      name: conf.name,
      description: conf.description,
      location: conf.location,
      startDate: conf.startDate,
      endDate: conf.endDate,
      status: conf.status,
      bannerImageUrl: (conf as any).bannerImageUrl ?? undefined,
      createdBy: conf.createdBy,
      submissionSettings: conf.submissionSettings,
      categories: conf.categories, // CHANGED: pass through categories for card
      _count: conf._count,
      userInteractions: {
        isFavorited: userId ? !!(conf.favorites && conf.favorites.length > 0) : false,
        isRegistered: userId ? !!(conf.attendances && conf.attendances.length > 0) : false
      }
    }));

    res.json({
      conferences: formattedConferences,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      },
      userContext: buildUserContext(req)
    });
  } catch (error: any) {
    console.error("Error fetching conferences:", error);
    res.status(500).json({ message: "Failed to fetch conferences", error: error.message });
  }
};

// Get networking data (Authenticated)
export const getNetworkingData = async (req: Request, res: Response): Promise<void> => {
  try {
    // CHANGED: requireAuth + use userId directly
    const userId = requireAuth(req, res);
    if (!userId) return;

    const userConferences = await prisma.attendance.findMany({
      where: { userId },
      select: { conferenceId: true }
    });

    const conferenceIds = userConferences.map(att => att.conferenceId);

    const attendees = await prisma.attendance.findMany({
      where: {
        conferenceId: { in: conferenceIds },
        userId: { not: userId } // Exclude current user
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            bio: true,
            profileImage: true,
            organization: true,
            jobTitle: true
          }
        },
        conference: {
          select: { id: true, name: true }
        }
      }
    });

    const conferences = await prisma.conference.findMany({
      where: { id: { in: conferenceIds } },
      select: { id: true, name: true }
    });

    // Group attendees by user to avoid duplicates
    const uniqueAttendees = attendees.reduce((acc, attendance) => {
      const uid = attendance.user.id;
      if (!acc[uid]) {
        acc[uid] = {
          id: attendance.user.id,
          name: attendance.user.name,
          title: attendance.user.jobTitle || '',
          organization: attendance.user.organization || '',
          bio: attendance.user.bio || '',
          location: '',
          avatarUrl: attendance.user.profileImage || '',
          interests: [],
          isConnected: false,
          isPending: false,
          conferenceIds: [attendance.conference.id]
        };
      } else {
        acc[uid].conferenceIds.push(attendance.conference.id);
      }
      return acc;
    }, {} as any);

    // CHANGED: append userContext
    res.json({
      attendees: Object.values(uniqueAttendees),
      conferences,
      userContext: buildUserContext(req)
    });
  } catch (error: any) {
    console.error("Error fetching networking data:", error);
    res.status(500).json({ message: "Failed to fetch networking data", error: error.message, userContext: buildUserContext(req) }); // CHANGED
  }
};

// GET /api/conferences/:id/participants - Get conference organizers and presenters (Optional auth)
export const getConferenceParticipants = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            organization: true,
            bio: true,
            profileImage: true
          }
        },
        days: {
          include: {
            sections: {
              include: {
                presentations: {
                  include: {
                    authors: {
                      where: { isPresenter: true },
                      include: {
                        internalUser: {
                          select: {
                            id: true,
                            name: true,
                            email: true,
                            organization: true,
                            bio: true,
                            profileImage: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!conference) {
      res.status(404).json({ message: 'Conference not found', userContext: buildUserContext(req) }); // CHANGED
      return;
    }

    const participants: any[] = [];

    // Add organizer
    if (conference.createdBy) {
      participants.push({
        id: conference.createdBy.id,
        name: conference.createdBy.name,
        email: conference.createdBy.email,
        role: 'organizer',
        organization: conference.createdBy.organization,
        bio: conference.createdBy.bio,
        profileImage: conference.createdBy.profileImage
      });
    }

    // Add presenters (unique)
    const presentersMap = new Map();
    conference.days.forEach(day => {
      day.sections.forEach(section => {
        section.presentations.forEach(presentation => {
          presentation.authors.forEach(author => {
            if (author.isPresenter) {
              const key = author.authorEmail || author.id;
              if (!presentersMap.has(key)) {
                presentersMap.set(key, {
                  id: author.id,
                  name: author.authorName,
                  email: author.authorEmail,
                  role: 'presenter',
                  affiliation: author.affiliation,
                  bio: author.internalUser?.bio,
                  profileImage: author.internalUser?.profileImage,
                  presentationCount: 1
                });
              } else {
                presentersMap.get(key).presentationCount++;
              }
            }
          });
        });
      });
    });

    participants.push(...Array.from(presentersMap.values()));

    // CHANGED: append userContext
    res.json({ participants, userContext: buildUserContext(req) });
  } catch (error: any) {
    console.error('Error fetching conference participants:', error);
    res.status(500).json({ message: 'Failed to fetch participants', error: error.message, userContext: buildUserContext(req) }); // CHANGED
  }
};