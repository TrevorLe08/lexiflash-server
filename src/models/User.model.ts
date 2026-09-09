import mongoose, { Schema, Document } from 'mongoose';
import { User } from '../types/user.types.js';
import { UserRole } from '../config/constants.js';

export interface UserDocument extends Omit<User, 'id'>, Document {
  id: string;
}

const userSchema = new Schema<UserDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    avatarUrl: { type: String },
    bio: { type: String, default: '' },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    isBanned: { type: Boolean, default: false },
    isVip: { type: Boolean, default: false },
    vipExpiresAt: { type: String, default: null },
    vipPlan: { type: String, enum: ['1_MONTH', '1_YEAR', null], default: null },
    aiUsageToday: { type: Number, default: 0 },
    aiUsageResetDate: { type: String },
    streakCount: { type: Number, default: 0 },
    lastStudyDate: { type: String },
    isStreakActiveToday: { type: Boolean, default: false },
    isStreakAtRisk: { type: Boolean, default: false },
    streakStatus: { type: String, default: 'INACTIVE' },
    bookmarkedSetIds: { type: [String], default: [] },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const UserModel = mongoose.model<UserDocument>('User', userSchema);
