import mongoose, { Document } from "mongoose";

// Інтерфейс для повідомлень
export interface IMessage extends Document {
  id: string;
  text: string;
  sender: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: Date;
}

const messageSchema = new mongoose.Schema<IMessage>({
  id: { type: String, required: true },
  text: { type: String, required: true },
  sender: { type: String, required: true },
  senderName: { type: String, required: true },
  senderAvatar: { type: String, required: false },
  timestamp: { type: Date, required: true },
});

export default mongoose.model<IMessage>("Message", messageSchema);