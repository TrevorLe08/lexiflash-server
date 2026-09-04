import { z } from 'zod';
import { QuestionType, StudyMode } from '../config/constants.js';

export const learnAnswerSchema = z.object({
  body: z.object({
    cardId: z.string().min(1, 'Card ID is required'),
    quality: z.number().int().min(0).max(5), // 0 to 5 for SM-2
    userResponse: z.string().optional(),
  }),
});

export const recordStudySessionSchema = z.object({
  body: z.object({
    studySetId: z.string().min(1, 'Study set ID is required'),
    mode: z.nativeEnum(StudyMode),
    cardsTotal: z.number().int().nonnegative(),
    cardsCorrect: z.number().int().nonnegative(),
    cardsIncorrect: z.number().int().nonnegative(),
    timeSpentSeconds: z.number().int().nonnegative(),
  }),
});

export const generateTestSchema = z.object({
  body: z.object({
    questionCount: z.number().int().min(1).max(50).optional().default(10),
    questionTypes: z
      .array(z.nativeEnum(QuestionType))
      .optional()
      .default([
        QuestionType.MULTIPLE_CHOICE,
        QuestionType.TRUE_FALSE,
        QuestionType.WRITTEN,
      ]),
    starredOnly: z.boolean().optional().default(false),
    promptWith: z
      .enum(['term', 'definition', 'both'])
      .optional()
      .default('both'),
  }),
});

export const submitTestSchema = z.object({
  body: z.object({
    timeSpentSeconds: z.number().int().nonnegative().default(0),
    answers: z.array(
      z.object({
        questionId: z.string().min(1),
        cardId: z.string().min(1),
        userAnswer: z.string(),
      })
    ),
  }),
});

export const submitMatchScoreSchema = z.object({
  body: z.object({
    timeRecordMs: z
      .number()
      .int()
      .positive('Time record must be positive milliseconds'),
    matchedPairs: z.number().int().positive('Matched pairs must be positive'),
  }),
});

export const mistakeAnswerSchema = z.object({
  body: z.object({
    cardId: z.string().min(1, 'Card ID is required'),
    isCorrect: z.boolean(),
  }),
});
