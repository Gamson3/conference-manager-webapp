// import express from "express";
// import { searchWithTreeContext, getPresentationLocation, searchScheduledPresentations, searchAllPresentations, globalSearch } from "../controllers/searchControllers";
// import { authMiddleware } from "../middleware/authMiddleware";

// const router = express.Router();

// // Public attendee search - only scheduled presentations
// router.get('/conferences/:id/search', searchScheduledPresentations);

// router.get('/conferences/:id/search/all', authMiddleware(["organizer", "admin"]), searchAllPresentations);
// // Global search - only from scheduled presentations
// router.get('/search/global', globalSearch);

// router.get('/search/global/all', authMiddleware(["organizer", "admin"]), globalSearch);
// // Global search route
// router.get("/global", authMiddleware(["attendee", "organizer", "admin"]), globalSearch);
// router.get("/:id/search/tree", authMiddleware(["attendee", "organizer", "admin"]), searchWithTreeContext);
// router.get("/presentations/:id/location", authMiddleware(["attendee", "organizer", "admin"]), getPresentationLocation);

// export default router;