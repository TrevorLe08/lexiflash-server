import mongoose, { Schema, Document } from 'mongoose';
import { Folder } from '../types/folder.types.js';
import { PrivacyLevel } from '../config/constants.js';

export interface FolderDocument extends Omit<Folder, 'id'>, Document {
  id: string;
}

const folderSchema = new Schema<FolderDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    creatorId: { type: String, required: true, index: true },
    privacy: {
      type: String,
      enum: Object.values(PrivacyLevel),
      default: PrivacyLevel.PUBLIC,
    },
    studySetIds: { type: [String], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const FolderModel = mongoose.model<FolderDocument>('Folder', folderSchema);
