import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import phoneAuthRoutes from "./routes/phoneAuthRoutes.js";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes";
import multer from "multer";
import path from "path";
import Message from "./models/Message";
import User from "./models/User";
import { ActiveUser } from "./types/activeUser";
import { v2 as cloudinary } from 'cloudinary';

console.log("Starting server.js..."); // Логування на самому початку

dotenv.config();
console.log("dotenv loaded");

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
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

const server = createServer(app);
console.log("HTTP server created");

// CORS налаштування
const corsOptions = {
  origin: "https://webchat-c0fbb.web.app",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "x-requested-with", "Accept"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
console.log("Middleware configured");

// Налаштування Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });
console.log("Multer configured");

// Налаштування Socket.IO
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

io.on("connection", async (socket) => {
  console.log("🟢 a user connected:", socket.id);

  socket.on("join", async ({ userId, phone }) => {
    console.log(`👤 User joined: ${phone} (${userId})`);
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
      Array.from(activeUsers.values()).map((user) => user.phone)
    );
  });

  socket.on("send_message", async (data) => {
    console.log("📩 message:", data);
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
    console.log("🔴 user disconnected", socket.id);
    const user = activeUsers.get(socket.id);
    if (user) {
      await User.findOneAndUpdate(
        { socketId: socket.id },
        { lastActive: new Date() }
      );
      activeUsers.delete(socket.id);
      io.emit(
        "users_update",
        Array.from(activeUsers.values()).map((user) => user.phone)
      );
    }
  });
});

// REST API для авторизації і перевірки статусу
app.get("/api/users/online", (_req: Request, res: Response) => {
  res.json({
    users: Array.from(activeUsers.values()),
  });
});

// Маршрут для /api/users/setup
app.post("/api/users/setup", upload.single("avatar"), async (req: Request & { file?: Express.Multer.File }, res: Response) => {
  try {
    const { username, userId } = req.body;
    const file = req.file;

    if (!username || !userId || !file) {
      res.status(400).json({ message: 'Missing required fields: username, userId, or avatar' });
      return;
    }

    const result = await cloudinary.uploader.upload(file.path);
    const avatarUrl = result.secure_url;

    await User.findOneAndUpdate(
      { userId },
      { username, avatarUrl },
      { upsert: true }
    );

    res.status(200).json({ success: true, avatarUrl });
  } catch (error) {
    console.error('Error in /api/users/setup:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get("/", (_req: Request, res: Response) => {
  res.send("Chat Server API is running!");
});

app.use("/api/auth", phoneAuthRoutes);
app.use("/api/user", userRoutes);
app.use("/uploads", express.static("uploads"));
console.log("Routes configured");

// Middleware для обробки помилок
app.use((err: any, req: Request, res: Response, next: Function) => {
  console.error("Server error:", err);
  res.status(500).json({ message: "Something went wrong on the server" });
});

// Використання порту з змінних середовища
const PORT = process.env.PORT || 3001;

// Підключення до бази даних і запуск сервера
const startServer = async () => {
  try {
    console.log("Attempting to start server...");
    await connectDB();
    console.log("connectDB completed");

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
    console.log("Server listen called");
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

// Обробка неперехоплених помилок
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});