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
import userRoutes from "./routes/userRoutes";
import eventRoutes from "./routes/eventRoutes";



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


/* ROUTES */
app.get("/", (req, res) => {
  res.send("This is home route");  // test for whether our home route works
});
// where our routes will be created
app.use("/users", userRoutes); // universal user route
app.use("/events", eventRoutes);



/* SERVER */
const port = Number(process.env.PORT) || 3002;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});