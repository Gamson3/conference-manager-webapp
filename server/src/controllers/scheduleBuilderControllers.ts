import { Request, Response } from "express";
import prisma from '../lib/prisma';
import { getUserId, isAdmin } from "../utils/authHelper";

// GET /api/conferences/:conferenceId/presentations/unassigned - Get unassigned presentations by category
export const getUnassignedPresentations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conferenceId } = req.params;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Verify conference access
    const conference = await prisma.conference.findUnique({
      where: { id: Number(conferenceId) },
      select: { createdById: true }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to view unassigned presentations" });
      return;
    }

    // Get presentations that belong to conference but are not assigned to sections
    const presentations = await prisma.presentation.findMany({
      where: {
        conferenceId: Number(conferenceId), // ✅ Direct conference relation
        sectionId: null,                    // ✅ Only unscheduled presentations
        reviewStatus: 'APPROVED'            // ✅ Only approved presentations
      },
      include: {
        authors: {
          include: {
            internalUser: true
          },
          where: { isPresenter: true }
        },
        category: true,
        presentationType: true,
        _count: {
          select: {
            materials: true,
            // Remove feedback count as it might not exist in new schema
          }
        }
      },
      orderBy: [
        { reviewStatus: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // Group presentations by category for easier frontend handling
    const groupedPresentations = presentations.reduce((acc: any, presentation) => {
      const categoryName = presentation.category?.name || 'Uncategorized';
      if (!acc[categoryName]) {
        acc[categoryName] = {
          category: presentation.category,
          presentations: []
        };
      }
      
      acc[categoryName].presentations.push({
        id: presentation.id,
        title: presentation.title,
        abstract: presentation.abstract,
        duration: presentation.duration,
        requestedDuration: presentation.requestedDuration,
        finalDuration: presentation.finalDuration,
        status: presentation.status,
        reviewStatus: presentation.reviewStatus,
        submissionType: presentation.submissionType,
        category: presentation.category,
        presentationType: presentation.presentationType,
        authors: presentation.authors.map((author: any) => ({
          id: author.id,
          name: author.authorName,
          email: author.authorEmail,
          affiliation: author.affiliation,
          isPresenter: author.isPresenter,
          organization: author.internalUser?.organization
        })),
        materialCount: presentation._count.materials,
        // Remove feedback count
        assignmentStatus: 'unassigned'
      });
      
      return acc;
    }, {});

    res.json({
      conferenceId: Number(conferenceId),
      totalUnassigned: presentations.length,
      groupedPresentations
    });

  } catch (error: any) {
    console.error("Error fetching unassigned presentations:", error);
    res.status(500).json({ message: "Failed to fetch unassigned presentations", error: error.message });
  }
};

// GET /api/conferences/:conferenceId/schedule-overview - Get complete schedule overview
export const getScheduleOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conferenceId } = req.params;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Verify conference access
    const conference = await prisma.conference.findUnique({
      where: { id: Number(conferenceId) },
      select: { createdById: true }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to view schedule for this conference" });
      return;
    }

    // Get complete conference structure with all assignments
    const scheduleData = await prisma.conference.findUnique({
      where: { id: Number(conferenceId) },
      include: {
        categories: {
          include: {
            // Remove sections from categories as they're now independent
            presentations: {
              where: {
                sectionId: null // Only unscheduled presentations
              },
              include: {
                authors: {
                  include: {
                    internalUser: true
                  },
                  where: { isPresenter: true }
                },
                presentationType: true
              }
            },
            _count: {
              select: {
                presentations: true
              }
            }
          },
          orderBy: { order: 'asc' }
        },
        days: {
          include: {
            sections: {
              include: {
                category: true,
                presentations: {
                  include: {
                    authors: {
                      include: {
                        internalUser: true
                      },
                      where: { isPresenter: true }
                    }
                  },
                  orderBy: { order: 'asc' }
                },
                _count: {
                  select: {
                    presentations: true
                  }
                }
              },
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { date: 'asc' }
        },
        _count: {
          select: {
            presentations: true,
            sections: true,
            days: true
          }
        }
      }
    });

    // Calculate assignment statistics
    const totalPresentations = await prisma.presentation.count({
      where: {
        conferenceId: Number(conferenceId) // ✅ Direct conference relation
      }
    });

    const assignedPresentations = await prisma.presentation.count({
      where: {
        conferenceId: Number(conferenceId), // ✅ Direct conference relation
        sectionId: { not: null }            // ✅ Only scheduled presentations
      }
    });

    const approvedPresentations = await prisma.presentation.count({
      where: {
        conferenceId: Number(conferenceId), // ✅ Direct conference relation
        reviewStatus: 'APPROVED'
      }
    });

    const unassignedApprovedPresentations = await prisma.presentation.count({
      where: {
        conferenceId: Number(conferenceId), // ✅ Direct conference relation
        reviewStatus: 'APPROVED',
        sectionId: null                     // ✅ Only unscheduled presentations
      }
    });

    res.json({
      ...scheduleData,
      statistics: {
        totalPresentations,
        assignedPresentations,
        unassignedPresentations: totalPresentations - assignedPresentations,
        approvedPresentations,
        unassignedApprovedPresentations,
        assignmentProgress: totalPresentations > 0 ? (assignedPresentations / totalPresentations) * 100 : 0
      }
    });

  } catch (error: any) {
    console.error("Error fetching schedule builder data:", error);
    res.status(500).json({ message: "Failed to fetch schedule builder data", error: error.message });
  }
};

// POST /api/presentations/:id/assign-to-slot - Assign presentation to specific time slot
export const assignPresentationToSlot = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { timeSlotId, forceAssign = false } = req.body;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Verify presentation exists
    const presentation = await prisma.presentation.findUnique({
      where: { id: Number(id) },
      include: {
        section: {
          include: {
            conference: { select: { createdById: true } }
          }
        }
      }
    });

    if (!presentation) {
      res.status(404).json({ message: "Presentation not found" });
      return;
    }

    // Check permissions
    if (!isAdmin(req) && presentation.section?.conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to assign this presentation" });
      return;
    }

    // Verify time slot exists and is available
    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id: Number(timeSlotId) },
      include: {
        section: {
          include: {
            conference: { select: { createdById: true } }
          }
        }
      }
    });

    if (!timeSlot) {
      res.status(404).json({ message: "Time slot not found" });
      return;
    }

    if (timeSlot.isOccupied && !forceAssign) {
      res.status(409).json({ message: "Time slot is already occupied", canForceAssign: true });
      return;
    }

    // If forcing assignment and slot is occupied, clear the existing assignment
    if (forceAssign && timeSlot.presentationId) {
      await prisma.presentation.update({
        where: { id: timeSlot.presentationId },
        data: { assignedAt: null }
      });
    }

    // Check for conflicts (this uses the conflict detection we built in Phase 2A)
    // We'll call the existing conflict detection logic here
    try {
      // Import the conflict detection function
      const { detectConflictsForAssignment } = require('./conflictDetectionControllers');
      const conflictResult = await detectConflictsForAssignment(
        Number(id),
        timeSlot.sectionId
      );

      if (conflictResult.hasConflicts && !forceAssign) {
        const blockingConflicts = conflictResult.conflicts.filter((c: any) => c.severity === 'BLOCKING');
        if (blockingConflicts.length > 0) {
          res.status(409).json({
            message: "Scheduling conflicts detected",
            conflicts: conflictResult.conflicts,
            canForceAssign: true
          });
          return;
        }
      }
    } catch (conflictError) {
      console.warn("Could not check conflicts:", conflictError);
      // Continue with assignment if conflict detection fails
    }

    // Perform the assignment in a transaction
    await prisma.$transaction([
      // Update the time slot
      prisma.timeSlot.update({
        where: { id: Number(timeSlotId) },
        data: {
          presentationId: Number(id),
          isOccupied: true
        }
      }),
      // Update the presentation
      prisma.presentation.update({
        where: { id: Number(id) },
        data: {
          sectionId: timeSlot.sectionId,
          assignedAt: new Date()
        }
      })
    ]);

    res.json({ 
      message: "Presentation assigned to time slot successfully",
      assignment: {
        presentationId: Number(id),
        timeSlotId: Number(timeSlotId),
        sectionId: timeSlot.sectionId
      }
    });

  } catch (error: any) {
    console.error("Error assigning presentation to slot:", error);
    res.status(500).json({ message: "Failed to assign presentation", error: error.message });
  }
};

