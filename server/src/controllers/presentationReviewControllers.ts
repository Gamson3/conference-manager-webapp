import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getUserId, isAdmin } from '../utils/authHelper';

const prisma = new PrismaClient();

// Get all submissions for a conference
export const getConferenceSubmissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conferenceId } = req.params;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Verify the user is an organizer of this conference
    const conference = await prisma.conference.findUnique({
      where: { id: Number(conferenceId) },
      select: {
        id: true,
        createdById: true
      }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to view submissions for this conference" });
      return;
    }

    // Get all presentations for this conference
    const submissions = await prisma.presentation.findMany({
      where: { 
        conferenceId: Number(conferenceId)
      },
      include: {
        authors: {
          orderBy: { order: 'asc' }
        },
        category: true,
        presentationType: true
      },
      orderBy: [
        { reviewStatus: 'asc' },  // PENDING first
        { createdAt: 'desc' }     // Newest first
      ]
    });

    res.json(submissions);
  } catch (error: any) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ message: "Failed to get submissions", error: error.message });
  }
};

// Get a single submission
export const getSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const submission = await prisma.presentation.findUnique({
      where: { id: Number(id) },
      include: {
        authors: {
          orderBy: { order: 'asc' }
        },
        category: true,
        presentationType: true,
        conference: {
          select: {
            id: true,
            name: true,
            createdById: true
          }
        }
      }
    });

    if (!submission) {
      res.status(404).json({ message: "Submission not found" });
      return;
    }

    // Check if user is conference organizer or admin
    if (!isAdmin(req) && submission.conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to view this submission" });
      return;
    }

    res.json(submission);
  } catch (error: any) {
    console.error("Error fetching submission:", error);
    res.status(500).json({ message: "Failed to get submission details", error: error.message });
  }
};

// Update submission review status
export const reviewSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reviewStatus, reviewComments } = req.body;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Validate status
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED'];
    if (!validStatuses.includes(reviewStatus)) {
      res.status(400).json({ message: "Invalid review status" });
      return;
    }

    // Get presentation to check permissions
    const presentation = await prisma.presentation.findUnique({
      where: { id: Number(id) },
      include: {
        conference: {
          select: {
            createdById: true
          }
        }
      }
    });

    if (!presentation) {
      res.status(404).json({ message: "Presentation not found" });
      return;
    }

    // Check if user is conference organizer or admin
    if (!isAdmin(req) && presentation.conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to review this submission" });
      return;
    }

    // Update the presentation review status
    const updatedPresentation = await prisma.presentation.update({
      where: { id: Number(id) },
      data: {
        reviewStatus,
        reviewComments: reviewComments || null,
        reviewedAt: new Date()
      }
    });

    res.json({
      message: `Presentation has been ${reviewStatus.toLowerCase()}`,
      presentation: {
        id: updatedPresentation.id,
        title: updatedPresentation.title,
        reviewStatus: updatedPresentation.reviewStatus,
        reviewComments: updatedPresentation.reviewComments,
        reviewedAt: updatedPresentation.reviewedAt
      }
    });
  } catch (error: any) {
    console.error("Error updating review status:", error);
    res.status(500).json({ message: "Failed to update review status", error: error.message });
  }
};