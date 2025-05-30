import { Request, Response } from "express";
import prisma from '../lib/prisma';


// Get all published conferences
export const getPublicConferences = async (req: Request, res: Response) => {
  try {
    const conferences = await prisma.conference.findMany({
      where: { 
        status: "published",
        isPublic: true 
      },
      orderBy: { startDate: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        startDate: true,
        endDate: true,
        location: true,
        venue: true,
        timezone: true,
        bannerImageUrl: true,
        topics: true,
      }
    });
    res.json(conferences);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get public conference details
export const getPublicConferenceDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const conference = await prisma.conference.findFirst({
      where: { 
        id: Number(id),
        status: "published",
        isPublic: true
      },
      include: {
        sections: {
          select: {
            id: true,
            name: true,
            description: true,
            startTime: true,
            endTime: true,
            room: true,
          }
        }
      }
    });
    
    if (!conference) {
       res.status(404).json({ message: "Conference not found" });
       return;
    }
    
    res.json(conference);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get public conference materials
export const getPublicConferenceMaterials = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const materials = await prisma.conferenceMaterial.findMany({
      where: { 
        conferenceId: Number(id),
        isPublic: true
      },
      orderBy: { uploadedAt: "desc" },
    });
    res.json(materials);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};