import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to generate days from conference dates
const generateDaysFromConference = (startDate: Date, endDate: Date) => {
  const days = [];
  const currentDate = new Date(startDate);
  let dayNumber = 1;

  while (currentDate <= endDate) {
    const dateString = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    days.push({
      id: dayNumber, // Use sequential IDs since these are generated
      date: dateString,
      dayOfWeek: dayOfWeek,
      name: `Day ${dayNumber}`,
      order: dayNumber,
      sections: [] // Will be populated later
    });

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
    dayNumber++;
  }

  return days;
};

// Get schedule overview with dynamically generated days
export const getScheduleOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conferenceId } = req.params;

    // Get conference basic info
    const conference = await prisma.conference.findUnique({
      where: { id: parseInt(conferenceId) },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true
      }
    });

    if (!conference) {
      res.status(404).json({ message: 'Conference not found' });
      return;
    }

    if (!conference.startDate || !conference.endDate) {
      res.status(400).json({ message: 'Conference missing start or end date' });
      return;
    }

    // Generate days dynamically from conference dates
    const generatedDays = generateDaysFromConference(conference.startDate, conference.endDate);

    // Get all sections for this conference
    const sections = await prisma.section.findMany({
      where: { 
        conferenceId: parseInt(conferenceId)
      },
      include: {
        timeSlots: {
          include: {
            presentation: {
              include: {
                authors: {
                  include: {
                    presenter: true,
                    internalUser: true
                  }
                },
                category: true
              }
            }
          },
          orderBy: { startTime: 'asc' }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    // Map sections to the correct generated days
    const daysWithSections = generatedDays.map(day => {
      const dayDate = new Date(day.date);
      
      // Find sections that belong to this day
      const daySections = sections.filter(section => {
        if (!section.startTime) return false;
        
        const sectionDate = new Date(section.startTime);
        return sectionDate.toDateString() === dayDate.toDateString();
      });

      return {
        ...day,
        sections: daySections.map(section => ({
          id: section.id,
          title: section.name,
          type: section.type,
          startTime: section.startTime?.toISOString(),
          endTime: section.endTime?.toISOString(),
          isFixed: true, // All sections are considered fixed
          presentations: section.timeSlots
            .filter(slot => slot.presentation)
            .map(slot => {
              const presentation = slot.presentation!;
              return {
                id: presentation.id,
                title: presentation.title,
                finalDuration: presentation.finalDuration || 0,
                presenters: presentation.authors.map((authorRel: any) => {
                  if (authorRel.presenter) {
                    return {
                      id: authorRel.presenter.id,
                      name: authorRel.presenter.name,
                      email: authorRel.presenter.email,
                      affiliation: authorRel.presenter.affiliation
                    };
                  } else if (authorRel.internalUser) {
                    return {
                      id: authorRel.internalUser.id,
                      name: authorRel.internalUser.name,
                      email: authorRel.internalUser.email,
                      affiliation: authorRel.internalUser.organization
                    };
                  } else {
                    return {
                      id: authorRel.id,
                      name: authorRel.authorName,
                      email: authorRel.authorEmail,
                      affiliation: authorRel.affiliation
                    };
                  }
                }),
                category: presentation.category,
                timeSlot: {
                  id: slot.id,
                  startTime: slot.startTime.toISOString(),
                  endTime: slot.endTime.toISOString()
                }
              };
            })
        }))
      };
    });

    // Calculate statistics
    const totalPresentations = await prisma.presentation.count({
      where: { conferenceId: parseInt(conferenceId) }
    });

    const scheduledPresentations = await prisma.timeSlot.count({
      where: {
        presentationId: { not: null },
        section: {
          conferenceId: parseInt(conferenceId)
        }
      }
    });

    const statistics = {
      totalPresentations,
      scheduledPresentations,
      unscheduledPresentations: totalPresentations - scheduledPresentations,
      schedulingProgress: totalPresentations > 0 ? Math.round((scheduledPresentations / totalPresentations) * 100) : 0
    };

    // Transform data for frontend
    const scheduleData = {
      conference: {
        id: conference.id,
        title: conference.name,
        startDate: conference.startDate,
        endDate: conference.endDate
      },
      days: daysWithSections,
      statistics
    };

    console.log(`Generated ${daysWithSections.length} days from ${conference.startDate.toISOString().split('T')[0]} to ${conference.endDate.toISOString().split('T')[0]}`);
    
    res.json(scheduleData);

  } catch (error) {
    console.error('Error fetching schedule overview:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get unscheduled presentations by category
// Fix Issue 2: Unscheduled presentations query
export const getUnscheduledPresentations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conferenceId } = req.params;

    const unscheduledPresentations = await prisma.presentation.findMany({
      where: {
        conferenceId: parseInt(conferenceId),
        timeSlot: null
      },
      include: {
        authors: {
          include: {
            presenter: true,
            internalUser: true
          }
        },
        category: true
      },
      orderBy: [
        { categoryId: 'asc' },
        { title: 'asc' }
      ]
    });

    console.log(`Found ${unscheduledPresentations.length} unscheduled presentations for conference ${conferenceId}`);

    // Group by category
    const grouped = unscheduledPresentations.reduce((acc, presentation) => {
      const categoryId = presentation.category?.id;
      if (!categoryId || !presentation.category) {
        console.log(`Skipping presentation ${presentation.id} - no category`);
        return acc;
      }
      
      if (!acc[categoryId]) {
        acc[categoryId] = {
          category: presentation.category,
          presentations: []
        };
      }
      acc[categoryId].presentations.push({
        id: presentation.id,
        title: presentation.title,
        finalDuration: presentation.finalDuration || 0,
        presenters: presentation.authors.map((authorRel: any) => {
          if (authorRel.presenter) {
            return {
              id: authorRel.presenter.id,
              name: authorRel.presenter.name,
              email: authorRel.presenter.email,
              affiliation: authorRel.presenter.affiliation
            };
          } else if (authorRel.internalUser) {
            return {
              id: authorRel.internalUser.id,
              name: authorRel.internalUser.name,
              email: authorRel.internalUser.email,
              affiliation: authorRel.internalUser.organization
            };
          } else {
            return {
              id: authorRel.id,
              name: authorRel.authorName,
              email: authorRel.authorEmail,
              affiliation: authorRel.affiliation
            };
          }
        }),
        category: presentation.category
      });
      return acc;
    }, {} as any);

    const result = Object.values(grouped);
    console.log(`Grouped into ${result.length} categories:`, result.map((r: any) => `${r.category.name}: ${r.presentations.length} presentations`));
    res.json(result);

  } catch (error) {
    console.error('Error fetching unscheduled presentations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Calculate next available time slot in a section
const calculateNextAvailableSlot = async (sectionId: number, presentationDuration: number) => {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: {
      timeSlots: {
        where: { presentationId: { not: null } },
        orderBy: { startTime: 'asc' }
      }
    }
  });

  if (!section) throw new Error('Section not found');
  if (!section.startTime || !section.endTime) throw new Error('Section missing time bounds');

  let nextAvailableStart = section.startTime;
  
  // Find the next available slot after existing time slots
  for (const slot of section.timeSlots) {
    if (slot.endTime && slot.endTime > nextAvailableStart) {
      nextAvailableStart = slot.endTime;
    }
  }

  // Calculate end time based on presentation duration
  const endTime = new Date(nextAvailableStart.getTime() + presentationDuration * 60000);
  
  // Check if it fits within section bounds
  const sectionEndTime = section.endTime;
  const availableMinutes = Math.floor((sectionEndTime.getTime() - nextAvailableStart.getTime()) / 60000);
  
  let actualDuration = presentationDuration;
  let truncated = false;
  
  if (endTime > sectionEndTime) {
    actualDuration = availableMinutes;
    truncated = true;
  }

  return {
    startTime: nextAvailableStart,
    endTime: new Date(nextAvailableStart.getTime() + actualDuration * 60000),
    originalDuration: presentationDuration,
    actualDuration,
    truncated,
    availableMinutes
  };
};

// Assign presentation to section
export const assignPresentationToSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: presentationId } = req.params;
    const { sectionId } = req.body;

    if (!sectionId) {
      res.status(400).json({ message: 'Section ID is required' });
      return;
    }

    const presentation = await prisma.presentation.findUnique({
      where: { id: parseInt(presentationId) },
      include: {
        authors: {
          include: {
            presenter: true,
            internalUser: true
          }
        },
        category: true
      }
    });

    if (!presentation) {
      res.status(404).json({ message: 'Presentation not found' });
      return;
    }

    if (!presentation.finalDuration) {
      res.status(400).json({ message: 'Presentation duration not set' });
      return;
    }

    // Calculate next available time slot
    const slotInfo = await calculateNextAvailableSlot(sectionId, presentation.finalDuration);

    // If truncated, return warning for user confirmation
    if (slotInfo.truncated) {
      res.status(409).json({
        message: 'Duration exceeds available time',
        truncationInfo: {
          originalDuration: slotInfo.originalDuration,
          availableDuration: slotInfo.actualDuration,
          availableMinutes: slotInfo.availableMinutes
        },
        requiresConfirmation: true
      });
      return;
    }

    // Create time slot
    const timeSlot = await prisma.timeSlot.create({
      data: {
        sectionId: parseInt(sectionId),
        presentationId: presentation.id,
        startTime: slotInfo.startTime,
        endTime: slotInfo.endTime
      }
    });

    res.json({
      message: 'Presentation scheduled successfully',
      timeSlot: {
        id: timeSlot.id,
        startTime: timeSlot.startTime.toISOString(),
        endTime: timeSlot.endTime.toISOString()
      },
      presentation: {
        id: presentation.id,
        title: presentation.title,
        finalDuration: presentation.finalDuration,
        presenters: presentation.authors.map((authorRel: any) => {
          if (authorRel.presenter) {
            return {
              id: authorRel.presenter.id,
              name: authorRel.presenter.name,
              email: authorRel.presenter.email,
              affiliation: authorRel.presenter.affiliation
            };
          } else if (authorRel.internalUser) {
            return {
              id: authorRel.internalUser.id,
              name: authorRel.internalUser.name,
              email: authorRel.internalUser.email,
              affiliation: authorRel.internalUser.organization
            };
          } else {
            return {
              id: authorRel.id,
              name: authorRel.authorName,
              email: authorRel.authorEmail,
              affiliation: authorRel.affiliation
            };
          }
        }),
        category: presentation.category
      }
    });
  } catch (error) {
    console.error('Error assigning presentation:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Assign with confirmed truncation
export const assignPresentationWithTruncation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: presentationId } = req.params;
    const { sectionId, confirmedDuration } = req.body;

    if (!sectionId || !confirmedDuration) {
      res.status(400).json({ message: 'Section ID and confirmed duration are required' });
      return;
    }

    const presentation = await prisma.presentation.findUnique({
      where: { id: parseInt(presentationId) },
      include: {
        authors: {
          include: {
            presenter: true,
            internalUser: true
          }
        },
        category: true
      }
    });

    if (!presentation) {
      res.status(404).json({ message: 'Presentation not found' });
      return;
    }

    // Calculate time slot with confirmed duration
    const slotInfo = await calculateNextAvailableSlot(parseInt(sectionId), confirmedDuration);

    // Create time slot
    const timeSlot = await prisma.timeSlot.create({
      data: {
        sectionId: parseInt(sectionId),
        presentationId: presentation.id,
        startTime: slotInfo.startTime,
        endTime: slotInfo.endTime
      }
    });

    res.json({
      message: 'Presentation scheduled with adjusted duration',
      timeSlot: {
        id: timeSlot.id,
        startTime: timeSlot.startTime.toISOString(),
        endTime: timeSlot.endTime.toISOString()
      },
      presentation: {
        id: presentation.id,
        title: presentation.title,
        finalDuration: presentation.finalDuration,
        actualDuration: confirmedDuration,
        presenters: presentation.authors.map((authorRel: any) => {
          if (authorRel.presenter) {
            return {
              id: authorRel.presenter.id,
              name: authorRel.presenter.name,
              email: authorRel.presenter.email,
              affiliation: authorRel.presenter.affiliation
            };
          } else if (authorRel.internalUser) {
            return {
              id: authorRel.internalUser.id,
              name: authorRel.internalUser.name,
              email: authorRel.internalUser.email,
              affiliation: authorRel.internalUser.organization
            };
          } else {
            return {
              id: authorRel.id,
              name: authorRel.authorName,
              email: authorRel.authorEmail,
              affiliation: authorRel.affiliation
            };
          }
        }),
        category: presentation.category
      }
    });
  } catch (error) {
    console.error('Error assigning presentation with truncation:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Unassign presentation from section
export const unassignPresentationFromSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: presentationId } = req.params;

    console.log(`Attempting to unschedule presentation ${presentationId}`);

    // FIX: Use findUnique since presentationId has @unique constraint
    const timeSlot = await prisma.timeSlot.findUnique({
      where: { presentationId: parseInt(presentationId) }
    });

    if (!timeSlot) {
      console.log(`No time slot found for presentation ${presentationId}`);
      res.status(404).json({ message: 'Time slot not found for this presentation' });
      return;
    }

    console.log(`Found time slot ${timeSlot.id} for presentation ${presentationId}, deleting...`);

    await prisma.timeSlot.delete({
      where: { id: timeSlot.id }
    });

    console.log(`Successfully deleted time slot ${timeSlot.id}`);
    res.json({ message: 'Presentation unscheduled successfully' });
    
  } catch (error) {
    console.error('Error unassigning presentation:', error);
    
    // Add more specific error handling
    if (error instanceof Error) {
      if (error.message.includes('Record to delete does not exist')) {
        res.status(404).json({ message: 'Time slot not found' });
        return;
      }
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
};


// Add this simple publish function at the end:
export const publishSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conferenceId } = req.params;

    // Get conference
    const conference = await prisma.conference.findUnique({
      where: { id: parseInt(conferenceId) }
    });

    if (!conference) {
      res.status(404).json({ message: 'Conference not found' });
      return;
    }

    // Update conference status to published
    await prisma.conference.update({
      where: { id: parseInt(conferenceId) },
      data: {
        status: 'published',
      }
    });

    res.json({ message: 'Schedule published successfully' });

  } catch (error) {
    console.error('Error publishing schedule:', error);
    res.status(500).json({ message: 'Failed to publish schedule' });
  }
};