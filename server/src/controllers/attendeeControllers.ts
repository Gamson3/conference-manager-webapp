import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getUserCognitoId, getUserId } from "../utils/authHelper";

const prisma = new PrismaClient();

// Get attendee profile
export const getAttendeeProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const cognitoId = getUserCognitoId(req);

    if (!cognitoId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { cognitoId },
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
        createdAt: true
      }
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(user);
  } catch (error: any) {
    console.error("Error fetching attendee profile:", error);
    res.status(500).json({ message: "Failed to fetch profile", error: error.message });
  }
};

// Update attendee profile
export const updateAttendeeProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const cognitoId = getUserCognitoId(req);
    const { 
      name, bio, phoneNumber, address, 
      organization, jobTitle, socialLinks, 
      interests, // ADD: Support for interests
      preferences // ADD: Support for notification preferences
    } = req.body;

    if (!cognitoId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Prepare update data
    const updateData: any = {
      name,
      bio,
      phoneNumber,
      address,
      organization,
      jobTitle,
      socialLinks
    };

    // Handle interests (convert array to JSON or string)
    if (interests) {
      updateData.interests = Array.isArray(interests) ? interests : [interests];
    }

    // Handle preferences (store as JSON)
    if (preferences) {
      updateData.preferences = preferences;
    }

    const updatedUser = await prisma.user.update({
      where: { cognitoId },
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

    res.json(updatedUser);
  } catch (error: any) {
    console.error("Error updating attendee profile:", error);
    res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
};

// Get dashboard statistics
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const cognitoId = getUserCognitoId(req);

    if (!cognitoId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { cognitoId }
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const now = new Date();

    // Get attendance and favorites statistics
    const [
      totalRegistered,
      upcomingConferences,
      completedConferences,
      favoritePresentations
    ] = await Promise.all([
      prisma.attendance.count({
        where: { userId: user.id }
      }),
      prisma.attendance.count({
        where: {
          userId: user.id,
          conference: {
            startDate: { gt: now }
          }
        }
      }),
      prisma.attendance.count({
        where: {
          userId: user.id,
          conference: {
            endDate: { lt: now }
          }
        }
      }),
      prisma.presentationFavorite.count({
        where: { userId: user.id }
      })
    ]);

    const stats = {
      upcomingConferences,
      registeredConferences: totalRegistered,
      completedConferences,
      favoritePresentations,
      unreadMaterials: 0, // You can implement this based on your needs
      pendingFeedback: 0, // You can implement this based on your needs
      connections: 0, // You can implement this based on your needs
      notifications: 0 // You can implement this based on your needs
    };

    res.json(stats);
  } catch (error: any) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats", error: error.message });
  }
};

// Get recent conferences
export const getRecentConferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const cognitoId = getUserCognitoId(req);

    if (!cognitoId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { cognitoId }
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const recentConferences = await prisma.attendance.findMany({
      where: { userId: user.id },
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
        conference: {
          startDate: 'desc'
        }
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

    res.json(formattedConferences);
  } catch (error: any) {
    console.error("Error fetching recent conferences:", error);
    res.status(500).json({ message: "Failed to fetch recent conferences", error: error.message });
  }
};

// Register for conference
export const registerForConference = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conferenceId } = req.body;
    const cognitoId = getUserCognitoId(req);

    if (!cognitoId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { cognitoId }
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Check if conference exists
    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    // Check if already registered
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        conferenceId: conferenceId
      }
    });

    if (existingAttendance) {
      res.status(400).json({ message: "Already registered for this conference" });
      return;
    }

    // Create attendance record
    const attendance = await prisma.attendance.create({
      data: {
        userId: user.id,
        conferenceId: conferenceId,
        status: "registered"
      }
    });

    res.json({ message: "Successfully registered for conference", attendance });
  } catch (error: any) {
    console.error("Error registering for conference:", error);
    res.status(500).json({ message: "Failed to register for conference", error: error.message });
  }
};


// ADD: Unregister endpoint
export const cancelConferenceRegistration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conferenceId } = req.params;
    const cognitoId = getUserCognitoId(req);

    if (!cognitoId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { cognitoId }
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Check if registration exists
    const attendance = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        conferenceId: Number(conferenceId)
      }
    });

    if (!attendance) {
      res.status(404).json({ message: "Registration not found" });
      return;
    }

    // Delete the attendance record
    await prisma.attendance.delete({
      where: { id: attendance.id }
    });

    res.json({ message: "Successfully unregistered from conference" });
  } catch (error: any) {
    console.error("Error unregistering from conference:", error);
    res.status(500).json({ message: "Failed to unregister", error: error.message });
  }
};

