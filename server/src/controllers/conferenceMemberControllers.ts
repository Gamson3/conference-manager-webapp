import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get or create conference membership
export const upsertConferenceMember = async (req: Request, res: Response) => {
  try {
    const { conferenceId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const member = await prisma.conferenceMember.upsert({
      where: {
        conferenceId_userId: {
          conferenceId: parseInt(conferenceId),
          userId: userId
        }
      },
      update: {
        isAttendee: true
      },
      create: {
        conferenceId: parseInt(conferenceId),
        userId: userId,
        isAttendee: true,
        isSpeaker: false
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        conference: {
          select: { id: true, name: true }
        }
      }
    });

    res.json(member);
  } catch (error) {
    console.error('Error upserting conference member:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get user's conference membership
export const getConferenceMembership = async (req: Request, res: Response) => {
  try {
    const { conferenceId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const member = await prisma.conferenceMember.findUnique({
      where: {
        conferenceId_userId: {
          conferenceId: parseInt(conferenceId),
          userId: userId
        }
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!member) {
     res.status(403).json({ message: "Not registered for this conference" });
     return;
    }        

    res.json(member);
  } catch (error) {
    console.error('Error fetching conference membership:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Mark user as speaker (called when first submission is created)
export const markAsSpeaker = async (conferenceId: number, userId: number) => {
  return await prisma.conferenceMember.upsert({
    where: {
      conferenceId_userId: {
        conferenceId: conferenceId,
        userId: userId
      }
    },
    update: {
      isSpeaker: true
    },
    create: {
      conferenceId: conferenceId,
      userId: userId,
      isAttendee: true,
      isSpeaker: true
    }
  });
};