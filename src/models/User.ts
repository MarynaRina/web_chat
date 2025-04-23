import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  phone: string;
  verificationCode: string;
}

const UserSchema = new Schema<IUser>({
  phone: { type: String, required: true, unique: true },
  verificationCode: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);