"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const phoneAuthRoutes_js_1 = __importDefault(require("./routes/phoneAuthRoutes.js"));
const db_js_1 = __importDefault(require("./config/db.js"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const Message_1 = __importDefault(require("./models/Message"));
const User_1 = __importDefault(require("./models/User"));
const cloudinary_1 = require("cloudinary");
dotenv_1.default.config();
console.log("✅ Environment variables loaded");
// Cloudinary config check
if (!process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET) {
    console.error("❌ Cloudinary configuration missing");
    process.exit(1);
}
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
console.log("✅ Cloudinary configured");
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
// CORS config
const corsOptions = {
    origin: ["https://webchat-c0fbb.web.app", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "x-requested-with",
        "Accept",
    ],
};
app.use((0, cors_1.default)(corsOptions));
app.options("*", (0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
// Multer config
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, "uploads/"),
    filename: (_req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path_1.default.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});
const upload = (0, multer_1.default)({ storage });
// Socket.IO config
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "https://webchat-c0fbb.web.app",
        methods: ["GET", "POST"],
        credentials: true,
    },
    transports: ["websocket", "polling"],
    allowEIO3: true,
});
const activeUsers = new Map();
io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);
    socket.on("join", (_a) => __awaiter(void 0, [_a], void 0, function* ({ userId, phone }) {
        activeUsers.set(socket.id, { userId, phone });
        yield User_1.default.findOneAndUpdate({ userId }, { userId, phone, socketId: socket.id, lastActive: new Date() }, { upsert: true });
        const history = yield Message_1.default.find().sort({ timestamp: 1 }).limit(50);
        socket.emit("chat_history", history);
        io.emit("users_update", Array.from(activeUsers.values()).map((u) => u.phone));
    }));
    socket.on("send_message", (data) => __awaiter(void 0, void 0, void 0, function* () {
        const message = new Message_1.default({
            id: data.id,
            text: data.text,
            sender: data.sender,
            senderName: data.senderName,
            timestamp: new Date(),
        });
        yield message.save();
        io.emit("receive_message", message);
    }));
    socket.on("disconnect", () => __awaiter(void 0, void 0, void 0, function* () {
        const user = activeUsers.get(socket.id);
        if (user) {
            yield User_1.default.findOneAndUpdate({ socketId: socket.id }, { lastActive: new Date() });
            activeUsers.delete(socket.id);
            io.emit("users_update", Array.from(activeUsers.values()).map((u) => u.phone));
        }
        console.log("🔴 User disconnected:", socket.id);
    }));
});
// Get online users
app.get("/api/users/online", (_req, res) => {
    res.json({ users: Array.from(activeUsers.values()) });
});
// Profile setup route
app.post("/api/users/setup", upload.single("avatar"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const uploadResult = yield cloudinary_1.v2.uploader.upload(file.path);
        const avatarUrl = uploadResult.secure_url;
        const updatedUser = yield User_1.default.findOneAndUpdate({ userId }, { username, avatarUrl }, { upsert: true, new: true });
        console.log("✅ Profile updated for:", userId);
        res.status(200).json({ success: true, avatarUrl });
    }
    catch (error) {
        console.error("❌ Error in /api/users/setup:", error.message || error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message || "Unknown error",
        });
    }
}));
// Health check
app.get("/", (_req, res) => {
    res.send("Chat Server API is running!");
});
// API Routes
app.use("/api/auth", phoneAuthRoutes_js_1.default);
app.use("/api/user", userRoutes_1.default);
app.use("/uploads", express_1.default.static("uploads"));
// Global error handler
app.use((err, _req, res, _next) => {
    console.error("❌ Global Error Handler:", err);
    res.status(500).json({ message: "Server error" });
});
// DB + server init
const PORT = process.env.PORT || 3001;
(0, db_js_1.default)().then(() => {
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
//# sourceMappingURL=server.js.map