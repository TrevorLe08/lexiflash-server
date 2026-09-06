import { z } from 'zod';

export const isEnglishTerm = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > 100) return false;

  // Must contain at least one English letter
  if (!/[a-zA-Z]/.test(trimmed)) return false;

  // Must only contain standard ASCII characters (English alphabet, space, punctuation)
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if (code > 127) {
      return false; // contains non-ASCII characters (e.g. Vietnamese diacritics, CJK, etc.)
    }
  }

  // Must only contain English letters, digits, spaces, hyphens, apostrophes, and standard punctuation
  const englishRegex = /^[a-zA-Z0-9\s\-',.?!/"]+$/;
  if (!englishRegex.test(trimmed)) return false;

  return true;
};

export const languageCodeSchema = z
  .string()
  .regex(
    /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,4})?$/,
    'Mã ngôn ngữ không hợp lệ (ví dụ: en, vi, en-US)'
  );

export const aiGenerateSetSchema = z.object({
  body: z.object({
    prompt: z
      .string()
      .min(3, 'Prompt or text content must be at least 3 characters')
      .max(5000),
    cardCount: z
      .number()
      .int()
      .min(5, 'Card count must be between 5 and 15')
      .max(15, 'Card count must be between 5 and 15')
      .optional()
      .default(10),
    sourceLanguage: languageCodeSchema.optional().default('en'),
    targetLanguage: languageCodeSchema.optional().default('vi'),
  }),
});

export const aiExplainTermSchema = z.object({
  body: z.object({
    term: z.string().min(1, 'Term is required').refine(isEnglishTerm, {
      message: 'Vui lòng nhập từ vựng bằng tiếng Anh.',
    }),
    context: z
      .string()
      .max(500, 'Context cannot exceed 500 characters')
      .optional(),
    targetLanguage: languageCodeSchema.optional().default('vi'),
  }),
});

export const aiGeneratedCardSchema = z.object({
  term: z.string(),
  definition: z.string(),
  phonetic: z.string().optional(),
  example: z.string().optional(),
  hint: z.string().optional(),
});

export const aiGenerateSetResponseSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()).default([]),
  cards: z.array(aiGeneratedCardSchema).min(1),
});

export const aiExplainTermResponseSchema = z.object({
  term: z.string(),
  definition: z.string(),
  phonetic: z.string().default(''),
  partOfSpeech: z.string().default(''),
  mnemonicStory: z.string().default(''),
  examples: z.array(z.string()).default([]),
  synonyms: z.array(z.string()).default([]),
  antonyms: z.array(z.string()).default([]),
  commonCollocations: z.array(z.string()).default([]),
});
