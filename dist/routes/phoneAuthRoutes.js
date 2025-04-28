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
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("../models/User"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
dotenv_1.default.config();
const router = (0, express_1.Router)();
const codes = new Map();
const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
// Видаляємо повернення результату, щоб відповідати типу RequestHandler
const sendCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { phone } = req.body;
    if (!phone) {
        res.status(400).json({ message: 'Phone number is required' });
        return;
    }
    const code = generateCode();
    codes.set(phone, code);
    console.log(`Code for ${phone}: ${code}`);
    res.json({ message: 'Code sent successfully' });
});
// Видаляємо повернення результату, щоб відповідати типу RequestHandler
const verifyCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { phone, code } = req.body;
    if (!phone || !code) {
        res.status(400).json({ message: 'Phone and code required' });
        return;
    }
    const validCode = codes.get(phone);
    if (code !== validCode) {
        res.status(401).json({ message: 'Invalid code' });
        return;
    }
    let user = yield User_1.default.findOne({ phone });
    if (!user) {
        user = yield User_1.default.create({ phone });
    }
    const token = jsonwebtoken_1.default.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    codes.delete(phone);
    res.json({ token });
});
router.post('/send-code', sendCode);
router.post('/verify-code', verifyCode);
// Виправлення обробника для /me
router.get('/me', authMiddleware_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        // Виправлення .status() на правильний метод
        const user = yield User_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json(user);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = router;
//# sourceMappingURL=phoneAuthRoutes.js.map