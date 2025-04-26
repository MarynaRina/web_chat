// src/models/Message.ts
import mongoose, { Document, Schema } from "mongoose";

// Інтерфейс для повідомлень
export interface IMessage extends Document {
  id: string;
  text: string;
  sender: string;
  senderName: string;
  timestamp: Date;
}

const messageSchema = new mongoose.Schema<IMessage>({
  id: String,
  text: String,
  sender: String,
  senderName: String,
  timestamp: Date,
});

export default mongoose.model<IMessage>("Message", messageSchema);