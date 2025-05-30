// import express from "express";
// import { authMiddleware } from "../middleware/authMiddleware";
// import {
//   getAttendeeProfile,
//   updateAttendeeProfile,
//   getAttendeeNotifications,
//   getUpcomingConferences,
//   registerForConference,
//   getAttendeeEvents,
//   getEventDetails,
//   cancelRegistration,
//   getFavorites,
//   addToFavorites,
//   removeFromFavorites,
//   getAttendedSessions,
//   getConferenceSessions,
//   submitFeedback,
//   getMaterials,
//   markMaterialViewed,
//   getNetworkingOpportunities,
//   sendConnectionRequest
// } from "../controllers/attendeeControllers";

// const router = express.Router();

// // All routes are protected with attendee authentication
// const attendeeAuth = authMiddleware(["attendee", "admin"]);

// // Profile routes
// router.get("/profile", attendeeAuth, getAttendeeProfile);
// router.put("/profile", attendeeAuth, updateAttendeeProfile);

// // Notification routes
// router.get("/notifications", attendeeAuth, getAttendeeNotifications);

// // Conference routes
// router.get("/my-events", attendeeAuth, getAttendeeEvents);
// router.get("/events/:id", attendeeAuth, getEventDetails);
// router.post("/register-conference", attendeeAuth, registerForConference);
// router.delete("/cancel-registration/:id", attendeeAuth, cancelRegistration);

// // Favorites routes
// router.get("/favorites", attendeeAuth, getFavorites);
// router.post("/favorites/:conferenceId", attendeeAuth, addToFavorites);
// router.delete("/favorites/:conferenceId", attendeeAuth, removeFromFavorites);

// // Feedback routes
// router.get("/attended-sessions", attendeeAuth, getAttendedSessions);
// router.get("/conference/:conferenceId/sessions", attendeeAuth, getConferenceSessions);
// router.post("/submit-feedback", attendeeAuth, submitFeedback);

// // Materials routes
// router.get("/materials", attendeeAuth, getMaterials);
// router.post("/materials/:materialId/viewed", attendeeAuth, markMaterialViewed);

// // Networking routes
// router.get("/networking", attendeeAuth, getNetworkingOpportunities);
// router.post("/connect", attendeeAuth, sendConnectionRequest);

// export default router;