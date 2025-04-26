// src/models/User.ts
import mongoose, { Schema, Document } from "mongoose";

// Інтерфейс для типізації
export interface IUser extends Document {
  userId: string;
  phone: string;
  socketId: string;
  lastActive: Date;
  username: string;
  avatarUrl?: string;
}

// Схема користувача
const userSchema: Schema = new Schema({
  userId: { type: String, required: true },
  phone: { type: String, required: true },
  socketId: { type: String },
  lastActive: { type: Date },
  username: { type: String, required: true },
  avatarUrl: { type: String },
});

export default mongoose.model<IUser>("User", userSchema);