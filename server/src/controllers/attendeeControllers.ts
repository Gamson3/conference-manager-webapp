// import { Request, Response } from "express";
// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

// // Get attendee profile
// export const getAttendeeProfile = async (req: Request, res: Response) => {
//   try {
//     const cognitoId = req.user?.id;
    
//     if (!cognitoId) {
//       return res.status(401).json({ message: "User not authenticated" });
//     }
    
//     const user = await prisma.user.findUnique({
//       where: { cognitoId },
//       include: {
//         attendances: {
//           include: {
//             conference: true
//           }
//         },
//         favorites: {
//           include: {
//             presentation: true
//           }
//         }
//       }
//     });
    
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
    
//     // Calculate summary data
//     const registeredConferences = user.attendances;
//     const upcomingConferences = registeredConferences.filter(
//       attendance => new Date(attendance.conference.endDate) >= new Date()
//     ).length;
    
//     const connections = 0; // This would be calculated from a connections table
//     const pendingFeedback = 0; // This would be calculated from feedback status
//     const unreadMaterials = 0; // This would be calculated from materials status
    
//     res.json({
//       id: user.id,
//       name: user.name,
//       email: user.email,
//       avatarUrl: user.avatarUrl || null,
//       organization: user.organization || null,
//       jobTitle: user.jobTitle || null,
//       bio: user.bio || null,
//       phoneNumber: user.phoneNumber || null,
//       preferences: user.preferences || {},
//       interests: user.interests || [],
//       registeredConferences: registeredConferences.map(att => att.conference),
//       upcomingConferences,
//       connections,
//       pendingFeedback,
//       unreadMaterials,
//       attendedEvents: registeredConferences.filter(
//         attendance => new Date(attendance.conference.endDate) < new Date()
//       ).length,
//     });
//   } catch (error: any) {
//     console.error("Error fetching attendee profile:", error);
//     res.status(500).json({ message: "Failed to load profile", error: error.message });
//   }
// };

// // Update attendee profile
// export const updateAttendeeProfile = async (req: Request, res: Response) => {
//   try {
//     const cognitoId = req.user?.id;
    
//     if (!cognitoId) {
//       return res.status(401).json({ message: "User not authenticated" });
//     }
    
//     const { 
//       name, 
//       email, 
//       phoneNumber, 
//       bio, 
//       organization, 
//       jobTitle, 
//       interests, 
//       preferences 
//     } = req.body;
    
//     const updatedUser = await prisma.user.update({
//       where: { cognitoId },
//       data: {
//         name: name,
//         email: email,
//         phoneNumber: phoneNumber,
//         bio: bio,
//         organization: organization,
//         jobTitle: jobTitle,
//         interests: interests,
//         preferences: preferences
//       }
//     });
    
//     res.json(updatedUser);
//   } catch (error: any) {
//     console.error("Error updating attendee profile:", error);
//     res.status(500).json({ message: "Failed to update profile", error: error.message });
//   }
// };

// // Get attendee notifications
// export const getAttendeeNotifications = async (req: Request, res: Response) => {
//   try {
//     const cognitoId = req.user?.id;
    
//     if (!cognitoId) {
//       return res.status(401).json({ message: "User not authenticated" });
//     }
    
//     const user = await prisma.user.findUnique({
//       where: { cognitoId }
//     });
    
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
    
//     // Fetch notifications - would be from a notifications table
//     const notifications = await prisma.notification.findMany({
//       where: { userId: user.id },
//       orderBy: { createdAt: 'desc' }
//     });
    
//     res.json(notifications);
//   } catch (error: any) {
//     console.error("Error fetching notifications:", error);
//     res.status(500).json({ message: "Failed to load notifications", error: error.message });
//   }
// };

// // Get upcoming conferences
// export const getUpcomingConferences = async (req: Request, res: Response) => {
//   try {
//     const cognitoId = req.user?.id;
    
//     if (!cognitoId) {
//       return res.status(401).json({ message: "User not authenticated" });
//     }
    
//     // Find all conferences that have not ended yet
//     const conferences = await prisma.conference.findMany({
//       where: {
//         endDate: {
//           gte: new Date()
//         }
//       },
//       orderBy: {
//         startDate: 'asc'
//       }
//     });
    
