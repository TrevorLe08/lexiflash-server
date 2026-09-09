import mongoose, { Schema, Document } from 'mongoose';
import { UserCardProgress } from '../types/study.types.js';
import { CardStudyStatus } from '../config/constants.js';

export interface UserCardProgressDocument
  extends Omit<UserCardProgress, 'id'>, Document {
  id: string;
}

const userCardProgressSchema = new Schema<UserCardProgressDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    cardId: { type: String, required: true, index: true },
    studySetId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: Object.values(CardStudyStatus),
      default: CardStudyStatus.NOT_STUDIED,
      index: true,
    },
    repetitionNumber: { type: Number, default: 0 },
    easeFactor: { type: Number, default: 2.5 },
    intervalDays: { type: Number, default: 0 },
    nextReviewDate: { type: String, required: true, index: true },
    lapses: { type: Number, default: 0 },
    isStarred: { type: Boolean, default: false, index: true },
    lastStudiedAt: { type: String, required: true },
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

// Compound index for user & card lookups and due SRS queries
userCardProgressSchema.index({ userId: 1, cardId: 1 }, { unique: true });
userCardProgressSchema.index({ userId: 1, nextReviewDate: 1 });
userCardProgressSchema.index({ userId: 1, studySetId: 1 });

export const UserCardProgressModel = mongoose.model<UserCardProgressDocument>(
  'UserCardProgress',
  userCardProgressSchema
);
