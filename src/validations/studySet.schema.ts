import { z } from 'zod';
import { PrivacyLevel } from '../config/constants.js';

export const createCardSubSchema = z.object({
  term: z.string().min(1, 'Term is required'),
  definition: z.string().min(1, 'Definition is required'),
  phonetic: z.string().optional(),
  example: z.string().optional(),
  hint: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  audioUrl: z.string().url().optional().or(z.literal('')),
  orderIndex: z.number().int().nonnegative().optional(),
});

export const createStudySetSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().max(1000).optional(),
    privacy: z.nativeEnum(PrivacyLevel).optional().default(PrivacyLevel.PUBLIC),
    password: z.string().optional(),
    level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL']).optional(),
    sourceLanguage: z.string().optional().default('en'),
    targetLanguage: z.string().optional().default('vi'),
    tags: z.array(z.string()).optional().default([]),
    cards: z.array(createCardSubSchema).optional().default([]),
  }),
});

export const updateCardSubSchema = z.object({
  id: z.string().optional(),
  term: z.string().min(1, 'Term is required'),
  definition: z.string().min(1, 'Definition is required'),
  phonetic: z.string().optional(),
  example: z.string().optional(),
  hint: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  audioUrl: z.string().url().optional().or(z.literal('')),
  orderIndex: z.number().int().nonnegative().optional(),
});

export const updateStudySetSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    privacy: z.nativeEnum(PrivacyLevel).optional(),
    password: z.string().optional(),
    level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL']).optional(),
    sourceLanguage: z.string().optional(),
    targetLanguage: z.string().optional(),
    tags: z.array(z.string()).optional(),
    cards: z.array(updateCardSubSchema).optional(),
  }),
});

export const queryStudySetsSchema = z.object({
  query: z.object({
    page: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => (v ? Math.max(1, Number(v)) : 1)),
    limit: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => (v ? Math.min(100, Math.max(1, Number(v))) : 10)),
    search: z.string().optional().or(z.literal('')),
    tag: z.string().optional().or(z.literal('')),
    level: z
      .union([
        z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL']),
        z.literal(''),
      ])
      .optional(),
    creatorId: z.string().optional().or(z.literal('')),
    onlyMine: z
      .union([z.string(), z.boolean()])
      .optional()
      .transform((v) => v === true || v === 'true'),
    onlyStarred: z
      .union([z.string(), z.boolean()])
      .optional()
      .transform((v) => v === true || v === 'true'),
    onlyBookmarked: z
      .union([z.string(), z.boolean()])
      .optional()
      .transform((v) => v === true || v === 'true'),
    sortBy: z
      .enum(['createdAt', 'viewCount', 'title'])
      .optional()
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});