//     // Get user's already registered conferences
//     const user = await prisma.user.findUnique({
//       where: { cognitoId },
//       include: {
//         attendances: true
//       }
//     });
    
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
    
//     const registeredConferenceIds = user.attendances.map(a => a.conferenceId);
    
//     // Filter out conferences the user is already registered for
//     const upcomingConferences = conferences.filter(
//       conf => !registeredConferenceIds.includes(conf.id)
//     ).map(conf => ({
//       id: conf.id,
//       title: conf.name,
//       description: conf.description || "",
//       startDate: conf.startDate,
//       endDate: conf.endDate,
//       location: conf.location || "",
//       organizer: conf.organizer || "",
//       topics: conf.topics || []
//     }));
    
//     res.json(upcomingConferences);
//   } catch (error: any) {
//     console.error("Error fetching upcoming conferences:", error);
//     res.status(500).json({ message: "Failed to load conferences", error: error.message });
//   }
// };

// // Register for a conference
// export const registerForConference = async (req: Request, res: Response) => {
//   try {
//     const cognitoId = req.user?.id;
//     const { conferenceId } = req.body;
    
//     if (!cognitoId) {
//       return res.status(401).json({ message: "User not authenticated" });
//     }
    
//     if (!conferenceId) {
//       return res.status(400).json({ message: "Conference ID is required" });
//     }
    
//     const user = await prisma.user.findUnique({
//       where: { cognitoId }
//     });
    
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
    
//     // Check if already registered
//     const existingRegistration = await prisma.attendance.findFirst({
//       where: {
//         userId: user.id,
//         conferenceId: parseInt(conferenceId)
//       }
//     });
    
//     if (existingRegistration) {
//       return res.status(400).json({ message: "Already registered for this conference" });
//     }
    
//     // Create registration
//     const registration = await prisma.attendance.create({
//       data: {
//         userId: user.id,
//         conferenceId: parseInt(conferenceId),
//         registrationId: `REG-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
//         registrationDate: new Date()
//       },
//       include: {
//         conference: true
//       }
//     });
    
//     res.status(201).json(registration);
//   } catch (error: any) {
//     console.error("Error registering for conference:", error);
//     res.status(500).json({ message: "Failed to register for conference", error: error.message });
//   }
// };

// // Get attendee's registered events
// export const getAttendeeEvents = async (req: Request, res: Response) => {
//   try {
//     const cognitoId = req.user?.id;
    
//     if (!cognitoId) {
//       return res.status(401).json({ message: "User not authenticated" });
//     }
    
//     const user = await prisma.user.findUnique({
//       where: { cognitoId },
//       include: {
//         attendances: {
//           include: {
//             conference: true
//           }
//         }
//       }
//     });
    
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
    
//     const now = new Date();
    
//     // Map and categorize events
//     const events = user.attendances.map(attendance => {
//       const conference = attendance.conference;
//       let status: 'upcoming' | 'active' | 'past' = 'upcoming';
      
//       if (now > new Date(conference.endDate)) {
//         status = 'past';
//       } else if (now >= new Date(conference.startDate) && now <= new Date(conference.endDate)) {
//         status = 'active';
//       }
      
//       return {
//         id: conference.id,
//         title: conference.name,
//         description: conference.description || "",
//         startDate: conference.startDate,
//         endDate: conference.endDate,
//         location: conference.location || "",
//         organizer: conference.organizer || "",
//         registrationDate: attendance.registrationDate,
//         registrationId: attendance.registrationId,
//         status
//       };
//     });
    
//     res.json(events);
//   } catch (error: any) {
//     console.error("Error fetching attendee events:", error);
//     res.status(500).json({ message: "Failed to load events", error: error.message });
//   }
// };

// // Get specific event details
// export const getEventDetails = async (req: Request, res: Response) => {
//   try {
//     const cognitoId = req.user?.id;
//     const eventId = parseInt(req.params.id);
    
//     if (!cognitoId) {
//       return res.status(401).json({ message: "User not authenticated" });
//     }
    