// DELETE /api/presentations/:id/unassign - Remove presentation from its current assignment
export const unassignPresentation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Get presentation with current assignment
    const presentation = await prisma.presentation.findUnique({
      where: { id: Number(id) },
      include: {
        timeSlot: true,
        section: {
          include: {
            conference: { select: { createdById: true } }
          }
        }
      }
    });

    if (!presentation) {
      res.status(404).json({ message: "Presentation not found" });
      return;
    }

    // Check permissions
    if (!isAdmin(req) && presentation.section?.conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to modify this presentation" });
      return;
    }

    // Perform the unassignment in a transaction
    const updates = [];

    // If assigned to a time slot, free it
    if (presentation.timeSlot) {
      updates.push(
        prisma.timeSlot.update({
          where: { id: presentation.timeSlot.id },
          data: {
            presentationId: null,
            isOccupied: false
          }
        })
      );
    }

    // Update presentation
    updates.push(
      prisma.presentation.update({
        where: { id: Number(id) },
        data: {
          assignedAt: null
          // Note: We might want to keep sectionId for organizational purposes
          // or set it to null if we want complete unassignment
        }
      })
    );

    await prisma.$transaction(updates);

    res.json({ message: "Presentation unassigned successfully" });

  } catch (error: any) {
    console.error("Error unassigning presentation:", error);
    res.status(500).json({ message: "Failed to unassign presentation", error: error.message });
  }
};

