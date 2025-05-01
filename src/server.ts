import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import cors from "cors";
import phoneAuthRoutes from "./routes/phoneAuthRoutes";
import userRoutes from "./routes/userRoutes";
import connectDB from "./config/db";
import { upload, setupProfileHandler } from "./controllers/setupProfile";
import User from "./models/User";
import Message from "./models/Message";
import { ActiveUser } from "./types/activeUser";

dotenv.config();

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

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

const io = new Server(server, {
  cors: {
    origin: "https://webchat-c0fbb.web.app",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

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
    const user = await User.findOne({ userId: data.sender });

    const message = new Message({
      id: data.id,
      text: data.text,
      sender: data.sender,
      senderName: user?.username || "Unknown",
      senderAvatar: user?.avatarUrl || "",
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

app.use(cors({ origin: "https://webchat-c0fbb.web.app", credentials: true }));
app.use(express.json());

app.use("/api/auth", phoneAuthRoutes);
app.use("/api/users", userRoutes);
app.post("/api/users/setup", upload.single("avatar"), setupProfileHandler);

app.get("/api/users/online", (_req: Request, res: Response) => {
  const users = Array.from(activeUsers.values());
  res.json({ users });
});

app.get("/", (_req, res) => {
  res.send("Chat Server API is running!");
});

app.use((err: any, _req: Request, res: Response, _next: Function) => {
  console.error("❌ Global Error Handler:", err);
  res.status(500).json({ message: "Server error" });
});

connectDB().then(() => {
  console.log("MongoDB connected");
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});