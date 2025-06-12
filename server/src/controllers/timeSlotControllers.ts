// import { Request, Response } from "express";
// import prisma from '../lib/prisma';
// import { getUserId, isAdmin } from "../utils/authHelper";

// // GET /api/sections/:sectionId/time-slots - Get time slots for a section
// export const getSectionTimeSlots = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { sectionId } = req.params;
//     const userId = getUserId(req);

//     if (!userId) {
//       res.status(401).json({ message: "User not authenticated" });
//       return;
//     }

//     // Verify section access
//     const section = await prisma.section.findUnique({
//       where: { id: Number(sectionId) },
//       include: {
//         conference: { select: { createdById: true } }
//       }
//     });

//     if (!section) {
//       res.status(404).json({ message: "Section not found" });
//       return;
//     }

//     if (!isAdmin(req) && section.conference.createdById !== userId) {
//       res.status(403).json({ message: "Not authorized to view time slots for this section" });
//       return;
//     }

//     const timeSlots = await prisma.timeSlot.findMany({
//       where: { sectionId: Number(sectionId) },
//       include: {
//         presentation: {
//           include: {
//             authors: {
//               where: { isPresenter: true }
//             }
//           }
//         }
//       },
//       orderBy: { order: 'asc' }
//     });

//     res.json(timeSlots);
//   } catch (error: any) {
//     console.error("Error fetching time slots:", error);
//     res.status(500).json({ message: "Failed to fetch time slots", error: error.message });
//   }
// };

// // POST /api/sections/:sectionId/time-slots/generate - Generate time slots for a section
// export const generateTimeSlots = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { sectionId } = req.params;
//     const { 
//       slotDuration = 20, 
//       breakDuration = 10, 
//       startTime, 
//       endTime,
//       slotCount 
//     } = req.body;
//     const userId = getUserId(req);

//     if (!userId) {
//       res.status(401).json({ message: "User not authenticated" });
//       return;
//     }

//     // Verify section access and permissions
//     const section = await prisma.section.findUnique({
//       where: { id: Number(sectionId) },
//       include: {
//         conference: { select: { createdById: true } }
//       }
//     });

//     if (!section) {
//       res.status(404).json({ message: "Section not found" });
//       return;
//     }

//     if (!isAdmin(req) && section.conference.createdById !== userId) {
//       res.status(403).json({ message: "Not authorized to modify time slots for this section" });
//       return;
//     }

//     // Clear existing time slots
//     await prisma.timeSlot.deleteMany({
//       where: { sectionId: Number(sectionId) }
//     });

//     const slots = [];
//     let currentTime = new Date(startTime || section.startTime);
//     const sessionEndTime = new Date(endTime || section.endTime);

//     let order = 1;
    
//     // Generate slots based on count or time range
//     if (slotCount) {
//       // Generate specific number of slots
//       for (let i = 0; i < slotCount; i++) {
//         const slotEndTime = new Date(currentTime.getTime() + (slotDuration * 60000));
        
//         slots.push({
//           sectionId: Number(sectionId),
//           startTime: new Date(currentTime),
//           endTime: slotEndTime,
//           order: order++,
//           slotType: 'PRESENTATION' as const,
//           isOccupied: false
//         });

//         // Add break time if not the last slot
//         if (i < slotCount - 1) {
//           currentTime = new Date(slotEndTime.getTime() + (breakDuration * 60000));
//         }
//       }
//     } else {
//       // Generate slots to fill time range
//       while (currentTime < sessionEndTime) {
//         const slotEndTime = new Date(currentTime.getTime() + (slotDuration * 60000));
        
//         if (slotEndTime > sessionEndTime) break;

//         slots.push({
//           sectionId: Number(sectionId),
//           startTime: new Date(currentTime),
//           endTime: slotEndTime,
//           order: order++,
//           slotType: 'PRESENTATION' as const,
//           isOccupied: false
//         });

//         currentTime = new Date(slotEndTime.getTime() + (breakDuration * 60000));
//       }
//     }

//     // Create all time slots
//     const createdSlots = await Promise.all(
//       slots.map(slot => prisma.timeSlot.create({ data: slot }))
//     );

//     res.json({
//       message: `Generated ${createdSlots.length} time slots`,
//       timeSlots: createdSlots
//     });

//   } catch (error: any) {
//     console.error("Error generating time slots:", error);
//     res.status(500).json({ message: "Failed to generate time slots", error: error.message });
//   }
// };

// // POST /api/time-slots/:id/assign - Assign presentation to time slot
// export const assignPresentationToTimeSlot = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const { presentationId } = req.body;
//     const userId = getUserId(req);

//     if (!userId) {
//       res.status(401).json({ message: "User not authenticated" });
//       return;
//     }

//     // Verify time slot exists
//     const timeSlot = await prisma.timeSlot.findUnique({
//       where: { id: Number(id) },
//       include: {
//         section: {
//           include: {
//             conference: { select: { createdById: true } }
//           }
//         }
//       }
//     });

//     if (!timeSlot) {
//       res.status(404).json({ message: "Time slot not found" });
//       return;
//     }

//     if (!isAdmin(req) && timeSlot.section.conference.createdById !== userId) {
//       res.status(403).json({ message: "Not authorized to modify this time slot" });
//       return;
//     }

//     // Check if slot is already occupied
//     if (timeSlot.isOccupied && timeSlot.presentationId) {
//       res.status(409).json({ message: "Time slot is already occupied" });
//       return;
//     }

//     // Verify presentation exists
//     const presentation = await prisma.presentation.findUnique({
//       where: { id: Number(presentationId) }
//     });

//     if (!presentation) {
//       res.status(404).json({ message: "Presentation not found" });
//       return;
//     }

//     // Update time slot and presentation
//     await prisma.$transaction([
//       prisma.timeSlot.update({
//         where: { id: Number(id) },
//         data: {
//           presentationId: Number(presentationId),
//           isOccupied: true
//         }
//       }),
//       prisma.presentation.update({
//         where: { id: Number(presentationId) },
//         data: {
//           sectionId: timeSlot.sectionId,
//           assignedAt: new Date()
//         }
//       })
//     ]);

//     res.json({ message: "Presentation assigned to time slot successfully" });

//   } catch (error: any) {
//     console.error("Error assigning presentation to time slot:", error);
//     res.status(500).json({ message: "Failed to assign presentation", error: error.message });
//   }
// };

// // DELETE /api/time-slots/:id/unassign - Remove presentation from time slot
// export const unassignPresentationFromTimeSlot = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const userId = getUserId(req);

//     if (!userId) {
//       res.status(401).json({ message: "User not authenticated" });
//       return;
//     }

//     const timeSlot = await prisma.timeSlot.findUnique({
//       where: { id: Number(id) },
//       include: {
//         section: {
//           include: {
//             conference: { select: { createdById: true } }
//           }
//         }
//       }
//     });

//     if (!timeSlot) {
//       res.status(404).json({ message: "Time slot not found" });
//       return;
//     }

//     if (!isAdmin(req) && timeSlot.section.conference.createdById !== userId) {
//       res.status(403).json({ message: "Not authorized to modify this time slot" });
//       return;
//     }

//     await prisma.timeSlot.update({
//       where: { id: Number(id) },
//       data: {
//         presentationId: null,
//         isOccupied: false
//       }
//     });

//     res.json({ message: "Presentation unassigned from time slot successfully" });

//   } catch (error: any) {
//     console.error("Error unassigning presentation:", error);
//     res.status(500).json({ message: "Failed to unassign presentation", error: error.message });
//   }
// };