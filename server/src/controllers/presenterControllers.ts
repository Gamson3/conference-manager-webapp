import { Request, Response } from "express";
import { PrismaClient, PresentationStatus } from "@prisma/client";
import { getUserId } from "../utils/authHelper";

const prisma = new PrismaClient();

// Get all presentations for a presenter
export const getPresenterPresentations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    
    // Get presentations authored by the user
    const presentations = await prisma.presentationAuthor.findMany({
      where: {
        userId: userId,
      },
      include: {
        presentation: {
          include: {
            conference: {
              select: {
                name: true,
              },
            },
            section: {
              select: {
                name: true,
              },
            },
            timeSlot: {
              select: {
                startTime: true,
                endTime: true,
              },
            },
          },
        },
      },
    });
    
    // Format presentations for the response
    const formattedPresentations = presentations.map(authorEntry => {
      const pres = authorEntry.presentation;
      return {
        id: pres.id,
        title: pres.title,
        abstract: pres.abstract,
        status: pres.status,
        conferenceName: pres.conference.name,
        conferenceId: pres.conferenceId,
        startTime: pres.timeSlot?.startTime,
        endTime: pres.timeSlot?.endTime,
        section: pres.section?.name,
      };
    });
    
    res.status(200).json({ presentations: formattedPresentations });
  } catch (error) {
    console.error("Error getting presenter presentations:", error);
    res.status(500).json({ message: "Failed to get presentations" });
  }
};

// Get a single presentation by ID
export const getPresenterPresentation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const presentationId = parseInt(req.params.id);
    
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    
    // Check if presentation exists and user is an author
    const authorEntry = await prisma.presentationAuthor.findFirst({
      where: {
        userId: userId,
        presentationId: presentationId,
      },
      include: {
        presentation: {
          include: {
            conference: {
              select: {
                name: true,
              },
            },
            section: {
              select: {
                name: true,
              },
            },
            timeSlot: {
              select: {
                startTime: true,
                endTime: true,
              },
            },
            presentationType: {
              select: {
                name: true,
              },
            },
            materials: true,
          },
        },
      },
    });
    
    if (!authorEntry) {
      res.status(404).json({ message: "Presentation not found or you don't have access" });
      return;
    }
    
    const presentation = authorEntry.presentation;
    
    // Format presentation for response
    const formattedPresentation = {
      id: presentation.id,
      title: presentation.title,
      abstract: presentation.abstract,
      status: presentation.status,
      conferenceId: presentation.conferenceId,
      conferenceName: presentation.conference.name,
      presentationTypeName: presentation.presentationType?.name || "Standard",
      keywords: presentation.keywords,
      affiliations: presentation.affiliations,
      duration: presentation.duration,
      startTime: presentation.timeSlot?.startTime,
      endTime: presentation.timeSlot?.endTime,
      sectionName: presentation.section?.name,
      reviewStatus: presentation.reviewStatus,
      reviewComments: presentation.reviewComments,
      materials: presentation.materials,
    };
    
    res.status(200).json(formattedPresentation);
  } catch (error) {
    console.error("Error getting presentation details:", error);
    res.status(500).json({ message: "Failed to get presentation details" });
  }
};

// Create a new presentation submission
export const createPresenterSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    
    const {
      title,
      abstract,
      conferenceId,
      presentationTypeId,
      keywords,
      affiliations,
      duration,
      status
    } = req.body;
    
    // Create the presentation
    const presentation = await prisma.presentation.create({
      data: {
        title,
        abstract,
        conferenceId,
        presentationTypeId: presentationTypeId ? parseInt(presentationTypeId) : null,
        keywords,
        affiliations,
        duration: duration ? parseInt(duration) : null,
        status: status as PresentationStatus,
        submissionType: "internal",
        authors: {
          create: {
            userId,
            authorName: "", // Will be populated from user data
            authorEmail: "", // Will be populated from user data
            isPresenter: true,
            isExternal: false,
          },
        },
      },
    });
    
    // Get user info to update the author record
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (user) {
      await prisma.presentationAuthor.updateMany({
        where: {
          presentationId: presentation.id,
          userId: userId,
        },
        data: {
          authorName: user.name,
          authorEmail: user.email,
        },
      });
    }
    
    res.status(201).json({
      id: presentation.id,
      message: "Presentation created successfully",
    });
  } catch (error) {
    console.error("Error creating presentation:", error);
    res.status(500).json({ message: "Failed to create presentation" });
  }
};

// Update an existing presentation
export const updatePresenterPresentation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const presentationId = parseInt(req.params.id);
    
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    
    // Check if presentation exists and user is an author
    const authorEntry = await prisma.presentationAuthor.findFirst({
      where: {
        userId: userId,
        presentationId: presentationId,
      },
      include: {
        presentation: true,
      },
    });
    
    if (!authorEntry) {
      res.status(404).json({ message: "Presentation not found or you don't have access" });
      return;
    }
    
    // Check if presentation is in draft status (only drafts can be edited)
    if (authorEntry.presentation.status !== "draft") {
      res.status(400).json({ message: "Only draft presentations can be edited" });
      return;
    }
    
    const {
      title,
      abstract,
      keywords,
      affiliations,
      duration,
    } = req.body;
    
    // Update the presentation
    await prisma.presentation.update({
      where: { id: presentationId },
      data: {
        title,
        abstract,
        keywords,
        affiliations,
        duration: duration ? parseInt(duration) : null,
      },
    });
    
    res.status(200).json({ message: "Presentation updated successfully" });
  } catch (error) {
    console.error("Error updating presentation:", error);
    res.status(500).json({ message: "Failed to update presentation" });
  }
};

