import express from "express";

import { config } from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRouter from "./routes/auth.js";
import { createApiResponse } from "./utils/apiUtils.js";

// Load environment variables from .env file
config();

// Create Express application instance
const app = express();

// Middleware setup
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON request bodies
app.use(cookieParser()); // Parse cookies from requests

// Define server port from environment or default to 5000
const PORT = process.env.PORT || 5000;

// Root endpoint - simple health check
app.get("/", (req, res) => {
  createApiResponse(res, 200, { message: "Hi" });
});

// Mount authentication routes under /api/auth
app.use("/api/auth", authRouter);

// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
