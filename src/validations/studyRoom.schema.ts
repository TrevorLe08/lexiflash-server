import { z } from 'zod';

export const recordFocusSessionSchema = z.object({
  body: z.object({
    deckId: z.string().optional(),
    mode: z.enum(['POMODORO', 'SHORT_BREAK', 'LONG_BREAK', 'CUSTOM_STOPWATCH']),
    durationSeconds: z
      .number()
      .int()
      .min(1, 'Duration must be at least 1 second'),
    startedAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
    completedAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
    cardsReviewedCount: z.number().int().nonnegative().default(0),
  }),
});

export const createCustomQuestSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(100, 'Title cannot exceed 100 characters'),
    targetCount: z.number().int().min(1).default(1),
  }),
});

export const toggleQuestSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Quest ID is required'),
  }),
});
