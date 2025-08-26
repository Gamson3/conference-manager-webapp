import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { getUserId } from "../utils/authHelper";


// Toggle a presentation as favorite for the current user
export const togglePresentationFavorite = async (req: Request, res: Response): Promise<void> => {
  try {
    const { presentationId } = req.params;
    const { isFavorite } = req.body;
    const userId = getUserId(req);
    
    if (userId === null) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Check if presentation exists
    const presentation = await prisma.presentation.findUnique({
      where: { id: Number(presentationId) }
    });

    if (!presentation) {
      res.status(404).json({ message: "Presentation not found" });
      return;
    }

    if (isFavorite) {
      // Add to favorites
      await prisma.presentationFavorite.upsert({
        where: {
          userId_presentationId: {
            userId,
            presentationId: Number(presentationId)
          }
        },
        update: {},
        create: {
          userId,
          presentationId: Number(presentationId)
        }
      });
    } else {
      // Remove from favorites
      await prisma.presentationFavorite.deleteMany({
        where: {
          userId,
          presentationId: Number(presentationId)
        }
      });
    }

    res.status(200).json({ 
      id: Number(presentationId),
      success: true 
    });
  } catch (error: any) {
    console.error("Error toggling presentation favorite:", error);
    res.status(500).json({ message: error.message });
  }
};

export const toggleConferenceFavorite = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conferenceId } = req.params;
    const { isFavorite } = req.body;
    const userId = getUserId(req);
    
    if (userId === null) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Check if conference exists
    const conference = await prisma.conference.findUnique({
      where: { id: Number(conferenceId) }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    if (isFavorite) {
      // Add to favorites
      await prisma.conferenceFavorite.upsert({
        where: {
          userId_conferenceId: {
            userId,
            conferenceId: Number(conferenceId)
          }
        },
        update: {},
        create: {
          userId,
          conferenceId: Number(conferenceId)
        }
      });
    } else {
      // Remove from favorites
      await prisma.conferenceFavorite.deleteMany({
        where: {
          userId,
          conferenceId: Number(conferenceId)
        }
      });
    }

    res.status(200).json({ 
      id: Number(conferenceId),
      success: true 
    });
  } catch (error: any) {
    console.error("Error toggling conference favorite:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get all favorite conferences for the current user
export const getUserFavoriteConferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    
    if (userId === null) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const favoriteConferences = await prisma.conferenceFavorite.findMany({
      where: {
        userId
      },
      include: {
        conference: {
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
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Return just the conference data
    const conferences = favoriteConferences.map(fav => fav.conference);
    res.json(conferences);
  } catch (error: any) {
    console.error("Error fetching favorite conferences:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get all favorite presentations for the current user
export const getUserFavoritePresentations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    
    if (userId === null) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const favoritePresentations = await prisma.presentationFavorite.findMany({
      where: { userId },
      include: {
        presentation: {
          include: {
            conference: {
              select: {
                id: true,
                name: true
              }
            },
            authors: {
              where: {
                isPresenter: true
              },
              select: {
                id: true,
                authorName: true,
                isPresenter: true
              }
            },
            category: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(favoritePresentations);
  } catch (error: any) {
    console.error("Error fetching favorite presentations:", error);
    res.status(500).json({ message: error.message });
  }
};