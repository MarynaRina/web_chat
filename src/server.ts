import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
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
import Message from "./models/Message";
import { ActiveUser } from "./types/activeUser";
import fs from "fs";

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
const server = createServer(app);
console.log("Express app and HTTP server created");

const PORT = process.env.PORT || 3001;

// Socket.IO config
const io = new Server(server, {
  cors: {
    origin: "https://webchat-c0fbb.web.app",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
});
console.log("Socket.IO configured");

const activeUsers = new Map<string, ActiveUser>();

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  socket.on("join", async ({ userId, phone }) => {
    activeUsers.set(socket.id, { userId, phone });

    await User.findOneAndUpdate(
      { userId },
      { userId, phone, socketId: socket.id, lastActive: new Date() },
      { upsert: true }
    );

    const history = await Message.find().sort({ timestamp: 1 }).limit(50);
    socket.emit("chat_history", history);

    io.emit(
      "users_update",
      Array.from(activeUsers.values()).map((u) => u.phone)
    );
  });

  socket.on("send_message", async (data) => {
    const message = new Message({
      id: data.id,
      text: data.text,
      sender: data.sender,
      senderName: data.senderName,
      timestamp: new Date(),
    });
    await message.save();
    io.emit("receive_message", message);
  });

  socket.on("disconnect", async () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      await User.findOneAndUpdate(
        { socketId: socket.id },
        { lastActive: new Date() }
      );
      activeUsers.delete(socket.id);
      io.emit(
        "users_update",
        Array.from(activeUsers.values()).map((u) => u.phone)
      );
    }
    console.log("🔴 User disconnected:", socket.id);
  });
});

// Multer config
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
  console.log("Created uploads directory");
}
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/"),
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
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
      console.log("Received /api/users/setup request");
      console.log("Request body:", req.body);
      console.log("Uploaded file:", req.file);

      const { username, userId } = req.body;
      const file = req.file;

      if (!username || !userId || !file) {
        console.log(
          "Missing fields - username:",
          username,
          "userId:",
          userId,
          "file:",
          file
        );
        res.status(400).json({
          success: false,
          message: "Missing required fields: username, userId, or avatar",
        });
        return;
      }

      console.log("Uploading to Cloudinary...");
      const uploadResult = await cloudinary.uploader.upload(file.path);
      console.log("Cloudinary upload result:", uploadResult);
      const avatarUrl = uploadResult.secure_url;

      console.log("Updating user in MongoDB...");
      const updatedUser = await User.findOneAndUpdate(
        { userId },
        { username, avatarUrl },
        { upsert: true, new: true }
      );
      console.log("Updated user:", updatedUser);

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

// Get online users
app.get("/api/users/online", (_req: Request, res: Response) => {
  try {
    console.log("Handling /api/users/online request...");
    console.log("Active users:", activeUsers);
    const users = Array.from(activeUsers.values());
    console.log("Users array:", users);
    res.json({ users });
  } catch (error: any) {
    console.error("Error in /api/users/online:", error);
    res
      .status(500)
      .json({
        message: "Server error in /api/users/online",
        error: error.message,
      });
  }
});
console.log("Online users route configured");

app.get("/", (_req, res) => {
  res.send("Chat Server API is running!");
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: Function) => {
  console.error("❌ Global Error Handler:", err);
  res.status(500).json({ message: "Server error" });
});
console.log("Global error handler configured");

connectDB().then(() => {
  console.log("MongoDB connected");
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});

// Unhandled error protection
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
console.log("Unhandled error protection configured");
