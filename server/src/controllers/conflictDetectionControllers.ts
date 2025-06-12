// import { Request, Response } from "express";
// import prisma from '../lib/prisma';
// import { getUserId, isAdmin } from "../utils/authHelper";

// interface ConflictDetail {
//   type: 'PRESENTER_TIME_CONFLICT' | 'PRESENTER_DECLARED_CONFLICT' | 'ROOM_CONFLICT';
//   severity: 'BLOCKING' | 'WARNING';
//   presenterId?: number;
//   presenterName?: string;
//   conflictingPresentation?: string;
//   conflictingCategory?: string;
//   conflictingSession?: string;
//   conflictTimeSlot?: any;
//   message: string;
//   details?: any;
// }

// interface ConflictDetectionResult {
//   hasConflicts: boolean;
//   conflicts: ConflictDetail[];
//   canProceed: boolean;
// }

// // Helper function to check time overlap
// const checkTimeOverlap = (
//   start1: Date, end1: Date, 
//   start2: Date, end2: Date
// ): boolean => {
//   return (start1 < end2) && (end1 > start2);
// };

// // Core conflict detection function
// const detectConflictsForAssignment = async (
//   presentationId: number,
//   proposedSectionId: number
// ): Promise<ConflictDetectionResult> => {
  
//   // Get presentation with all its presenters
//   const presentation = await prisma.presentation.findUnique({
//     where: { id: presentationId },
//     include: {
//       authors: {
//         where: { isPresenter: true },
//         include: {
//           presenter: {
//             include: {
//               presentations: {
//                 include: {
//                   presentation: {
//                     include: {
//                       section: {
//                         include: {
//                           category: { select: { name: true } }
//                         }
//                       }
//                     }
//                   }
//                 }
//               },
//               conflicts: true
//             }
//           }
//         }
//       }
//     }
//   });

//   if (!presentation) {
//     throw new Error("Presentation not found");
//   }

//   // Get the proposed section details
//   const proposedSection = await prisma.section.findUnique({
//     where: { id: proposedSectionId },
//     include: {
//       category: { select: { name: true } }
//     }
//   });

//   if (!proposedSection) {
//     throw new Error("Section not found");
//   }

//   const conflicts: ConflictDetail[] = [];

//   // Check each presenter for conflicts
//   for (const authorRelation of presentation.authors) {
//     if (!authorRelation.presenter) continue;

//     const presenter = authorRelation.presenter;
    
//     // 1. Check for time conflicts with other presentations
//     for (const otherAuthorRelation of presenter.presentations) {
//       const otherPresentation = otherAuthorRelation.presentation;
      
//       // Skip if it's the same presentation or no section assigned
//       if (otherPresentation.id === presentationId || !otherPresentation.section) {
//         continue;
//       }

//       // Check for time overlap if both sections have times
//       if (proposedSection.startTime && proposedSection.endTime && 
//           otherPresentation.section.startTime && otherPresentation.section.endTime) {
        
//         if (checkTimeOverlap(
//           proposedSection.startTime, proposedSection.endTime,
//           otherPresentation.section.startTime, otherPresentation.section.endTime
//         )) {
//           conflicts.push({
//             type: 'PRESENTER_TIME_CONFLICT',
//             severity: 'BLOCKING',
//             presenterId: presenter.id,
//             presenterName: presenter.name,
//             conflictingPresentation: otherPresentation.title,
//             conflictingCategory: otherPresentation.section.category?.name,
//             conflictingSession: otherPresentation.section.name,
//             conflictTimeSlot: {
//               startTime: otherPresentation.section.startTime,
//               endTime: otherPresentation.section.endTime
//             },
//             message: `${presenter.name} is already presenting "${otherPresentation.title}" in ${otherPresentation.section.category?.name || 'another category'} at the same time`
//           });
//         }
//       }
//     }

//     // 2. Check for declared conflicts
//     for (const conflict of presenter.conflicts) {
//       if (proposedSection.startTime && proposedSection.endTime) {
//         let hasConflict = false;
//         let conflictMessage = '';

