import { z } from 'zod';

export const createFolderSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(100),
    description: z.string().max(500).optional(),
    studySetIds: z.array(z.string()).optional().default([]),
  }),
});

export const updateFolderSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
  }),
});

export const addRemoveFolderSetsSchema = z.object({
  body: z.object({
    studySetIds: z
      .array(z.string())
      .min(1, 'At least one study set ID is required'),
  }),
});

export const queryFoldersSchema = z.object({
  query: z.object({
    page: z.union([z.string(), z.number()]).optional().default(1),
    limit: z.union([z.string(), z.number()]).optional().default(12),
    search: z.string().optional().default(''),
  }),
});