// POST /api/sections/:sectionId/presentations/bulk-assign - Bulk assign presentations to a section
export const bulkAssignPresentations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sectionId } = req.params;
    const { presentationIds, assignmentStrategy = 'auto' } = req.body;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    if (!Array.isArray(presentationIds) || presentationIds.length === 0) {
      res.status(400).json({ message: "Presentation IDs array is required" });
      return;
    }

    // Verify section exists and user has permission
    const section = await prisma.section.findUnique({
      where: { id: Number(sectionId) },
      include: {
        conference: { select: { createdById: true } },
        timeSlots: {
          where: { isOccupied: false },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!section) {
      res.status(404).json({ message: "Section not found" });
      return;
    }

    if (!isAdmin(req) && section.conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to assign presentations to this section" });
      return;
    }

    // Verify all presentations exist and are assignable
    const presentations = await prisma.presentation.findMany({
      where: {
        id: { in: presentationIds.map(id => Number(id)) },
        reviewStatus: 'APPROVED'
      },
      include: {
        authors: {
          include: { presenter: true },
          where: { isPresenter: true }
        }
      }
    });

    if (presentations.length !== presentationIds.length) {
      res.status(400).json({ message: "Some presentations not found or not approved" });
      return;
    }

    const results = {
      successful: [] as any[],
      failed: [] as any[],
      conflicts: [] as any[]
    };

    // Strategy 1: Auto-assign to available time slots
    if (assignmentStrategy === 'auto') {
      const availableSlots = section.timeSlots;
      
      if (availableSlots.length < presentations.length) {
        res.status(400).json({ 
          message: `Not enough available time slots. Need ${presentations.length}, but only ${availableSlots.length} available.`,
          availableSlots: availableSlots.length,
          requiredSlots: presentations.length
        });
        return;
      }

      // Assign presentations to slots in order
      for (let i = 0; i < presentations.length; i++) {
        const presentation = presentations[i];
        const timeSlot = availableSlots[i];

        try {
          await prisma.$transaction([
            prisma.timeSlot.update({
              where: { id: timeSlot.id },
              data: {
                presentationId: presentation.id,
                isOccupied: true
              }
            }),
            prisma.presentation.update({
              where: { id: presentation.id },
              data: {
                sectionId: Number(sectionId),
                assignedAt: new Date()
              }
            })
          ]);

          results.successful.push({
            presentationId: presentation.id,
            presentationTitle: presentation.title,
            timeSlotId: timeSlot.id,
            timeSlot: {
              startTime: timeSlot.startTime,
              endTime: timeSlot.endTime,
              order: timeSlot.order
            }
          });

        } catch (error) {
          results.failed.push({
            presentationId: presentation.id,
            presentationTitle: presentation.title,
            error: "Database transaction failed"
          });
        }
      }
    }

    // Strategy 2: Assign to section without specific time slots
    else if (assignmentStrategy === 'section-only') {
      for (const presentation of presentations) {
        try {
          await prisma.presentation.update({
            where: { id: presentation.id },
            data: {
              sectionId: Number(sectionId),
              assignedAt: new Date()
            }
          });

          results.successful.push({
            presentationId: presentation.id,
            presentationTitle: presentation.title,
            assigned: 'section-only'
          });

        } catch (error) {
          results.failed.push({
            presentationId: presentation.id,
            presentationTitle: presentation.title,
            error: "Failed to assign to section"
          });
        }
      }
    }

    res.json({
      message: `Bulk assignment completed. ${results.successful.length} successful, ${results.failed.length} failed.`,
      results
    });

  } catch (error: any) {
    console.error("Error in bulk assignment:", error);
    res.status(500).json({ message: "Failed to perform bulk assignment", error: error.message });
  }
};

// GET /api/conferences/:conferenceId/assignment-suggestions - Get AI-powered assignment suggestions
export const getAssignmentSuggestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conferenceId } = req.params;
    const { strategy = 'balanced' } = req.query;
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Verify conference access
    const conference = await prisma.conference.findUnique({
      where: { id: Number(conferenceId) },
      select: { createdById: true }
    });

    if (!conference) {
      res.status(404).json({ message: "Conference not found" });
      return;
    }

    if (!isAdmin(req) && conference.createdById !== userId) {
      res.status(403).json({ message: "Not authorized to view suggestions for this conference" });
      return;
    }

    // Get unassigned presentations and available slots
    const unassignedPresentations = await prisma.presentation.findMany({
      where: {
        section: {
          conferenceId: Number(conferenceId)
        },
        sectionId: null,
        reviewStatus: 'APPROVED'
      },
      include: {
        category: true,
        presentationType: true,
        authors: {
          include: { presenter: true },
          where: { isPresenter: true }
        }
      }
    });

    const availableSlots = await prisma.timeSlot.findMany({
      where: {
        section: {
          conferenceId: Number(conferenceId)
        },
        isOccupied: false
      },
      include: {
        section: {
          include: {
            category: true
          }
        }
      },
      orderBy: [
        { section: { order: 'asc' } },
        { order: 'asc' }
      ]
    });

    // Generate suggestions based on strategy
    const suggestions = [];

    if (strategy === 'balanced') {
      // Distribute presentations evenly across categories and time slots
      for (const presentation of unassignedPresentations) {
        // Find best matching slots (same category preferred)
        const categorySlots = availableSlots.filter(slot => 
          slot.section.category?.id === presentation.categoryId
        );
        
        const suggestedSlot = categorySlots.length > 0 ? categorySlots[0] : availableSlots[0];
        
        if (suggestedSlot) {
          suggestions.push({
            presentationId: presentation.id,
            presentationTitle: presentation.title,
            suggestedTimeSlotId: suggestedSlot.id,
            reason: categorySlots.length > 0 ? 'Category match' : 'Next available slot',
            confidence: categorySlots.length > 0 ? 0.9 : 0.6,
            timeSlot: {
              startTime: suggestedSlot.startTime,
              endTime: suggestedSlot.endTime,
              sectionName: suggestedSlot.section.name,
              categoryName: suggestedSlot.section.category?.name
            }
          });

          // Remove the slot from available slots to avoid double assignment
          const slotIndex = availableSlots.findIndex(s => s.id === suggestedSlot.id);
          if (slotIndex > -1) {
            availableSlots.splice(slotIndex, 1);
          }
        }
      }
    }

    res.json({
      strategy,
      totalUnassigned: unassignedPresentations.length,
      totalAvailableSlots: availableSlots.length,
      suggestions,
      canAutoAssign: suggestions.length > 0
    });

  } catch (error: any) {
    console.error("Error generating assignment suggestions:", error);
    res.status(500).json({ message: "Failed to generate suggestions", error: error.message });
  }
};