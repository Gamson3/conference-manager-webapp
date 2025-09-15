import { Request, Response } from 'express';
import { PrismaClient, AbstractSubmissionStatus } from '@prisma/client';
import { markAsSpeaker } from './conferenceMemberControllers';

const prisma = new PrismaClient();

// Get conference submission requirements and call for papers
export const getConferenceSubmissionInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conferenceId } = req.params;

    const conference = await prisma.conference.findUnique({
      where: { id: parseInt(conferenceId) },
      include: {
        submissionSettings: true,
        categories: {
          orderBy: { order: 'asc' }
        },
        presentationTypes: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!conference) {
      res.status(404).json({ message: 'Conference not found' });
      return;
    }

    // Check if submissions are open
    const submissionSettings = conference.submissionSettings;
    const now = new Date();
    const isSubmissionOpen = submissionSettings?.enableSubmissions && 
      (submissionSettings.allowLateSubmissions || now <= submissionSettings.submissionDeadline);

    res.json({
      conference: {
        id: conference.id,
        name: conference.name,
        description: conference.description,
        startDate: conference.startDate,
        endDate: conference.endDate,
        status: conference.status
      },
      submissionSettings,
      categories: conference.categories,
      presentationTypes: conference.presentationTypes,
      isSubmissionOpen,
      daysUntilDeadline: submissionSettings?.submissionDeadline 
        ? Math.ceil((submissionSettings.submissionDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null
    });
  } catch (error) {
    console.error('Error fetching conference submission info:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create new abstract submission
export const createAbstractSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conferenceId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const {
      title,
      content,
      keywords,
      presentationTypeId,
      requestedDuration,
      biography,
      fileUrl
    } = req.body;

    // Validate conference and submission settings
    const conference = await prisma.conference.findUnique({
      where: { id: parseInt(conferenceId) },
      include: { submissionSettings: true }
    });

    if (!conference) {
      res.status(404).json({ message: 'Conference not found' });
      return;
    }

    const settings = conference.submissionSettings;
    if (!settings?.enableSubmissions) {
      res.status(400).json({ message: 'Submissions are not enabled for this conference' });
      return;
    }

    // Check deadline
    const now = new Date();
    if (!settings.allowLateSubmissions && now > settings.submissionDeadline) {
      res.status(400).json({ message: 'Submission deadline has passed' });
      return;
    }

    // Check multiple submissions policy
    if (!settings.allowMultipleSubmissions) {
      const existingSubmission = await prisma.abstractSubmission.findFirst({
        where: {
          conferenceId: parseInt(conferenceId),
          submitterId: userId,
          status: { not: 'WITHDRAWN' }
        }
      });

      if (existingSubmission) {
        res.status(400).json({ message: 'Multiple submissions not allowed for this conference' });
        return;
      }
    }

    // Validate content length
    if (settings.maxAbstractLength && content.length > settings.maxAbstractLength) {
      res.status(400).json({ 
        message: `Abstract exceeds maximum length of ${settings.maxAbstractLength} characters` 
      });
      return;
    }

    // Validate keywords
    if (settings.requireKeywords && keywords.length < (settings.minKeywords || 3)) {
      res.status(400).json({ 
        message: `At least ${settings.minKeywords || 3} keywords are required` 
      });
      return;
    }

    // Use transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create the submission
      const submission = await tx.abstractSubmission.create({
        data: {
          title,
          content,
          keywords: keywords || [],
          submitterId: userId,
          conferenceId: parseInt(conferenceId),
          presentationTypeId: presentationTypeId ? parseInt(presentationTypeId) : null,
          requestedDuration: requestedDuration ? parseInt(requestedDuration) : null,
          biography,
          fileUrl,
          status: 'SUBMITTED' as AbstractSubmissionStatus
        },
        include: {
          submitter: {
            select: { id: true, name: true, email: true }
          },
          conference: {
            select: { id: true, name: true }
          },
          presentationType: true
        }
      });

      // Mark user as speaker
      await markAsSpeaker(parseInt(conferenceId), userId);

      return submission;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating abstract submission:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get user's submissions for a conference
export const getUserConferenceSubmissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conferenceId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
    }

    const submissions = await prisma.abstractSubmission.findMany({
      where: {
        conferenceId: parseInt(conferenceId),
        submitterId: userId
      },
      include: {
        presentationType: true,
        reviews: {
          include: {
            reviewer: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(submissions);
  } catch (error) {
    console.error('Error fetching user submissions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get single submission details
export const getSubmissionDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { submissionId } = req.params;
    const userId = req.user?.id;

    const submission = await prisma.abstractSubmission.findFirst({
      where: {
        id: parseInt(submissionId),
        submitterId: userId
      },
      include: {
        submitter: {
          select: { id: true, name: true, email: true }
        },
        conference: {
          select: { id: true, name: true }
        },
        presentationType: true,
        reviews: {
          include: {
            reviewer: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!submission) {
      res.status(404).json({ message: 'Submission not found' });
      return;
    }

    res.json(submission);
  } catch (error) {
    console.error('Error fetching submission details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update submission (only allowed for DRAFT or REVISION_REQUESTED)
export const updateAbstractSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { submissionId } = req.params;
    const userId = req.user?.id;

    const submission = await prisma.abstractSubmission.findFirst({
      where: {
        id: parseInt(submissionId),
        submitterId: userId
      }
    });

    if (!submission) {
      res.status(404).json({ message: 'Submission not found' });
      return;
    }

    // Check if submission can be edited
    if (!['DRAFT', 'REVISION_REQUESTED'].includes(submission.status)) {
      res.status(400).json({ message: 'Submission cannot be edited in current status' });
      return;
    }

    const {
      title,
      content,
      keywords,
      presentationTypeId,
      requestedDuration,
      biography,
      fileUrl
    } = req.body;

    const updatedSubmission = await prisma.abstractSubmission.update({
      where: { id: parseInt(submissionId) },
      data: {
        title,
        content,
        keywords: keywords || [],
        presentationTypeId: presentationTypeId ? parseInt(presentationTypeId) : null,
        requestedDuration: requestedDuration ? parseInt(requestedDuration) : null,
        biography,
        fileUrl,
        status: 'SUBMITTED' as AbstractSubmissionStatus // Reset to submitted when updated
      },
      include: {
        submitter: {
          select: { id: true, name: true, email: true }
        },
        conference: {
          select: { id: true, name: true }
        },
        presentationType: true
      }
    });

    res.json(updatedSubmission);
  } catch (error) {
    console.error('Error updating submission:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Withdraw submission
export const withdrawSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { submissionId } = req.params;
    const userId = req.user?.id;

    const submission = await prisma.abstractSubmission.findFirst({
      where: {
        id: parseInt(submissionId),
        submitterId: userId
      }
    });

    if (!submission) {
      res.status(404).json({ message: 'Submission not found' });
      return;
    }

    if (submission.status === 'ACCEPTED') {
      res.status(400).json({ message: 'Cannot withdraw accepted submission' });
      return;
    }

    const updatedSubmission = await prisma.abstractSubmission.update({
      where: { id: parseInt(submissionId) },
      data: {
        status: 'WITHDRAWN' as AbstractSubmissionStatus
      }
    });

    res.json(updatedSubmission);
  } catch (error) {
    console.error('Error withdrawing submission:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};