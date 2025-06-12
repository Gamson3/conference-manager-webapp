import { Request, Response } from "express";
import prisma from '../lib/prisma';
import { getUserId, isAdmin } from "../utils/authHelper";

// GET /api/conferences/:id/presentation-types - Get all presentation types for a conference
export const getConferencePresentationTypes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Verify conference exists and user has permission
    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      select: { createdById: true }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to view presentation types for this conference" });
      return;
    }

    // Get presentation types with presentation counts
    const presentationTypes = await prisma.presentationType.findMany({
      where: { conferenceId: Number(id) },
      include: {
        _count: {
          select: {
            presentations: true
          }
        }
      },
      orderBy: { order: 'asc' }
    });

    console.log(`[PRESENTATION_TYPE] Retrieved ${presentationTypes.length} presentation types for conference ${id}`);
    res.json(presentationTypes);

  } catch (error: any) {
    console.error("Error fetching conference presentation types:", error);
    res.status(500).json({ 
      message: "Failed to fetch presentation types", 
      error: error.message 
    });
  }
};

// POST /api/conferences/:id/presentation-types - Create new presentation type
export const createPresentationType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      defaultDuration, 
      minDuration, 
      maxDuration, 
      allowsQA, 
      qaDuration 
    } = req.body;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Verify conference exists and user has permission
    const conference = await prisma.conference.findUnique({
      where: { id: Number(id) },
      select: { createdById: true }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to create presentation types for this conference" });
      return;
    }

    // Validate required fields
    if (!name || name.trim().length === 0) {
      res.status(400).json({ message: "Presentation type name is required" });
      return;
    }

    // Validate duration values
    const defaultDur = Number(defaultDuration) || 20;
    const minDur = Number(minDuration) || 10;
    const maxDur = Number(maxDuration) || 30;
    const qaDur = Number(qaDuration) || 5;

    if (minDur > maxDur) {
      res.status(400).json({ message: "Minimum duration cannot be greater than maximum duration" });
      return;
    }

    if (defaultDur < minDur || defaultDur > maxDur) {
      res.status(400).json({ message: "Default duration must be between minimum and maximum duration" });
      return;
    }

    // Get next order number
    const lastPresentationType = await prisma.presentationType.findFirst({
      where: { conferenceId: Number(id) },
      orderBy: { order: 'desc' }
    });

    const nextOrder = lastPresentationType ? lastPresentationType.order + 1 : 1;

    const presentationType = await prisma.presentationType.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        defaultDuration: defaultDur,
        minDuration: minDur,
        maxDuration: maxDur,
        allowsQA: Boolean(allowsQA),
        qaDuration: qaDur,
        conferenceId: Number(id),
        order: nextOrder
      },
      include: {
        _count: {
          select: {
            presentations: true
          }
        }
      }
    });

    console.log(`[PRESENTATION_TYPE] Created presentation type "${name}" for conference ${id}`);
    res.status(201).json(presentationType);

  } catch (error: any) {
    console.error("Error creating presentation type:", error);
    res.status(500).json({ 
      message: "Failed to create presentation type", 
      error: error.message 
    });
  }
};

// PUT /api/presentation-types/:id - Update presentation type
export const updatePresentationType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      defaultDuration, 
      minDuration, 
      maxDuration, 
      allowsQA, 
      qaDuration,
      order 
    } = req.body;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Verify presentation type exists and user has permission
    const presentationType = await prisma.presentationType.findUnique({
      where: { id: Number(id) },
      include: {
        conference: {
          select: { createdById: true }
        }
      }
    });

    if (!presentationType) {
      res.status(404).json({ message: "Presentation type not found" });
      return;
    }

    if (!isAdmin(req) && presentationType.conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to update this presentation type" });
      return;
    }

    // Validate required fields
    if (!name || name.trim().length === 0) {
      res.status(400).json({ message: "Presentation type name is required" });
      return;
    }

    // Validate duration values
    const defaultDur = Number(defaultDuration) || presentationType.defaultDuration;
    const minDur = Number(minDuration) || presentationType.minDuration;
    const maxDur = Number(maxDuration) || presentationType.maxDuration;
    const qaDur = Number(qaDuration) || presentationType.qaDuration;

    if (minDur > maxDur) {
      res.status(400).json({ message: "Minimum duration cannot be greater than maximum duration" });
      return;
    }

    if (defaultDur < minDur || defaultDur > maxDur) {
      res.status(400).json({ message: "Default duration must be between minimum and maximum duration" });
      return;
    }

    const updatedPresentationType = await prisma.presentationType.update({
      where: { id: Number(id) },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        defaultDuration: defaultDur,
        minDuration: minDur,
        maxDuration: maxDur,
        allowsQA: allowsQA !== undefined ? Boolean(allowsQA) : presentationType.allowsQA,
        qaDuration: qaDur,
        order: order !== undefined ? Number(order) : presentationType.order
      },
      include: {
        _count: {
          select: {
            presentations: true
          }
        }
      }
    });

    console.log(`[PRESENTATION_TYPE] Updated presentation type ${id}: "${name}"`);
    res.json(updatedPresentationType);

  } catch (error: any) {
    console.error("Error updating presentation type:", error);
    res.status(500).json({ 
      message: "Failed to update presentation type", 
      error: error.message 
    });
  }
};

// DELETE /api/presentation-types/:id - Delete presentation type
export const deletePresentationType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Verify presentation type exists and user has permission
    const presentationType = await prisma.presentationType.findUnique({
      where: { id: Number(id) },
      include: {
        conference: {
          select: { createdById: true }
        },
        _count: {
          select: {
            presentations: true
          }
        }
      }
    });

    if (!presentationType) {
      res.status(404).json({ message: "Presentation type not found" });
      return;
    }

    if (!isAdmin(req) && presentationType.conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to delete this presentation type" });
      return;
    }

    // Check if presentation type has presentations
    if (presentationType._count.presentations > 0) {
      res.status(400).json({ 
        message: "Cannot delete presentation type that has presentations assigned to it",
        presentationCount: presentationType._count.presentations
      });
      return;
    }

    await prisma.presentationType.delete({
      where: { id: Number(id) }
    });

    console.log(`[PRESENTATION_TYPE] Deleted presentation type ${id}`);
    res.json({ message: "Presentation type deleted successfully" });

  } catch (error: any) {
    console.error("Error deleting presentation type:", error);
    res.status(500).json({ 
      message: "Failed to delete presentation type", 
      error: error.message 
    });
  }
};