//         switch (conflict.conflictType) {
//           case 'TIME_SLOT':
//             if (conflict.conflictStartTime && conflict.conflictEndTime) {
//               if (checkTimeOverlap(
//                 proposedSection.startTime, proposedSection.endTime,
//                 conflict.conflictStartTime, conflict.conflictEndTime
//               )) {
//                 hasConflict = true;
//                 conflictMessage = `${presenter.name} has a declared time conflict: ${conflict.description}`;
//               }
//             }
//             break;
          
//           case 'FULL_DAY':
//             if (conflict.conflictDate) {
//               const proposedDate = proposedSection.startTime.toDateString();
//               const conflictDate = conflict.conflictDate.toDateString();
//               if (proposedDate === conflictDate) {
//                 hasConflict = true;
//                 conflictMessage = `${presenter.name} is unavailable on ${conflictDate}: ${conflict.description}`;
//               }
//             }
//             break;
//         }

//         if (hasConflict) {
//           conflicts.push({
//             type: 'PRESENTER_DECLARED_CONFLICT',
//             severity: 'BLOCKING',
//             presenterId: presenter.id,
//             presenterName: presenter.name,
//             message: conflictMessage,
//             details: conflict
//           });
//         }
//       }
//     }
//   }

//   return {
//     hasConflicts: conflicts.length > 0,
//     conflicts,
//     canProceed: conflicts.filter(c => c.severity === 'BLOCKING').length === 0
//   };
// };

// // POST /api/presentations/:id/check-conflicts - Check conflicts for presentation assignment
// export const checkPresentationConflicts = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const { sectionId } = req.body;
//     const userId = getUserId(req);

//     if (!userId) {
//       res.status(401).json({ message: "User not authenticated" });
//       return;
//     }

//     if (!sectionId) {
//       res.status(400).json({ message: "Section ID is required" });
//       return;
//     }

//     const conflictResult = await detectConflictsForAssignment(
//       Number(id), 
//       Number(sectionId)
//     );

//     res.json(conflictResult);

//   } catch (error: any) {
//     console.error('Error checking conflicts:', error);
//     res.status(500).json({ 
//       message: 'Failed to check conflicts', 
//       error: error.message 
//     });
//   }
// };

// // POST /api/presentations/:id/assign-with-conflict-check - Assign presentation with conflict checking
// export const assignPresentationWithConflictCheck = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const { sectionId, forceAssign = false } = req.body;
//     const userId = getUserId(req);

//     if (!userId) {
//       res.status(401).json({ message: "User not authenticated" });
//       return;
//     }

//     // Verify user has permission
//     const presentation = await prisma.presentation.findUnique({
//       where: { id: Number(id) },
//       include: {
//         section: {
//           include: {
//             conference: { select: { createdById: true } }
//           }
//         }
//       }
//     });

//     if (!presentation) {
//       res.status(404).json({ message: "Presentation not found" });
//       return;
//     }

//     // Check permissions through either current or target section
//     let hasPermission = false;
//     if (presentation.section) {
//       hasPermission = isAdmin(req) || presentation.section.conference.createdById === userId;
//     } else {
//       // Check target section
//       const targetSection = await prisma.section.findUnique({
//         where: { id: Number(sectionId) },
//         include: { conference: { select: { createdById: true } } }
//       });
//       hasPermission = isAdmin(req) || targetSection?.conference.createdById === userId;
//     }

//     if (!hasPermission) {
//       res.status(403).json({ message: "Not authorized to assign this presentation" });
//       return;
//     }

//     // Check for conflicts first
//     const conflictResult = await detectConflictsForAssignment(
//       Number(id), 
//       Number(sectionId)
//     );

//     // If there are blocking conflicts and not forcing, return conflicts
//     if (conflictResult.hasConflicts && !forceAssign) {
//       const blockingConflicts = conflictResult.conflicts.filter(c => c.severity === 'BLOCKING');
//       if (blockingConflicts.length > 0) {
//         res.status(409).json({
//           message: "Scheduling conflicts detected",
//           conflicts: conflictResult.conflicts,
//           canForceAssign: true
//         });
//         return;
//       }
//     }

//     // Proceed with assignment
//     await prisma.presentation.update({
//       where: { id: Number(id) },
//       data: {
//         sectionId: Number(sectionId),
//         assignedAt: new Date()
//       }
//     });

