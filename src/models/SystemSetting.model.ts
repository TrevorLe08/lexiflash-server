import mongoose, { Schema, Document } from 'mongoose';

export interface SystemSettingDocument extends Document {
  key: string;
  value: any;
  updatedAt: Date;
}

const systemSettingSchema = new Schema<SystemSettingDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export const SystemSettingModel = mongoose.model<SystemSettingDocument>(
  'SystemSetting',
  systemSettingSchema
);
