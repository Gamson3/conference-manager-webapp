import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getUserId } from '../utils/authHelper';

const prisma = new PrismaClient();

// Update event workflow
export const updateEventWorkflow = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { workflowStep, workflowStatus } = req.body;
    const userId = getUserId(req);

    if (!userId) {
        res.status(401).json({ message: "User not authenticated" });
        return;
    }

    // Check if user owns the event
    const event = await prisma.conference.findUnique({
      where: { id: Number(eventId) },
    });

    if (!event) {
     res.status(404).json({ message: "Event not found" });
     return;
    }

    if (event.createdById !== userId) {
        res.status(403).json({ message: "Not authorized to update this event" });
        return;
    }

    // Update the workflow
    const updatedEvent = await prisma.conference.update({
      where: { id: Number(eventId) },
      data: {
        workflowStep: workflowStep,
        workflowStatus: workflowStatus,
        updatedAt: new Date(),
      },
    });

    res.json(updatedEvent);
  } catch (error: any) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get event workflow status
export const getEventWorkflow = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const userId = getUserId(req);

    if (!userId) {
       res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const event = await prisma.conference.findUnique({
      where: { id: Number(eventId) },
      select: {
        id: true,
        workflowStep: true,
        workflowStatus: true,
        createdById: true,
      },
    });

    if (!event) {
       res.status(404).json({ message: "Event not found" });
       return;
    }

    if (event.createdById !== userId) {
       res.status(403).json({ message: "Not authorized to view this event" });
       return;
    }

    res.json({
      workflowStep: event.workflowStep,
      workflowStatus: event.workflowStatus,
    });
  } catch (error: any) {
    console.error('Error getting workflow:', error);
    res.status(500).json({ message: error.message });
  }
};