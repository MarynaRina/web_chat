import express from "express";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import cors from "cors";
import phoneAuthRoutes from "./routes/phoneAuthRoutes";
import userRoutes from "./routes/userRoutes";
import connectDB from "./config/db";
import multer from "multer";
import path from "path";
import { Request, Response } from "express";
import User from "./models/User";

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

// Multer config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/"),
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });
console.log("Multer configured");

// Middleware
app.use(cors({ origin: "https://webchat-c0fbb.web.app", credentials: true }));
console.log("CORS configured");

app.use(express.json());
console.log("JSON parsing configured");

app.use("/uploads", express.static("uploads"));
console.log("Static uploads folder configured");

// Routes
app.use("/api/auth", phoneAuthRoutes);
console.log("Phone auth routes configured");

app.use("/api/users", userRoutes);
console.log("User routes configured");

// Profile setup route
app.post(
  "/api/users/setup",
  upload.single("avatar"),
  async (req: Request & { file?: Express.Multer.File }, res: Response) => {
    try {
      const { username, userId } = req.body;
      const file = req.file;

      if (!username || !userId || !file) {
        res.status(400).json({
          success: false,
          message: "Missing required fields: username, userId, or avatar",
        });
        return;
      }

      const uploadResult = await cloudinary.uploader.upload(file.path);
      const avatarUrl = uploadResult.secure_url;

      const updatedUser = await User.findOneAndUpdate(
        { userId },
        { username, avatarUrl },
        { upsert: true, new: true }
      );

      console.log("✅ Profile updated for:", userId);
      res.status(200).json({ success: true, avatarUrl });
    } catch (error: any) {
      console.error("❌ Error in /api/users/setup:", error.message || error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message || "Unknown error",
      });
    }
  }
);
console.log("Profile setup route configured");

app.get("/", (_req, res) => {
  res.send("Chat Server API is running!");
});

connectDB().then(() => {
  console.log("MongoDB connected");
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});