// Delete a presentation
export const deletePresenterPresentation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const presentationId = parseInt(req.params.id);
    
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    
    // Check if presentation exists and user is an author
    const authorEntry = await prisma.presentationAuthor.findFirst({
      where: {
        userId: userId,
        presentationId: presentationId,
      },
      include: {
        presentation: true,
      },
    });
    
    if (!authorEntry) {
      res.status(404).json({ message: "Presentation not found or you don't have access" });
      return;
    }
    
    // Check if presentation can be deleted (only drafts or submitted presentations)
    if (!["draft", "submitted"].includes(authorEntry.presentation.status)) {
      res.status(400).json({ message: "Only draft or submitted presentations can be deleted" });
      return;
    }
    
    // Delete the presentation
    await prisma.presentation.delete({
      where: { id: presentationId },
    });
    
    res.status(200).json({ message: "Presentation deleted successfully" });
  } catch (error) {
    console.error("Error deleting presentation:", error);
    res.status(500).json({ message: "Failed to delete presentation" });
  }
};

// Get conferences that are accepting submissions
export const getConferencesAcceptingSubmissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    
    const conferences = await prisma.conference.findMany({
      where: {
        status: "call_for_papers",
        submissionSettings: {
          enableSubmissions: true,
          submissionDeadline: {
            gte: new Date(),
          },
        },
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        submissionSettings: {
          select: {
            submissionDeadline: true,
          },
        },
      },
    });
    
    const formattedConferences = conferences.map(conf => ({
      id: conf.id,
      name: conf.name,
      startDate: conf.startDate,
      endDate: conf.endDate,
      submissionDeadline: conf.submissionSettings?.submissionDeadline,
    }));
    
    res.status(200).json({ conferences: formattedConferences });
  } catch (error) {
    console.error("Error getting conferences accepting submissions:", error);
    res.status(500).json({ message: "Failed to get conferences" });
  }
};

// Material upload handling
export const uploadMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    
    // Check if request has the necessary data
    if (!req.body.presentationId || !req.body.title || !req.file) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }
    
    const presentationId = parseInt(req.body.presentationId);
    const title = req.body.title;
    const file = req.file;
    
    // Check if presentation exists and user is an author
    const authorEntry = await prisma.presentationAuthor.findFirst({
      where: {
        userId: userId,
        presentationId: presentationId,
      },
    });
    
    if (!authorEntry) {
      res.status(404).json({ message: "Presentation not found or you don't have access" });
      return;
    }
    
    // In a real app, you would upload the file to a storage service like S3
    // For now, we'll just simulate having a file URL
    const fileUrl = `/uploads/${file.filename}`;
    const fileType = file.mimetype;
    
    // Create the material record
    const material = await prisma.presentationMaterial.create({
      data: {
        presentationId,
        title,
        fileUrl,
        fileType,
        isPublic: true,
      },
    });
    
    res.status(201).json({
      id: material.id,
      title: material.title,
      fileUrl: material.fileUrl,
      message: "Material uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading material:", error);
    res.status(500).json({ message: "Failed to upload material" });
  }
};

// Get all materials for a presenter
export const getPresenterMaterials = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    
    // Get presentations authored by the user
    const presentations = await prisma.presentationAuthor.findMany({
      where: {
        userId: userId,
      },
      select: {
        presentationId: true,
      },
    });
    
    const presentationIds = presentations.map(p => p.presentationId);
    
    // Get materials for these presentations
    const materials = await prisma.presentationMaterial.findMany({
      where: {
        presentationId: {
          in: presentationIds,
        },
      },
      include: {
        presentation: {
          select: {
            title: true,
          },
        },
      },
    });
    
    const formattedMaterials = materials.map(material => ({
      id: material.id,
      title: material.title,
      fileUrl: material.fileUrl,
      fileType: material.fileType,
      uploadedAt: material.uploadedAt,
      presentationId: material.presentationId,
      presentationTitle: material.presentation.title,
    }));
    
    res.status(200).json({ materials: formattedMaterials });
  } catch (error) {
    console.error("Error getting presenter materials:", error);
    res.status(500).json({ message: "Failed to get materials" });
  }
};

// Delete a material
export const deleteMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const materialId = parseInt(req.params.id);
    
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    
    // Get the material to check ownership
    const material = await prisma.presentationMaterial.findUnique({
      where: { id: materialId },
      include: {
        presentation: {
          include: {
            authors: {
              where: {
                userId: userId,
              },
            },
          },
        },
      },
    });
    
    if (!material) {
      res.status(404).json({ message: "Material not found" });
      return;
    }
    
    // Check if user is an author of the presentation
    if (material.presentation.authors.length === 0) {
      res.status(403).json({ message: "You don't have permission to delete this material" });
      return;
    }
    
    // In a real app, you would also delete the file from storage
    
    // Delete the material record
    await prisma.presentationMaterial.delete({
      where: { id: materialId },
    });
    
    res.status(200).json({ message: "Material deleted successfully" });
  } catch (error) {
    console.error("Error deleting material:", error);
    res.status(500).json({ message: "Failed to delete material" });
  }
};