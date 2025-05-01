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
exports.setupProfileHandler = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = require("cloudinary");
const User_1 = __importDefault(require("../models/User"));
// Налаштування multer для зберігання в оперативній памʼяті
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage });
exports.upload = upload;
const setupProfileHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, userId } = req.body;
        const file = req.file;
        if (!username || !userId || !file) {
            res.status(400).json({ message: "Missing required fields: username, userId, or avatar" });
            return;
        }
        // Функція для завантаження в Cloudinary
        const streamUpload = (buffer) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary_1.v2.uploader.upload_stream({ resource_type: "image" }, (error, result) => {
                    if (result)
                        resolve(result);
                    else
                        reject(error);
                });
                stream.end(buffer);
            });
        };
        // Завантаження файлу
        const uploadResult = yield streamUpload(file.buffer);
        const avatarUrl = uploadResult.secure_url;
        // Оновлення або створення користувача
        yield User_1.default.findOneAndUpdate({ userId }, { username, avatarUrl }, { upsert: true });
        res.status(200).json({ success: true, avatarUrl });
    }
    catch (error) {
        console.error("❌ Error in /api/users/setup:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.setupProfileHandler = setupProfileHandler;
//# sourceMappingURL=setupProfile.js.map