//     if (isNaN(eventId)) {
//       return res.status(400).json({ message: "Invalid event ID" });
//     }
    
//     const user = await prisma.user.findUnique({
//       where: { cognitoId }
//     });
    
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
    
//     // Check if user is registered for this event
//     const attendance = await prisma.attendance.findFirst({
//       where: {
//         userId: user.id,
//         conferenceId: eventId
//       }
//     });
    
//     if (!attendance) {
//       return res.status(403).json({ message: "Not registered for this event" });
//     }
    
//     // Get conference details
//     const conference = await prisma.conference.findUnique({
//       where: { id: eventId },
//       include: {
//         sessions: {
//           include: {
//             speaker: true
//           }
//         },
//         materials: true
//       }
//     });
    
//     if (!conference) {
//       return res.status(404).json({ message: "Event not found" });
//     }
    
//     // Format response
//     res.json({
//       id: conference.id,
//       title: conference.name,
//       description: conference.description,
//       startDate: conference.startDate,
//       endDate: conference.endDate,
//       location: conference.location,
//       organizer: conference.organizer,
//       venue: {
//         name: conference.venueName || "TBD",
//         address: conference.venueAddress || "TBD",
//         room: conference.venueRoom
//       },
//       sessions: conference.sessions.map(session => ({
//         id: session.id,
//         title: session.title,
//         description: session.description,
//         startTime: session.startTime,
//         endTime: session.endTime,
//         location: session.location,
//         speakerId: session.speakerId
//       })),
//       speakers: conference.sessions.map(session => session.speaker).filter(Boolean),
//       materials: conference.materials.map(material => ({
//         id: material.id,
//         title: material.title,
//         type: material.type,
//         url: material.url,
//         uploadDate: material.uploadDate
//       })),
//       registrationId: attendance.registrationId,
//       registrationDate: attendance.registrationDate
//     });
//   } catch (error: any) {
//     console.error("Error fetching event details:", error);
//     res.status(500).json({ message: "Failed to load event details", error: error.message });
//   }
// };

// // Cancel registration
// export const cancelRegistration = async (req: Request, res: Response) => {
//   try {
//     const cognitoId = req.user?.id;
//     const registrationId = parseInt(req.params.id);
    
//     if (!cognitoId) {
//       return res.status(401).json({ message: "User not authenticated" });
//     }
    
//     if (isNaN(registrationId)) {
//       return res.status(400).json({ message: "Invalid registration ID" });
//     }
    
//     const user = await prisma.user.findUnique({
//       where: { cognitoId }
//     });
    
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
    
//     // Check if registration exists and belongs to user
//     const attendance = await prisma.attendance.findFirst({
//       where: {
//         id: registrationId,
//         userId: user.id
//       },
//       include: {
//         conference: true
//       }
//     });
    
//     if (!attendance) {
//       return res.status(404).json({ message: "Registration not found" });
//     }
    
//     // Check if conference has already started
//     if (new Date() > new Date(attendance.conference.startDate)) {
//       return res.status(400).json({ message: "Cannot cancel registration for an ongoing or past event" });
//     }
    
//     // Delete registration
//     await prisma.attendance.delete({
//       where: { id: registrationId }
//     });
    
//     res.json({ message: "Registration cancelled successfully" });
//   } catch (error: any) {
//     console.error("Error cancelling registration:", error);
//     res.status(500).json({ message: "Failed to cancel registration", error: error.message });
//   }
// };

// // Get favorite conferences
// export const getFavorites = async (req: Request, res: Response) => {
//   try {
//     const cognitoId = req.user?.id;
    
//     if (!cognitoId) {
//       return res.status(401).json({ message: "User not authenticated" });
//     }
    
//     const user = await prisma.user.findUnique({
//       where: { cognitoId },
//       include: {
//         favorites: {
//           include: {
//             conference: true
//           }
//         }
//       }
//     });
    
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
    
//     const favorites = user.favorites.map(favorite => {
//       const conference = favorite.conference;
//       return {
//         id: conference.id,
//         title: conference.name,
//         description: conference.description || "",
//         startDate: conference.startDate,
//         endDate: conference.endDate,
//         location: conference.location || "",
//         organizer: conference.organizer || "",
//         topics: conference.topics || []
//       };
//     });
    
