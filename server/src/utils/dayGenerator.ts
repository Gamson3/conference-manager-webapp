import prisma from '../lib/prisma';

/**
 * Auto-generate conference days based on start and end dates
 * This ensures every conference has days for the full duration
 * 
 * @param conferenceId - ID of the conference
 * @param startDate - Conference start date
 * @param endDate - Conference end date
 */
export async function generateConferenceDays(
  conferenceId: number,
  startDate: Date,
  endDate: Date
): Promise<void> {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Normalize to midnight UTC for consistent date comparison
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);

  const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Get existing days for this conference
  const existingDays = await prisma.day.findMany({
    where: { conferenceId },
    orderBy: { date: 'asc' },
    select: { id: true, date: true }
  });

  const existingDatesMap = new Map(
    existingDays.map(day => [day.date.toISOString().split('T')[0], day.id])
  );

  const daysToCreate: { date: Date; name: string; order: number; conferenceId: number }[] = [];
  const daysToDelete: number[] = [];

  // Generate days for the full range
  for (let i = 0; i < dayCount; i++) {
    const currentDate = new Date(start);
    currentDate.setUTCDate(start.getUTCDate() + i);
    currentDate.setUTCHours(0, 0, 0, 0);

    const dateKey = currentDate.toISOString().split('T')[0];

    // If this date doesn't exist, mark for creation
    if (!existingDatesMap.has(dateKey)) {
      // Format day name as "Day 1", "Day 2", etc.
      const dayName = `Day ${i + 1}`;
      
      daysToCreate.push({
        date: currentDate,
        name: dayName,
        order: i + 1,
        conferenceId
      });
    }

    // Remove from map to track what needs deletion
    existingDatesMap.delete(dateKey);
  }

  // Remaining items in map are outside the new date range - delete them
  // BUT only if they have no sessions (preserve user work)
  for (const dayId of existingDatesMap.values()) {
    const dayWithSessions = await prisma.day.findUnique({
      where: { id: dayId },
      include: { _count: { select: { sections: true } } }
    });

    // Only delete if no sessions exist (preserve organizer's work)
    if (dayWithSessions && dayWithSessions._count.sections === 0) {
      daysToDelete.push(dayId);
    }
  }

  // Execute bulk operations
  if (daysToCreate.length > 0) {
    await prisma.day.createMany({
      data: daysToCreate,
      skipDuplicates: true
    });
  }

  if (daysToDelete.length > 0) {
    await prisma.day.deleteMany({
      where: { id: { in: daysToDelete } }
    });
  }

  // Update day numbers for all days in correct order
  const allDays = await prisma.day.findMany({
    where: { conferenceId },
    orderBy: { date: 'asc' },
    select: { id: true }
  });

  // Update order field to be sequential
  for (let i = 0; i < allDays.length; i++) {
    await prisma.day.update({
      where: { id: allDays[i].id },
      data: { order: i + 1, name: `Day ${i + 1}` }
    });
  }
}
