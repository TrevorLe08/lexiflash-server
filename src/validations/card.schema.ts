import { z } from 'zod';
import { createCardSubSchema } from './studySet.schema.js';

export const createCardSchema = z.object({
  body: createCardSubSchema,
});

export const bulkCreateCardsSchema = z.object({
  body: z.object({
    cards: z.array(createCardSubSchema).min(1, 'At least one card is required'),
  }),
});

export const importCardsFromTextSchema = z.object({
  body: z.object({
    text: z.string().min(1, 'Text content is required'),
    termSeparator: z.string().min(1).default('\t'), // tab or comma or custom
    cardSeparator: z.string().min(1).default('\n'), // newline or semicolon
  }),
});

export const updateCardSchema = z.object({
  body: z.object({
    term: z.string().min(1).optional(),
    definition: z.string().min(1).optional(),
    phonetic: z.string().optional(),
    example: z.string().optional(),
    hint: z.string().optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
    audioUrl: z.string().url().optional().or(z.literal('')),
    orderIndex: z.number().int().nonnegative().optional(),
  }),
});
