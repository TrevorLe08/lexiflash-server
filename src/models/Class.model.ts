import mongoose, { Schema, Document } from 'mongoose';
import { ClassGroup } from '../types/class.types.js';
import { ClassRole } from '../config/constants.js';

export interface ClassDocument extends Omit<ClassGroup, 'id'>, Document {
  id: string;
}

const classMemberSchema = new Schema(
  {
    userId: { type: String, required: true },
    role: { type: String, enum: Object.values(ClassRole), default: ClassRole.MEMBER },
    joinedAt: { type: String, required: true },
  },
  { _id: false }
);

const classSchema = new Schema<ClassDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    schoolName: { type: String, default: '' },
    creatorId: { type: String, required: true, index: true },
    joinCode: { type: String, required: true, unique: true, index: true },
    allowMemberAddSets: { type: Boolean, default: true },
    allowMemberInvite: { type: Boolean, default: true },
    members: { type: [classMemberSchema], default: [] },
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

export const ClassModel = mongoose.model<ClassDocument>('Class', classSchema);