// Get attendee's registered conferences
export const getRegisteredConferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const cognitoId = getUserCognitoId(req);

    if (!cognitoId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { cognitoId }
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const registeredConferences = await prisma.attendance.findMany({
      where: { userId: user.id },
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
            createdBy: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        conference: {
          startDate: 'desc'
        }
      }
    });

    const formattedConferences = registeredConferences.map(attendance => {
      const conference = attendance.conference;
      const now = new Date();

      let status: 'upcoming' | 'active' | 'past';
      if (conference.startDate > now) {
        status = 'upcoming';
      } else if (conference.endDate < now) {
        status = 'past';
      } else {
        status = 'active';
      }
      
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

    res.json(formattedConferences);
  } catch (error: any) {
    console.error("Error fetching registered conferences:", error);
    res.status(500).json({ message: "Failed to fetch registered conferences", error: error.message });
  }
};

// Get attendee's favorite presentations
export const getFavoritesPresentations = async (req: Request, res: Response): Promise<void> => {
  try {
    const cognitoId = getUserCognitoId(req);

    if (!cognitoId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { cognitoId }
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const favorites = await prisma.presentationFavorite.findMany({
      where: { userId: user.id },
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
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(favorites);
  } catch (error: any) {
    console.error("Error fetching favorite presentations:", error);
    res.status(500).json({ message: "Failed to fetch favorite presentations", error: error.message });
  }
};

// ADD: Missing bulk favorites status function
export const getFavoriteStatusBulk = async (req: Request, res: Response): Promise<void> => {
  try {
    const { presentationIds } = req.body;
    const cognitoId = getUserCognitoId(req);

    if (!cognitoId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { cognitoId }
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (!Array.isArray(presentationIds)) {
      res.status(400).json({ message: "presentationIds must be an array" });
      return;
    }

    const favorites = await prisma.presentationFavorite.findMany({
      where: {
        userId: user.id,
        presentationId: { in: presentationIds.map(Number) }
      },
      select: {
        presentationId: true
      }
    });

    const favoriteMap = favorites.reduce((acc, fav) => {
      acc[fav.presentationId] = true;
      return acc;
    }, {} as Record<number, boolean>);

    // Return status for all requested presentations
    const result = presentationIds.reduce((acc: Record<number, boolean>, id: number) => {
      acc[id] = favoriteMap[id] || false;
      return acc;
    }, {});

    res.json(result);
  } catch (error: any) {
    console.error("Error fetching bulk favorite status:", error);
    res.status(500).json({ message: "Failed to fetch favorite status", error: error.message });
  }
};


// Get conference details with people information
export const getConferenceWithPeople = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const cognitoId = getUserCognitoId(req); // Will be null for guests
    
    let user = null;
    let isRegistered = false;
    
    // Only check registration status for authenticated users
    if (cognitoId) {
      // Authenticated user logic
      console.log('[BACKEND DEBUG] Looking up user with cognitoId:', cognitoId);

      user = await prisma.user.findUnique({
        where: { cognitoId },
        include: {
          attendances: {
            where: { conferenceId: Number(id) }
          }
        }
      });

      console.log('[BACKEND DEBUG] User found:', {
        userId: user?.id || 'null',
        userName: user?.name || 'null',
        attendanceCount: user?.attendances?.length || 0
      });
      
      // FIX: Add proper null checking for attendances
      isRegistered = !!(user?.attendances && user.attendances.length > 0);
    }else {
      console.log('[BACKEND DEBUG] No cognitoId - treating as guest');
    }

    // Get conference with all related data
    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      include: {
        // Get organizer (conference creator)
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
        // Get all presenters from presentations
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
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    // Extract unique presenters
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

    // Format response
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
      isRegistered,   // Will be false for guests
      userContext: {
        isAuthenticated: !!user,    // true for auth users, false for guests
        userRole: user ? 'attendee' : 'guest',
        userId: user?.id || null,
        // ADD: Debug info
        debug: {
          cognitoIdReceived: !!cognitoId,
          userFoundInDb: !!user
        }
      }
    };
    console.log('[BACKEND DEBUG] Final response userContext:', response.userContext);
    res.json(response);
  } catch (error: any) {
    console.error("Error fetching conference details:", error);
    res.status(500).json({ message: "Failed to fetch conference details", error: error.message });
  }
};

// Discover conferences (public conferences)
export const discoverConferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, search, topics, status } = req.query;
    
    // GET OPTIONAL USER INFO (if authenticated) from optional auth middleware
    const cognitoId = getUserCognitoId(req); // This will return null for guest users
    let userId = null;
    
    if (cognitoId) {
      const user = await prisma.user.findUnique({
        where: { cognitoId }
      });
      userId = user?.id;
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    const now = new Date();
    
    let whereClause: any = {
      status: 'published',   // Only show published conferences
      endDate: { gte: now }  // Exclude conferences that have already ended
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { location: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (topics) {
      const topicsArray = (topics as string).split(',');
      whereClause.topics = {
        hasSome: topicsArray
      };
    }

    if (status) {
      if (status === 'upcoming') {
        whereClause.startDate = { gt: now };
        // Remove the endDate filter for upcoming since we already filter by startDate
        delete whereClause.endDate;
      } else if (status === 'ongoing') {
        whereClause.AND = [
          { startDate: { lte: now } },
          { endDate: { gte: now } }
        ];
        // Remove the default endDate filter
        delete whereClause.endDate;
      } else if (status === 'past') {
        // Only show past conferences if explicitly requested
        whereClause.endDate = { lt: now };
      }
    }

    const [conferences, total] = await Promise.all([
      prisma.conference.findMany({
        where: whereClause,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true, 
              organization: true
            }
          },
          // // Include attendances only if user is authenticated
          // ...(userId && {
          //   attendances: {
          //     where: { userId },
          //     select: { id: true }
          //   }
          // }),
          _count: {
            select: {
              attendances: true
            }
          },
          // Always include attendances for authenticated users
          attendances: userId ? {
            where: { userId: userId },
            select: { id: true }
          } : undefined
        },
        skip,
        take: Number(limit),
        orderBy: [
          // Show upcoming conferences first
          { startDate: 'asc' },
          { createdAt: 'desc' }
        ] 
      }),
      prisma.conference.count({
        where: whereClause
      })
    ]);

    const formattedConferences = conferences.map(conference => ({
      id: conference.id,
      name: conference.name,
      description: conference.description,
      startDate: conference.startDate,
      endDate: conference.endDate,
      location: conference.location,
      venue: conference.venue,
      topics: conference.topics,
      organizer: conference.createdBy.name,
      attendeeCount: conference._count.attendances,
      capacity: conference.capacity,
      websiteUrl: conference.websiteUrl,
      // FIX: Ensure isRegistered is always included for all conferences
      isRegistered: userId ? (conference.attendances && conference.attendances.length > 0) : false
    }));

    console.log('[DISCOVER DEBUG] Response data:', {
      userAuthenticated: !!userId,
      conferencesCount: formattedConferences.length,
      firstConferenceRegistered: formattedConferences[0]?.isRegistered || false
    });

    res.json({
      conferences: formattedConferences,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      },
      // ADD: User context info
      userContext: {
        isAuthenticated: !!userId,
        userRole: userId ? 'attendee' : 'guest'
      }
    });
  } catch (error: any) {
    console.error("Error discovering conferences:", error);
    res.status(500).json({ message: "Failed to discover conferences", error: error.message });
  }
};