//     res.json(favorites);
//   } catch (error: any) {
//     console.error("Error fetching favorites:", error);
//     res.status(500).json({ message: "Failed to load favorites", error: error.message });
//   }
// };

// // Add to favorites
// export const addToFavorites = async (req: Request, res: Response) => {
//   try {
//     const cognitoId = req.user?.id;
//     const conferenceId = parseInt(req.params.conferenceId);
    
//     if (!cognitoId) {
//       return res.status(401).json({ message: "User not authenticated" });
//     }
    
//     if (isNaN(conferenceId)) {
//       return res.status(400).json({ message: "Invalid conference ID" });
//     }
    
//     const user = await prisma.user.findUnique({
//       where: { cognitoId }
//     });
    
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
    
//     // Check if already favorited
//     const existingFavorite = await prisma.favorite.findFirst({
//       where: {
//         userId: user.id,
//         conferenceId: conferenceId
//       }
//     });
    
//     if (existingFavorite) {
//       return res.status(400).json({ message: "Conference already in favorites" });
//     }
    
//     // Add to favorites
//     const favorite = await prisma.favorite.create({
//       data: {
//         userId: user.id,
//         conferenceId: conferenceId
//       },
//       include: {
//         conference: true
//       }
//     });
    
//     res.status(201).json(favorite);
//   } catch (error: any) {
//     console.error("Error adding to favorites:", error);
//     res.status(500).json({ message: "Failed to add to favorites", error: error.message });
//   }
// };

// // Remove from favorites
// export const removeFromFavorites = async (req: Request, res: Response) => {
//   try {
//     const cognitoId = req.user?.id;
//     const conferenceId = parseInt(req.params.conferenceId);
    
//     if (!cognitoId) {
//       return res.status(401).json({ message: "User not authenticated" });
//     }
    
//     if (isNaN(conferenceId)) {
//       return res.status(400).json({ message: "Invalid conference ID" });
//     }
    
//     const user = await prisma.user.findUnique({
//       where: { cognitoId }
//     });
    
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
    
//     // Find the favorite
//     const favorite = await prisma.favorite.findFirst({
//       where: {
//         userId: user.id,
//         conferenceId: conferenceId
//       }
//     });
    
//     if (!favorite) {
//       return res.status(404).json({ message: "Conference not found in favorites" });
//     }
    
//     // Remove from favorites
//     await prisma.favorite.delete({
//       where: { id: favorite.id }
//     });
    
//     res.json({ message: "Removed from favorites successfully" });
//   } catch (error: any) {
//     console.error("Error removing from favorites:", error);
//     res.status(500).json({ message: "Failed to remove from favorites", error: error.message });
//   }
// };

// // Get attended sessions that need feedback
// export const getAttendedSessions = async (req: Request, res: Response) => {
//   try {
//     const cognitoId = req.user?.id;
    
//     if (!cognitoId) {
//       return res.status(401).json({ message: "User not authenticated" });
//     }
    
//     const user = await prisma.user.findUnique({
//       where: { cognitoId },
//       include: {
//         attendances: {
//           include: {
//             conference: {
//               include: {
//                 sessions: true
//               }
//             }
//           }
//         },
//         sessionFeedbacks: true
//       }
//     });
    
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
    
//     // Get past attendances
//     const pastAttendances = user.attendances.filter(
//       attendance => new Date(attendance.conference.endDate) < new Date()
//     );
    
//     // Get all sessions from past conferences
//     const allSessions = pastAttendances.flatMap(attendance => 
//       attendance.conference.sessions.map(session => ({
//         id: session.id,
//         title: session.title,
//         date: session.startTime,
//         time: `${new Date(session.startTime).toLocaleTimeString()} - ${new Date(session.endTime).toLocaleTimeString()}`,
//         conferenceId: attendance.conference.id,
//         conferenceName: attendance.conference.name
//       }))
//     );
    
