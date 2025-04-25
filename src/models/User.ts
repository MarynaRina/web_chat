import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  phone: string;
  verificationCode: string;
  name?: string;
  avatarUrl?: string;
}

const UserSchema = new Schema<IUser>({
  phone: { type: String, required: true, unique: true },
  verificationCode: { type: String, required: true },
  name: { type: String },
  avatarUrl: { type: String },
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);