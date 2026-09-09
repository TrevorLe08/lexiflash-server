import mongoose, { Schema, Document } from 'mongoose';
import { StudySet } from '../types/studySet.types.js';
import { PrivacyLevel } from '../config/constants.js';

export interface StudySetDocument extends Omit<StudySet, 'id'>, Document {
  id: string;
}

const studySetSchema = new Schema<StudySetDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    privacy: {
      type: String,
      enum: Object.values(PrivacyLevel),
      default: PrivacyLevel.PUBLIC,
      index: true,
    },
    password: { type: String },
    level: {
      type: String,
      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL'],
      default: 'ALL',
      index: true,
    },
    sourceLanguage: { type: String, default: 'en' },
    targetLanguage: { type: String, default: 'vi' },
    creatorId: { type: String, required: true, index: true },
    tags: { type: [String], default: [], index: true },
    viewCount: { type: Number, default: 0 },
    dailyViews: { type: Schema.Types.Mixed, default: {} },
    starredUserIds: { type: [String], default: [] },
    bookmarkedUserIds: { type: [String], default: [] },
    isFeatured: { type: Boolean, default: false, index: true },
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

// Full text search index
studySetSchema.index({ title: 'text', description: 'text', tags: 'text' });

export const StudySetModel = mongoose.model<StudySetDocument>(
  'StudySet',
  studySetSchema
);