//     // Filter out sessions that already have feedback
//     const providedFeedbackSessionIds = user.sessionFeedbacks.map(feedback => feedback.sessionId);
//     const sessionsNeedingFeedback = allSessions.filter(
//       session => !providedFeedbackSessionIds.includes(session.id)
//     );
    
//     res.json(sessionsNeedingFeedback);
//   } catch (error: any) {
//     console.error("Error fetching attended sessions:", error);
//     res.status(500).json({ message: "Failed to load sessions", error: error.message });
//   }
// };

// // Get sessions for a specific conference
// export const getConferenceSessions = async (req: Request, res: Response) => {
//   try {
//     const cognitoId = req.user?.id;
//     const conferenceId = parseInt(req.params.conferenceId);
    
//     if (!cognitoId) {
//       return res.status(401).json({ message: "User not authenticated" });
//     }
    
//     if (isNaN(conferenceId)) {
//       return res.status(400).json({ message: "Invalid conference ID" });
//     }
    
//     const user = await prisma.user.findUnique({
//       where: { cognitoId }
//     });
    
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
    
//     // Check if user is registered for this conference
//     const attendance = await prisma.attendance.findFirst({
//       where: {
//         userId: user.id,
//         conferenceId: conferenceId
//       }
//     });
    
//     if (!attendance) {
//       return res.status(403).json({ message: "Not registered for this conference" });
//     }
    
//     // Get conference sessions
//     const conference = await prisma.conference.findUnique({
//       where: { id: conferenceId },
//       include: {
//         sessions: true
//       }
//     });
    
//     if (!conference) {
//       return res.status(404).json({ message: "Conference not found" });
//     }
    
//     // Format sessions
//     const sessions = conference.sessions.map(session => ({
//       id: session.id,
//       title: session.title,
//       date: session.startTime,
//       time: `${new Date(session.startTime).toLocaleTimeString()} - ${new Date(session.endTime).toLocaleTimeString()}`,
//       conferenceId: conference.id,
//       conferenceName: conference.name
//     }));
    
//     res.json(sessions);
//   } catch (error: any) {
//     console.error("Error fetching conference sessions:", error);
//     res.status(500).json({ message: "Failed to load sessions", error: error.message });
//   }
// };

// // Submit feedback for a session
// export const submitFeedback = async (req: Request, res: Response) => {
//   try {
//     const cognitoId = req.user?.id;
//     const { sessionId, rating, comments, improvements } = req.body;
    
//     if (!cognitoId) {
//       return res.status(401).json({ message: "User not authenticated" });
//     }
    
//     if (!sessionId || !rating) {
//       return res.status(400).json({ message: "Session ID and rating are required" });
//     }
    
//     const user = await prisma.user.findUnique({
//       where: { cognitoId }
//     });
    
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
    
//     // Check if session exists
//     const session = await prisma.session.findUnique({
//       where: { id: parseInt(sessionId) },
//       include: {
//         conference: true
//       }
//     });
    
//     if (!session) {
//       return res.status(404).json({ message: "Session not found" });
//     }
    
//     // Check if user is registered for this conference
//     const attendance = await prisma.attendance.findFirst({
//       where: {
//         userId: user.id,
//         conferenceId: session.conferenceId
//       }
//     });
    
//     if (!attendance) {
//       return res.status(403).json({ message: "Not registered for this conference" });
//     }
    
//     // Check if user already provided feedback
//     const existingFeedback = await prisma.sessionFeedback.findFirst({
//       where: {
//         userId: user.id,
//         sessionId: session.id
//       }
//     });
    
//     if (existingFeedback) {
//       return res.status(400).json({ message: "Feedback already submitted for this session" });
//     }
    
//     // Submit feedback
//     const feedback = await prisma.sessionFeedback.create({
//       data: {
//         userId: user.id,
//         sessionId: session.id,
//         rating: rating,
//         comments: comments || "",
//         improvements: improvements || "",
//         submittedAt: new Date()
//       }
//     });
    
//     res.status(201).json(feedback);
//   } catch (error: any) {
//     console.error("Error submitting feedback:", error);
//     res.status(500).json({ message: "Failed to submit feedback", error: error.message });
//   }
// };

