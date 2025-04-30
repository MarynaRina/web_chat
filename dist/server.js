"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cloudinary_1 = require("cloudinary");
const cors_1 = __importDefault(require("cors"));
const phoneAuthRoutes_1 = __importDefault(require("./routes/phoneAuthRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const db_1 = __importDefault(require("./config/db"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
console.log("Starting server.js... THIS IS THE FIRST LOG");
dotenv_1.default.config();
console.log("✅ Environment variables loaded");
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
console.log("Express app created");
const PORT = process.env.PORT || 3001;
// Multer config
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, "uploads/"),
    filename: (_req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path_1.default.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});
const upload = (0, multer_1.default)({ storage });
console.log("Multer configured");
// Middleware
app.use((0, cors_1.default)({ origin: "https://webchat-c0fbb.web.app", credentials: true }));
console.log("CORS configured");
app.use(express_1.default.json());
console.log("JSON parsing configured");
app.use("/uploads", express_1.default.static("uploads"));
console.log("Static uploads folder configured");
// Routes
app.use("/api/auth", phoneAuthRoutes_1.default);
console.log("Phone auth routes configured");
app.use("/api/users", userRoutes_1.default);
console.log("User routes configured");
app.get("/", (_req, res) => {
    res.send("Chat Server API is running!");
});
(0, db_1.default)().then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
});
//# sourceMappingURL=server.js.map