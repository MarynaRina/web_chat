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
import Message from "./models/Message"; // Імпортуємо модель Message
import User from "./models/User"; // Імпортуємо модель User
import { ActiveUser } from "./types/activeUser"; // Імпортуємо інтерфейс ActiveUser

// Налаштування multer для збереження файлів
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

dotenv.config();

const app = express();
const server = createServer(app);

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
      res.status(400).json({ message: "Missing required fields: username, userId, or avatar" });
      return;
    }

    const avatarUrl = `/uploads/${file.filename}`;

    await User.findOneAndUpdate(
      { userId },
      { username, avatarUrl },
      { upsert: true }
    );

    res.status(200).json({ success: true, avatarUrl });
  } catch (error) {
    console.error("Error in /api/users/setup:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/", (_req: Request, res: Response) => {
  res.send("Chat Server API is running!");
});

app.use("/api/auth", phoneAuthRoutes);
app.use("/api/user", userRoutes);
app.use("/uploads", express.static("uploads"));

// Middleware для обробки помилок
app.use((err: any, req: Request, res: Response, next: Function) => {
  console.error("Server error:", err);
  res.status(500).json({ message: "Something went wrong on the server" });
});

// Використання порту з змінних середовища
const PORT = process.env.PORT || 3001;

// Підключення до бази даних і запуск сервера
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});

// Обробка неперехоплених помилок
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