// // Get materials for registered conferences
// export const getMaterials = async (req: Request, res: Response) => {
//   try {
//     const cognitoId = req.user?.id;
    
//     if (!cognitoId) {
//       return res.status(401).json({ message: "User not authenticated" });
//     }
    
//     const user = await prisma.user.findUnique({
//       where: { cognitoId },
//       include: {
//         attendances: {
//           include: {
//             conference: {
//               include: {
//                 materials: true
//               }
//             }
//           }
//         },
//         viewedMaterials: true
//       }
//     });
    
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
    
//     // Get all materials from registered conferences
//     const allMaterials = user.attendances.flatMap(attendance => 
//       attendance.conference.materials.map(material => ({
//         id: material.id,
//         title: material.title,
//         description: material.description || "",
//         fileUrl: material.url,
//         fileType: material.type,
//         conferenceId: attendance.conference.id,
//         conferenceName: attendance.conference.name,
//         uploadDate: material.uploadDate,
//         isNew: new Date(material.uploadDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // New if less than a week old
//         viewed: user.viewedMaterials.some(vm => vm.materialId === material.id)
//       }))
//     );
    
//     res.json(allMaterials);
//   } catch (error: any) {
//     console.error("Error fetching materials:", error);
//     res.status(500).json({ message: "Failed to load materials", error: error.message });
//   }
// };

// // Mark material as viewed
// export const markMaterialViewed = async (req: Request, res: Response) => {
//   try {
//     const cognitoId = req.user?.id;
//     const materialId = parseInt(req.params.materialId);
    
//     if (!cognitoId) {
//       return res.status(401).json({ message: "User not authenticated" });
//     }
    
//     if (isNaN(materialId)) {
//       return res.status(400).json({ message: "Invalid material ID" });
//     }
    
//     const user = await prisma.user.findUnique({
//       where: { cognitoId }
//     });
    
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
    
//     // Check if material exists
//     const material = await prisma.material.findUnique({
//       where: { id: materialId },
//       include: {
//         conference: true
//       }
//     });
    
//     if (!material) {
//       return res.status(404).json({ message: "Material not found" });
//     }
    
//     // Check if user is registered for this conference
//     const attendance = await prisma.attendance.findFirst({
//       where: {
//         userId: user.id,
//         conferenceId: material.conferenceId
//       }
//     });
    
//     if (!attendance) {
//       return res.status(403).json({ message: "Not registered for this conference" });
//     }
    
//     // Check if already viewed
//     const existingView = await prisma.viewedMaterial.findFirst({
//       where: {
//         userId: user.id,
//         materialId: materialId
//       }
//     });
    
//     if (existingView) {
//       return res.json({ message: "Material already marked as viewed" });
//     }
    
//     // Mark as viewed
//     const viewedMaterial = await prisma.viewedMaterial.create({
//       data: {
//         userId: user.id,
//         materialId: materialId,
//         viewedAt: new Date()
//       }
//     });
    
//     res.status(201).json(viewedMaterial);
//   } catch (error: any) {
//     console.error("Error marking material as viewed:", error);
//     res.status(500).json({ message: "Failed to mark material as viewed", error: error.message });
//   }
// };

// // Get networking opportunities (other attendees)
// export const getNetworkingOpportunities = async (req: Request, res: Response) => {
//   try {
//     const cognitoId = req.user?.id;
    
//     if (!cognitoId) {
//       return res.status(401).json({ message: "User not authenticated" });
//     }
    
//     const user = await prisma.user.findUnique({
//       where: { cognitoId },
//       include: {
//         attendances: {
//           include: {
//             conference: true
//           }
//         },
//         connections: true,
//         connectionRequests: true
//       }
//     });
    
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
    
//     // Get conference IDs the user is registered for
//     const userConferenceIds = user.attendances.map(a => a.conferenceId);
    
//     // Get attendees for these conferences
//     const attendances = await prisma.attendance.findMany({
//       where: {
//         conferenceId: {
//           in: userConferenceIds
//         },
//         userId: {
//           not: user.id // Exclude the user themself
//         }
//       },
//       include: {
//         user: true,
//         conference: true
//       }
//     });
    
