import { z } from 'zod';

export const createClassSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Class name is required').max(100),
    description: z.string().max(500).optional(),
    schoolName: z.string().max(100).optional(),
    allowMemberAddSets: z.boolean().optional().default(true),
    allowMemberInvite: z.boolean().optional().default(true),
  }),
});

export const updateClassSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    schoolName: z.string().max(100).optional(),
    allowMemberAddSets: z.boolean().optional(),
    allowMemberInvite: z.boolean().optional(),
  }),
});

export const joinClassSchema = z.object({
  body: z.object({
    joinCode: z.string().min(3, 'Valid join code is required'),
  }),
});

export const addRemoveClassSetsSchema = z.object({
  body: z.object({
    studySetIds: z
      .array(z.string())
      .min(1, 'At least one study set ID is required'),
  }),
});

export const queryClassesSchema = z.object({
  query: z.object({
    page: z.union([z.string(), z.number()]).optional().default(1),
    limit: z.union([z.string(), z.number()]).optional().default(12),
    search: z.string().optional().default(''),
  }),
});