//     res.json({ 
//       message: "Presentation assigned successfully",
//       warnings: conflictResult.conflicts.filter(c => c.severity === 'WARNING')
//     });

//   } catch (error: any) {
//     console.error('Error assigning presentation:', error);
//     res.status(500).json({ 
//       message: 'Failed to assign presentation', 
//       error: error.message 
//     });
//   }
// };

// // GET /api/conferences/:conferenceId/conflicts/summary - Get conflict summary for conference
// export const getConferenceConflictSummary = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { conferenceId } = req.params;
//     const userId = getUserId(req);

//     if (!userId) {
//       res.status(401).json({ message: "User not authenticated" });
//       return;
//     }

//     // Verify conference access
//     const conference = await prisma.conference.findUnique({
//       where: { id: Number(conferenceId) },
//       select: { createdById: true }
//     });

//     if (!conference) {
//       res.status(404).json({ message: "Conference not found" });
//       return;
//     }

//     if (!isAdmin(req) && conference.createdById !== userId) {
//       res.status(403).json({ message: "Not authorized to view conflicts for this conference" });
//       return;
//     }

//     // Get all presentations in the conference with their sections
//     const presentations = await prisma.presentation.findMany({
//       where: {
//         section: {
//           conferenceId: Number(conferenceId)
//         }
//       },
//       include: {
//         section: {
//           include: { category: true }
//         },
//         authors: {
//           where: { isPresenter: true },
//           include: { presenter: true }
//         }
//       }
//     });

//     const conflicts: any[] = [];
//     const processedPairs = new Set<string>();

//     // Check each presentation against others
//     for (const presentation of presentations) {
//       for (const otherPresentation of presentations) {
//         if (presentation.id >= otherPresentation.id) continue;

//         const pairKey = `${Math.min(presentation.id, otherPresentation.id)}-${Math.max(presentation.id, otherPresentation.id)}`;
//         if (processedPairs.has(pairKey)) continue;
//         processedPairs.add(pairKey);

//         // Check for presenter conflicts
//         const presentersA = presentation.authors.filter(a => a.isPresenter && a.presenter);
//         const presentersB = otherPresentation.authors.filter(a => a.isPresenter && a.presenter);

//         for (const presenterA of presentersA) {
//           for (const presenterB of presentersB) {
//             if (presenterA.presenter?.id === presenterB.presenter?.id && presenterA.presenter) {
//               // Same presenter in different presentations
//               if (presentation.section && otherPresentation.section &&
//                   presentation.section.startTime && presentation.section.endTime &&
//                   otherPresentation.section.startTime && otherPresentation.section.endTime) {
                
//                 if (checkTimeOverlap(
//                   presentation.section.startTime, presentation.section.endTime,
//                   otherPresentation.section.startTime, otherPresentation.section.endTime
//                 )) {
//                   conflicts.push({
//                     type: 'PRESENTER_DOUBLE_BOOKING',
//                     severity: 'BLOCKING',
//                     presenterId: presenterA.presenter.id,
//                     presenterName: presenterA.presenter.name,
//                     presentation1: {
//                       id: presentation.id,
//                       title: presentation.title,
//                       section: presentation.section.name,
//                       category: presentation.section.category?.name,
//                       time: {
//                         start: presentation.section.startTime,
//                         end: presentation.section.endTime
//                       }
//                     },
//                     presentation2: {
//                       id: otherPresentation.id,
//                       title: otherPresentation.title,
//                       section: otherPresentation.section.name,
//                       category: otherPresentation.section.category?.name,
//                       time: {
//                         start: otherPresentation.section.startTime,
//                         end: otherPresentation.section.endTime
//                       }
//                     }
//                   });
//                 }
//               }
//             }
//           }
//         }
//       }
//     }

//     res.json({
//       totalConflicts: conflicts.length,
//       blockingConflicts: conflicts.filter(c => c.severity === 'BLOCKING').length,
//       warningConflicts: conflicts.filter(c => c.severity === 'WARNING').length,
//       conflicts
//     });

//   } catch (error: any) {
//     console.error('Error getting conflict summary:', error);
//     res.status(500).json({ 
//       message: 'Failed to get conflict summary', 
//       error: error.message 
//     });
//   }
// };