//     // Get unique attendees and map by user ID
//     const attendeeMap = new Map();
//     attendances.forEach(attendance => {
//       const attendeeUser = attendance.user;
//       if (!attendeeMap.has(attendeeUser.id)) {
//         attendeeMap.set(attendeeUser.id, {
//           user: attendeeUser,
//           conferenceIds: [attendance.conferenceId]
//         });
//       } else {
//         attendeeMap.get(attendeeUser.id).conferenceIds.push(attendance.conferenceId);
//       }
//     });
    
//     // Get user's connections
//     const connectedUserIds = user.connections.map(c => c.connectedUserId);
//     const pendingUserIds = user.connectionRequests.map(cr => cr.requestedUserId);
    
//     // Format attendees
//     const attendees = Array.from(attendeeMap.values()).map(entry => {
//       const attendee = entry.user;
//       return {
//         id: attendee.id,
//         name: attendee.name,
//         title: attendee.jobTitle || "",
//         organization: attendee.organization || "",
//         bio: attendee.bio || "",
//         location: attendee.location || "",
//         avatarUrl: attendee.avatarUrl || null,
//         interests: attendee.interests || [],
//         isConnected: connectedUserIds.includes(attendee.id),
//         isPending: pendingUserIds.includes(attendee.id),
//         conferenceIds: entry.conferenceIds
//       };
//     });
    
//     // Fetch distinct conferences
//     const conferences = await prisma.conference.findMany({
//       where: {
//         id: {
//           in: userConferenceIds
//         }
//       },
//       select: {
//         id: true,
//         name: true
//       }
//     });
    
//     res.json({
//       attendees,
//       conferences
//     });
//   } catch (error: any) {
//     console.error("Error fetching networking opportunities:", error);
//     res.status(500).json({ message: "Failed to load networking data", error: error.message });
//   }
// };

// // Send connection request
// export const sendConnectionRequest = async (req: Request, res: Response) => {
//   try {
//     const cognitoId = req.user?.id;
//     const { attendeeId } = req.body;
    
//     if (!cognitoId) {
//       return res.status(401).json({ message: "User not authenticated" });
//     }
    
//     if (!attendeeId) {
//       return res.status(400).json({ message: "Attendee ID is required" });
//     }
    
//     const user = await prisma.user.findUnique({
//       where: { cognitoId }
//     });
    
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
    
//     // Check if target user exists
//     const targetUser = await prisma.user.findUnique({
//       where: { id: parseInt(attendeeId) }
//     });
    
//     if (!targetUser) {
//       return res.status(404).json({ message: "Target attendee not found" });
//     }
    
//     // Check if already connected
//     const existingConnection = await prisma.connection.findFirst({
//       where: {
//         OR: [
//           { userId: user.id, connectedUserId: targetUser.id },
//           { userId: targetUser.id, connectedUserId: user.id }
//         ]
//       }
//     });
    
//     if (existingConnection) {
//       return res.status(400).json({ message: "Already connected with this attendee" });
//     }
    
//     // Check if request already exists
//     const existingRequest = await prisma.connectionRequest.findFirst({
//       where: {
//         requesterId: user.id,
//         requestedUserId: targetUser.id,
//       }
//     });
    
//     if (existingRequest) {
//       return res.status(400).json({ message: "Connection request already sent" });
//     }
    
//     // Send connection request
//     const connectionRequest = await prisma.connectionRequest.create({
//       data: {
//         requesterId: user.id,
//         requestedUserId: targetUser.id,
//         status: 'pending',
//         requestedAt: new Date()
//       }
//     });
    
//     // Create notification for target user
//     await prisma.notification.create({
//       data: {
//         userId: targetUser.id,
//         message: `${user.name} wants to connect with you`,
//         type: 'connection_request',
//         relatedId: connectionRequest.id,
//         createdAt: new Date()
//       }
//     });
    
//     res.status(201).json(connectionRequest);
//   } catch (error: any) {
//     console.error("Error sending connection request:", error);
//     res.status(500).json({ message: "Failed to send connection request", error: error.message });
//   }
// };