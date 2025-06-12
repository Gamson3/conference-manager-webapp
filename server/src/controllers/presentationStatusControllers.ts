// import { Request, Response } from "express";
// import prisma from '../lib/prisma';
// import { getUserId, isAdmin } from "../utils/authHelper";

// // GET /api/conferences/:conferenceId/presentations/by-status - Get presentations grouped by review status
// export const getPresentationsByStatus = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { conferenceId } = req.params;
//     const { status } = req.query;
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
//       res.status(403).json({ message: "Not authorized to view presentations for this conference" });
//       return;
//     }

//     let whereClause: any = {
//       section: {
//         conferenceId: Number(conferenceId)
//       }
//     };

//     if (status && status !== 'all') {
//       whereClause.reviewStatus = status;
//     }

//     const presentations = await prisma.presentation.findMany({
//       where: whereClause,
//       include: {
//         category: true,
//         presentationType: true,
//         authors: {
//           include: {
//             presenter: true
//           },
//           where: { isPresenter: true }
//         },
//         section: {
//           select: {
//             id: true,
//             name: true,
//             startTime: true,
//             endTime: true,
//             room: true
//           }
//         },
//         timeSlot: true,
//         _count: {
//           select: {
//             materials: true,
//             feedback: true
//           }
//         }
//       },
//       orderBy: [
//         { reviewStatus: 'asc' },
//         { category: { order: 'asc' } },
//         { order: 'asc' }
//       ]
//     });

//     // Group by status
//     const groupedByStatus = presentations.reduce((acc: any, presentation) => {
//       const status = presentation.reviewStatus;
//       if (!acc[status]) {
//         acc[status] = [];
//       }
//       acc[status].push(presentation);
//       return acc;
//     }, {});

//     // Calculate statistics
//     const statistics = {
//       total: presentations.length,
//       pending: groupedByStatus.PENDING?.length || 0,
//       approved: groupedByStatus.APPROVED?.length || 0,
//       rejected: groupedByStatus.REJECTED?.length || 0,
//       revisionRequested: groupedByStatus.REVISION_REQUESTED?.length || 0
//     };

//     res.json({
//       statistics,
//       presentations: status ? presentations : groupedByStatus,
//       flat: presentations
//     });

//   } catch (error: any) {
//     console.error("Error fetching presentations by status:", error);
//     res.status(500).json({ message: "Failed to fetch presentations", error: error.message });
//   }
// };

// // PUT /api/presentations/:id/status - Update presentation review status
// export const updatePresentationStatus = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const { reviewStatus, reviewComments } = req.body;
//     const userId = getUserId(req);

//     if (!userId) {
//       res.status(401).json({ message: "User not authenticated" });
//       return;
//     }

//     // Verify presentation exists and user has permission
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

//     if (!isAdmin(req) && presentation.section?.conference.createdById !== userId) {
//       res.status(403).json({ message: "Not authorized to update this presentation" });
//       return;
//     }

//     // Validate status
//     const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED'];
//     if (!validStatuses.includes(reviewStatus)) {
//       res.status(400).json({ message: "Invalid review status" });
//       return;
//     }

//     const updatedPresentation = await prisma.presentation.update({
//       where: { id: Number(id) },
//       data: {
//         reviewStatus,
//         reviewComments: reviewComments || null,
//         reviewedAt: new Date(),
//         reviewedById: userId // You might want to add this field to track who reviewed
//       },
//       include: {
//         category: true,
//         presentationType: true,
//         authors: {
//           include: { presenter: true },
//           where: { isPresenter: true }
//         }
//       }
//     });

//     res.json({
//       message: "Presentation status updated successfully",
//       presentation: updatedPresentation
//     });

//   } catch (error: any) {
//     console.error("Error updating presentation status:", error);
//     res.status(500).json({ message: "Failed to update presentation status", error: error.message });
//   }
// };

// // POST /api/presentations/bulk-status-update - Bulk update presentation statuses
// export const bulkUpdatePresentationStatus = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { presentationIds, reviewStatus, reviewComments } = req.body;
//     const userId = getUserId(req);

//     if (!userId) {
//       res.status(401).json({ message: "User not authenticated" });
//       return;
//     }

//     if (!Array.isArray(presentationIds) || presentationIds.length === 0) {
//       res.status(400).json({ message: "Presentation IDs array is required" });
//       return;
//     }

//     // Validate status
//     const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED'];
//     if (!validStatuses.includes(reviewStatus)) {
//       res.status(400).json({ message: "Invalid review status" });
//       return;
//     }

//     // Verify all presentations exist and user has permission
//     const presentations = await prisma.presentation.findMany({
//       where: {
//         id: { in: presentationIds.map(id => Number(id)) }
//       },
//       include: {
//         section: {
//           include: {
//             conference: { select: { createdById: true } }
//           }
//         }
//       }
//     });

//     // Check permissions for each presentation
//     const unauthorizedPresentations = presentations.filter(p => 
//       !isAdmin(req) && p.section?.conference.createdById !== userId
//     );

//     if (unauthorizedPresentations.length > 0) {
//       res.status(403).json({ 
//         message: "Not authorized to update some presentations",
//         unauthorizedIds: unauthorizedPresentations.map(p => p.id)
//       });
//       return;
//     }

//     // Perform bulk update
//     const result = await prisma.presentation.updateMany({
//       where: {
//         id: { in: presentationIds.map(id => Number(id)) }
//       },
//       data: {
//         reviewStatus,
//         reviewComments: reviewComments || null,
//         reviewedAt: new Date()
//         // Note: Can't set reviewedById in updateMany, would need individual updates
//       }
//     });

//     res.json({
//       message: `Successfully updated ${result.count} presentations`,
//       updatedCount: result.count,
//       requestedCount: presentationIds.length
//     });

//   } catch (error: any) {
//     console.error("Error in bulk status update:", error);
//     res.status(500).json({ message: "Failed to update presentation statuses", error: error.message });
//   }
// };