// Get networking data
export const getNetworkingData = async (req: Request, res: Response): Promise<void> => {
  try {
    const cognitoId = getUserCognitoId(req);

    if (!cognitoId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { cognitoId }
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Get attendees from conferences the user is registered for
    const userConferences = await prisma.attendance.findMany({
      where: { userId: user.id },
      select: { conferenceId: true }
    });

    const conferenceIds = userConferences.map(att => att.conferenceId);

    const attendees = await prisma.attendance.findMany({
      where: {
        conferenceId: { in: conferenceIds },
        userId: { not: user.id } // Exclude current user
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
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const conferences = await prisma.conference.findMany({
      where: { id: { in: conferenceIds } },
      select: {
        id: true,
        name: true
      }
    });

    // Group attendees by user to avoid duplicates
    const uniqueAttendees = attendees.reduce((acc, attendance) => {
      const userId = attendance.user.id;
      if (!acc[userId]) {
        acc[userId] = {
          id: attendance.user.id,
          name: attendance.user.name,
          title: attendance.user.jobTitle || '',
          organization: attendance.user.organization || '',
          bio: attendance.user.bio || '',
          location: '', // You can add location field to user model if needed
          avatarUrl: attendance.user.profileImage || '',
          interests: [], // You can add interests field to user model if needed
          isConnected: false, // You can implement connection logic
          isPending: false,
          conferenceIds: [attendance.conference.id]
        };
      } else {
        acc[userId].conferenceIds.push(attendance.conference.id);
      }
      return acc;
    }, {} as any);

    res.json({
      attendees: Object.values(uniqueAttendees),
      conferences
    });
  } catch (error: any) {
    console.error("Error fetching networking data:", error);
    res.status(500).json({ message: "Failed to fetch networking data", error: error.message });
  }
};

// GET /api/conferences/:id/participants - Get conference organizers and presenters
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
      res.status(404).json({ message: 'Conference not found' });
      return;
    }

    const participants = [];

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

    // Add presenters (unique ones)
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

    res.json(participants);
  } catch (error: any) {
    console.error('Error fetching conference participants:', error);
    res.status(500).json({ message: 'Failed to fetch participants', error: error.message });
  }
};