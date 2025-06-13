// Entry point for our entire application 

import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
// import { authMiddleware } from "./middleware/authMiddleware";
import { authMiddleware } from "./middleware/authMiddleware";

/* ROUTE IMPORT */  
//  route imports to be added when we have written them
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import eventRoutes from "./routes/eventRoutes";
import conferenceRoutes from "./routes/conferenceRoutes";
import sectionRoutes from "./routes/sectionRoutes";
import searchRoutes from "./routes/searchRoutes";
import favoriteRoutes from "./routes/favoriteRoutes";
import presentationRoutes from "./routes/presentationRoutes";
import attendeeRoutes from "./routes/attendeeRoutes";
import scheduleRoutes from "./routes/scheduleRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import presentationTypeRoutes from "./routes/presentationTypeRoutes";
import submissionSettingsRoutes from "./routes/submissionSettingsRoutes";
import workflowRoutes from "./routes/workflowRoutes";
import submissionRoutes from './routes/submitPresentationRoutes';



/* CONFIGURATIONS - setup files*/ 
dotenv.config();
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());


// Health check
app.get("/", (req, res) => {
  res.send("This is home route");  // test for whether our home route works
});

// where our routes will be created
app.use("/auth", authRoutes);
app.use("/users", userRoutes); // universal user route
app.use("/events", eventRoutes);
app.use("/conferences", conferenceRoutes); // Public conference routes
app.use("/api", scheduleRoutes);            // Schedule and favorites (protected)
app.use("/sections", sectionRoutes);
app.use("/search", searchRoutes); 
app.use("/favorites", favoriteRoutes);
app.use("/api", presentationRoutes);
app.use("/api/attendee", attendeeRoutes);
app.use("/api", categoryRoutes);
app.use("/api", presentationTypeRoutes);
app.use("/api", submissionSettingsRoutes);
app.use("/api", workflowRoutes);
app.use('/api', submissionRoutes);



/* SERVER */
const port = Number(process.env.PORT) || 3002;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;