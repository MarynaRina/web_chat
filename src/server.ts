import express from "express";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import cors from "cors";
import phoneAuthRoutes from "./routes/phoneAuthRoutes";
import userRoutes from "./routes/userRoutes";
import connectDB from "./config/db";

console.log("Starting server.js... THIS IS THE FIRST LOG");

dotenv.config();
console.log("✅ Environment variables loaded");

if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  console.error("❌ Cloudinary configuration missing");
  process.exit(1);
}
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
console.log("✅ Cloudinary configured");

const app = express();
console.log("Express app created");

const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "https://webchat-c0fbb.web.app", credentials: true }));
console.log("CORS configured");

app.use("/api/auth", phoneAuthRoutes);
console.log("Phone auth routes configured");

app.use("/api/users", userRoutes);
console.log("User routes configured");

app.get("/", (_req, res) => {
  res.send("Chat Server API is running!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

connectDB().then(() => {
  console.log("MongoDB connected");
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});