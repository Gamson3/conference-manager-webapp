import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create or update submission settings
export const upsertSubmissionSettings = async (req: Request, res: Response) => {
  try {
    const { conferenceId } = req.params;
    const {
      submissionDeadline,
      allowLateSubmissions,
      requireAbstract,
      maxAbstractLength,
      requireFullPaper,
      allowedFileTypes,
      maxFileSize,
      reviewProcess,
      requireAuthorBio,
      requireAffiliation,
      notificationEmails,
      submissionGuidelines,
      enableSubmissions
    } = req.body;

    const submissionSettings = await prisma.submissionSettings.upsert({
      where: { conferenceId: Number(conferenceId) },
      update: {
        submissionDeadline: new Date(submissionDeadline),
        allowLateSubmissions,
        requireAbstract,
        maxAbstractLength,
        requireFullPaper,
        allowedFileTypes,
        maxFileSize,
        reviewProcess,
        requireAuthorBio,
        requireAffiliation,
        notificationEmails,
        submissionGuidelines,
        enableSubmissions,
        updatedAt: new Date()
      },
      create: {
        conferenceId: Number(conferenceId),
        submissionDeadline: new Date(submissionDeadline),
        allowLateSubmissions,
        requireAbstract,
        maxAbstractLength,
        requireFullPaper,
        allowedFileTypes,
        maxFileSize,
        reviewProcess,
        requireAuthorBio,
        requireAffiliation,
        notificationEmails,
        submissionGuidelines,
        enableSubmissions
      }
    });

    res.json(submissionSettings);
  } catch (error: any) {
    console.error('Error updating submission settings:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get submission settings
export const getSubmissionSettings = async (req: Request, res: Response) => {
  try {
    const { conferenceId } = req.params;

    const submissionSettings = await prisma.submissionSettings.findUnique({
      where: { conferenceId: Number(conferenceId) }
    });

    if (!submissionSettings) {
      res.status(404).json({ message: 'Submission settings not found' });
      return;
    }

    res.json(submissionSettings);
  } catch (error: any) {
    console.error('Error fetching submission settings:', error);
    res.status(500).json({ message: error.message });
  }
};