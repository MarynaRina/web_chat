import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Request, Response, RequestHandler } from "express";
import phoneAuthRoutes from "./routes/phoneAuthRoutes.js";
import connectDB from "./config/db.js";

dotenv.config();

// Схема для повідомлень
const messageSchema = new mongoose.Schema({
  id: String,
  text: String,
  sender: String,
  senderName: String,
  timestamp: Date,
});

const Message = mongoose.model("Message", messageSchema);

// Схема для користувачів
const userSchema = new mongoose.Schema({
  userId: String,
  phone: String,
  socketId: String,
  lastActive: Date,
});

const User = mongoose.model("User", userSchema);

const app = express();
const server = createServer(app);

// Підключення до MongoDB через змінну середовища
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/web_chat")
  .then(() => console.log("✅ MongoDB успішно підключено"))
  .catch((err) => console.error("❌ Помилка підключення до MongoDB:", err));

// Змініть CORS налаштування:
const corsOptions = {
  origin: "https://webchat-c0fbb.web.app", // не '*'
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "x-requested-with"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Preflight для всіх маршрутів
app.use(express.json());

const corsMiddleware: RequestHandler = (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://webchat-c0fbb.web.app");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  next();
};

app.use("/", corsMiddleware);

app.use("/api/auth", phoneAuthRoutes);

app.get("/", (_req: Request, res: Response) => {
  res.send("Chat Server API is running!");
});

// Оновіть налаштування Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*", // Тимчасово дозволяємо всі домени для тестування
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  // Дозвольте і websocket і polling:
  transports: ["polling"],
  allowEIO3: true,
  upgradeTimeout: 0,  
});

const activeUsers = new Map();

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
      // Оновлюємо в базі даних
      await User.findOneAndUpdate(
        { socketId: socket.id },
        { lastActive: new Date() }
      );

      activeUsers.delete(socket.id);

      // Оновлюємо список користувачів для всіх
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

// Використання порту з змінних середовища
const PORT = process.env.PORT || 3001;

// Підключення до бази даних
connectDB();

// Запуск сервера
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Обробка неперехоплених помилок
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
