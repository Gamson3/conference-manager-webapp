// import { Request, Response } from "express";
// import prisma from '../lib/prisma';
// import { getUserId, isAdmin } from "../utils/authHelper";

// // GET /api/conferences/:conferenceId/presenters - Get all presenters for a conference
// export const getConferencePresenters = async (req: Request, res: Response): Promise<void> => {
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
//       res.status(403).json({ message: "Not authorized to view presenters for this conference" });
//       return;
//     }

//     // Get all presenters with their presentations and conflicts
//     const presenters = await prisma.presenter.findMany({
//       where: {
//         presentations: {
//           some: {
//             presentation: {
//               section: {
//                 conferenceId: Number(conferenceId)
//               }
//             }
//           }
//         }
//       },
//       include: {
//         presentations: {
//           include: {
//             presentation: {
//               select: {
//                 id: true,
//                 title: true,
//                 section: {
//                   select: {
//                     id: true,
//                     name: true,
//                     startTime: true,
//                     endTime: true
//                   }
//                 }
//               }
//             }
//           },
//           where: {
//             isPresenter: true // Only get presentations they're actually presenting
//           }
//         },
//         conflicts: {
//           orderBy: { createdAt: 'desc' }
//         },
//         _count: {
//           select: {
//             presentations: true,
//             conflicts: true
//           }
//         }
//       }
//     });

//     res.json(presenters);
//   } catch (error: any) {
//     console.error("Error fetching presenters:", error);
//     res.status(500).json({ message: "Failed to fetch presenters", error: error.message });
//   }
// };

// // POST /api/presenters - Create or find presenter
// export const createOrFindPresenter = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { userId: cognitoUserId, name, email, bio, affiliation } = req.body;
//     const requesterId = getUserId(req);

//     if (!requesterId) {
//       res.status(401).json({ message: "User not authenticated" });
//       return;
//     }

//     // Try to find existing presenter
//     let presenter = await prisma.presenter.findFirst({
//       where: {
//         OR: [
//           { userId: cognitoUserId },
//           { email: email }
//         ]
//       }
//     });

//     if (!presenter) {
//       // Create new presenter
//       presenter = await prisma.presenter.create({
//         data: {
//           userId: cognitoUserId || `external_${Date.now()}`,
//           name,
//           email,
//           bio,
//           affiliation
//         }
//       });
//     }

//     res.json(presenter);
//   } catch (error: any) {
//     console.error("Error creating/finding presenter:", error);
//     res.status(500).json({ message: "Failed to create presenter", error: error.message });
//   }
// };

// // POST /api/presenters/:id/conflicts - Add conflict for presenter
// export const addPresenterConflict = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const { 
//       conflictType, 
//       conflictDate, 
//       conflictStartTime, 
//       conflictEndTime, 
//       description 
//     } = req.body;
//     const userId = getUserId(req);

//     if (!userId) {
//       res.status(401).json({ message: "User not authenticated" });
//       return;
//     }

//     // Verify presenter exists
//     const presenter = await prisma.presenter.findUnique({
//       where: { id: Number(id) }
//     });

//     if (!presenter) {
//       res.status(404).json({ message: "Presenter not found" });
//       return;
//     }

//     const conflict = await prisma.presenterConflict.create({
//       data: {
//         presenterId: Number(id),
//         conflictType,
//         conflictDate: conflictDate ? new Date(conflictDate) : null,
//         conflictStartTime: conflictStartTime ? new Date(conflictStartTime) : null,
//         conflictEndTime: conflictEndTime ? new Date(conflictEndTime) : null,
//         description
//       }
//     });

//     res.status(201).json(conflict);
//   } catch (error: any) {
//     console.error("Error adding presenter conflict:", error);
//     res.status(500).json({ message: "Failed to add conflict", error: error.message });
//   }
// };

// // GET /api/presenters/:id/conflicts - Get conflicts for a presenter
// export const getPresenterConflicts = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const userId = getUserId(req);

//     if (!userId) {
//       res.status(401).json({ message: "User not authenticated" });
//       return;
//     }

//     const conflicts = await prisma.presenterConflict.findMany({
//       where: { presenterId: Number(id) },
//       orderBy: { createdAt: 'desc' }
//     });

//     res.json(conflicts);
//   } catch (error: any) {
//     console.error("Error fetching presenter conflicts:", error);
//     res.status(500).json({ message: "Failed to fetch conflicts", error: error.message });
//   }
// };

// // DELETE /api/presenter-conflicts/:id - Remove a specific conflict
// export const removePresenterConflict = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const userId = getUserId(req);

//     if (!userId) {
//       res.status(401).json({ message: "User not authenticated" });
//       return;
//     }

//     await prisma.presenterConflict.delete({
//       where: { id: Number(id) }
//     });

//     res.json({ message: "Conflict removed successfully" });
//   } catch (error: any) {
//     console.error("Error removing presenter conflict:", error);
//     res.status(500).json({ message: "Failed to remove conflict", error: error.message });
//   }
// };