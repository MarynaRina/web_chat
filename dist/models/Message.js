"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/Message.ts
const mongoose_1 = __importDefault(require("mongoose"));
const messageSchema = new mongoose_1.default.Schema({
    id: String,
    text: String,
    sender: String,
    senderName: String,
    timestamp: Date,
});
exports.default = mongoose_1.default.model("Message", messageSchema);
//# sourceMappingURL=Message.js.map