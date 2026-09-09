import mongoose, { Schema, Document } from 'mongoose';
import { Card } from '../types/card.types.js';

export interface CardDocument extends Omit<Card, 'id'>, Document {
  id: string;
}

const cardSchema = new Schema<CardDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    studySetId: { type: String, required: true, index: true },
    term: { type: String, required: true, trim: true },
    definition: { type: String, required: true, trim: true },
    phonetic: { type: String, default: '' },
    example: { type: String, default: '' },
    hint: { type: String, default: '' },
    imageUrl: { type: String },
    audioUrl: { type: String },
    orderIndex: { type: Number, default: 0, index: true },
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

// Compound index for fast retrieval of cards sorted by order
cardSchema.index({ studySetId: 1, orderIndex: 1 });

export const CardModel = mongoose.model<CardDocument>('Card', cardSchema);
