import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getUserId, isAdmin } from '../utils/authHelper';

type ConferenceAccessConference = {
  id: number;
  createdById: number;
  startDate: Date;
  endDate: Date;
};

type ConferenceAccessResult =
  | { authorized: true; conference: ConferenceAccessConference }
  | { authorized: false; conference: ConferenceAccessConference | null; error: string };

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return 'Unknown error';
};

// Helper to check conference ownership
const checkConferenceAccess = async (
  req: Request,
  conferenceId: number
): Promise<ConferenceAccessResult> => {
  const userId = getUserId(req);
  const conference = await prisma.conference.findUnique({
    where: { id: conferenceId },
    select: { id: true, createdById: true, startDate: true, endDate: true },
  });

  if (!conference) {
    return { authorized: false, conference: null, error: 'Conference not found' };
  }

  if (!isAdmin(req) && conference.createdById !== userId) {
    return { authorized: false, conference, error: 'Not authorized' };
  }

  return { authorized: true, conference };
};

// GET /api/conferences/:id/days - List all days for a conference
export const listDays = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);
    const access = await checkConferenceAccess(req, conferenceId);

    if (!access.authorized) {
      res
        .status(access.error === 'Conference not found' ? 404 : 403)
        .json({ message: access.error });
      return;
    }

    const days = await prisma.day.findMany({
      where: { conferenceId },
      orderBy: [{ date: 'asc' }, { order: 'asc' }],
      include: {
        _count: {
          select: { sections: true },
        },
      },
    });

    // Transform to include session count
    const payload = days.map((day) => ({
      id: day.id,
      conferenceId: day.conferenceId,
      name: day.name,
      date: day.date.toISOString().split('T')[0], // YYYY-MM-DD
      order: day.order,
      sessionsCount: day._count.sections,
    }));

    res.json(payload);
  } catch (error: unknown) {
    console.error('Error listing days:', error);
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

// GET /api/conferences/:conferenceId/days/:dayId - Get single day
export const getDay = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);
    const dayId = Number(req.params.dayId);

    const access = await checkConferenceAccess(req, conferenceId);
    if (!access.authorized) {
      res
        .status(access.error === 'Conference not found' ? 404 : 403)
        .json({ message: access.error });
      return;
    }

    const day = await prisma.day.findFirst({
      where: { id: dayId, conferenceId },
      include: {
        sections: {
          orderBy: [{ startTime: 'asc' }, { order: 'asc' }],
          include: {
            _count: { select: { presentations: true } },
          },
        },
        _count: { select: { sections: true } },
      },
    });

    if (!day) {
      res.status(404).json({ message: 'Day not found' });
      return;
    }

    res.json({
      id: day.id,
      conferenceId: day.conferenceId,
      name: day.name,
      date: day.date.toISOString().split('T')[0],
      order: day.order,
      sessionsCount: day._count.sections,
      sections: day.sections.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        startTime: s.startTime?.toISOString(),
        endTime: s.endTime?.toISOString(),
        room: s.room,
        presentationsCount: s._count.presentations,
      })),
    });
  } catch (error: unknown) {
    console.error('Error getting day:', error);
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

// POST /api/conferences/:id/days - Create a new day
export const createDay = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);
    const { name, date } = req.body;

    if (!name || !date) {
      res.status(400).json({ message: 'Name and date are required' });
      return;
    }

    const access = await checkConferenceAccess(req, conferenceId);
    if (!access.authorized) {
      res
        .status(access.error === 'Conference not found' ? 404 : 403)
        .json({ message: access.error });
      return;
    }
    const conference = access.conference;

    // Parse date (expect YYYY-MM-DD)
    const dayDate = new Date(date);
    if (Number.isNaN(dayDate.getTime())) {
      res.status(500).json({ message: 'Invalid date format' });
      return;
    }
    dayDate.setUTCHours(0, 0, 0, 0);

    // Validate date is within conference range
    const confStart = new Date(conference.startDate);
    confStart.setUTCHours(0, 0, 0, 0);
    const confEnd = new Date(conference.endDate);
    confEnd.setUTCHours(23, 59, 59, 999);

    if (dayDate < confStart || dayDate > confEnd) {
      res.status(400).json({
        message: 'Day date must be within conference dates',
        conferenceStart: confStart.toISOString().split('T')[0],
        conferenceEnd: confEnd.toISOString().split('T')[0],
      });
      return;
    }

    // Check for duplicate date
    const existing = await prisma.day.findFirst({
      where: { conferenceId, date: dayDate },
    });
    if (existing) {
      res.status(409).json({ message: 'A day already exists for this date' });
      return;
    }

    // Calculate order based on existing days
    const maxOrder = await prisma.day.aggregate({
      where: { conferenceId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? 0) + 1;

    const day = await prisma.day.create({
      data: {
        conferenceId,
        name,
        date: dayDate,
        order: nextOrder,
      },
    });

    res.status(201).json({
      id: day.id,
      conferenceId: day.conferenceId,
      name: day.name,
      date: day.date.toISOString().split('T')[0],
      order: day.order,
      sessionsCount: 0,
    });
  } catch (error: unknown) {
    console.error('Error creating day:', error);
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

// PUT /api/conferences/:id/days/:dayId - Update a day
export const updateDay = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);
    const dayId = Number(req.params.dayId);
    const { name, date, order } = req.body;

    const access = await checkConferenceAccess(req, conferenceId);
    if (!access.authorized) {
      res
        .status(access.error === 'Conference not found' ? 404 : 403)
        .json({ message: access.error });
      return;
    }
    const conference = access.conference;

    const existingDay = await prisma.day.findFirst({
      where: { id: dayId, conferenceId },
    });
    if (!existingDay) {
      res.status(404).json({ message: 'Day not found' });
      return;
    }

    // Build update data
    const updateData: { name?: string; order?: number; date?: Date } = {};
    if (name !== undefined) updateData.name = name;
    if (order !== undefined) updateData.order = order;

    if (date !== undefined) {
      const dayDate = new Date(date);
      if (Number.isNaN(dayDate.getTime())) {
        res.status(500).json({ message: 'Invalid date format' });
        return;
      }
      dayDate.setUTCHours(0, 0, 0, 0);

      // Validate within conference range
      const confStart = new Date(conference.startDate);
      confStart.setUTCHours(0, 0, 0, 0);
      const confEnd = new Date(conference.endDate);
      confEnd.setUTCHours(23, 59, 59, 999);

      if (dayDate < confStart || dayDate > confEnd) {
        res.status(400).json({ message: 'Day date must be within conference dates' });
        return;
      }

      // Check for duplicate date (excluding current day)
      const duplicate = await prisma.day.findFirst({
        where: { conferenceId, date: dayDate, NOT: { id: dayId } },
      });
      if (duplicate) {
        res.status(409).json({ message: 'A day already exists for this date' });
        return;
      }

      updateData.date = dayDate;
    }

    const day = await prisma.day.update({
      where: { id: dayId },
      data: updateData,
      include: { _count: { select: { sections: true } } },
    });

    res.json({
      id: day.id,
      conferenceId: day.conferenceId,
      name: day.name,
      date: day.date.toISOString().split('T')[0],
      order: day.order,
      sessionsCount: day._count.sections,
    });
  } catch (error: unknown) {
    console.error('Error updating day:', error);
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

// DELETE /api/conferences/:id/days/:dayId - Delete a day
export const deleteDay = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);
    const dayId = Number(req.params.dayId);
    const { force } = req.query;

    const access = await checkConferenceAccess(req, conferenceId);
    if (!access.authorized) {
      res
        .status(access.error === 'Conference not found' ? 404 : 403)
        .json({ message: access.error });
      return;
    }

    const day = await prisma.day.findFirst({
      where: { id: dayId, conferenceId },
      include: {
        sections: {
          include: {
            _count: { select: { presentations: true } },
          },
        },
      },
    });

    if (!day) {
      res.status(404).json({ message: 'Day not found' });
      return;
    }

    // Check for sections
    if (day.sections.length > 0 && force !== 'true') {
      const totalPresentations = day.sections.reduce(
        (sum, s) => sum + s._count.presentations,
        0
      );
      res.status(400).json({
        message: 'Day has sessions',
        requiresConfirmation: true,
        sessionsCount: day.sections.length,
        presentationsCount: totalPresentations,
        sections: day.sections.map((s) => ({
          id: s.id,
          name: s.name,
          presentationsCount: s._count.presentations,
        })),
      });
      return;
    }

    // Delete with cascade (presentations → sections → day)
    await prisma.$transaction(async (tx) => {
      // Delete presentations in all sections of this day
      for (const section of day.sections) {
        await tx.presentation.deleteMany({ where: { sectionId: section.id } });
      }
      // Delete sections
      await tx.section.deleteMany({ where: { dayId } });
      // Delete day
      await tx.day.delete({ where: { id: dayId } });
    });

    res.json({
      message: 'Day deleted successfully',
      deletedSections: day.sections.length,
    });
  } catch (error: unknown) {
    console.error('Error deleting day:', error);
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

// POST /api/conferences/:id/days/reorder - Reorder days
export const reorderDays = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);
    const { days } = req.body; // [{ id: number, order: number }, ...]

    if (!Array.isArray(days) || days.length === 0) {
      res.status(400).json({ message: 'Days array is required' });
      return;
    }

    const access = await checkConferenceAccess(req, conferenceId);
    if (!access.authorized) {
      res
        .status(access.error === 'Conference not found' ? 404 : 403)
        .json({ message: access.error });
      return;
    }

    // Update order for each day
    await prisma.$transaction(
      days.map((d: { id: number; order: number }) =>
        prisma.day.update({
          where: { id: d.id, conferenceId },
          data: { order: d.order },
        })
      )
    );

    res.json({ message: 'Days reordered successfully' });
  } catch (error: unknown) {
    console.error('Error reordering days:', error);
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

// GET /api/conferences/:id/program/stats - Get program statistics
export const getProgramStats = async (req: Request, res: Response) => {
  try {
    const conferenceId = Number(req.params.id);

    const access = await checkConferenceAccess(req, conferenceId);
    if (!access.authorized) {
      res
        .status(access.error === 'Conference not found' ? 404 : 403)
        .json({ message: access.error });
      return;
    }

    // Get counts
    const [daysCount, sectionsCount, presentationsCount, acceptedSubmissions] = await Promise.all([
      prisma.day.count({ where: { conferenceId } }),
      prisma.section.count({ where: { conferenceId } }),
      prisma.presentation.count({
        where: { section: { conferenceId } },
      }),
      prisma.submission.count({
        where: { conferenceId, status: 'accepted' },
      }),
    ]);

    // Get presentations by status
    const presentationsByStatus = await prisma.presentation.groupBy({
      by: ['status'],
      where: { section: { conferenceId } },
      _count: true,
    });

    // Get sections by type
    const sectionsByType = await prisma.section.groupBy({
      by: ['type'],
      where: { conferenceId },
      _count: true,
    });

    res.json({
      daysCount,
      sessionsCount: sectionsCount,
      presentationsCount,
      acceptedSubmissions,
      unscheduledAccepted: acceptedSubmissions - presentationsCount,
      presentationsByStatus: presentationsByStatus.reduce(
        (acc, item) => ({ ...acc, [item.status]: item._count }),
        {}
      ),
      sessionsByType: sectionsByType.reduce(
        (acc, item) => ({ ...acc, [item.type]: item._count }),
        {}
      ),
    });
  } catch (error: unknown) {
    console.error('Error getting program stats:', error);
    res.status(500).json({ message: getErrorMessage(error) });
  }
};
