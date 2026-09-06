import { mockDb } from '../db/mockDb.js';
import { CardStudyStatus, StudyMode } from '../config/constants.js';
import {
  UserCardProgress,
  StudySession,
  SetStudyProgressSummary,
  LearnAnswerInput,
} from '../types/study.types.js';
import { Card } from '../types/card.types.js';
import { StreakInfo } from '../types/user.types.js';
import { generateId } from '../utils/id.js';
import { ApiError } from '../utils/apiError.js';
import { StreakService } from './streak.service.js';

export class SrsService {
  /**
   * SuperMemo-2 (SM-2) Spaced Repetition Algorithm Calculation
   */
  static calculateSm2(
    currentProgress: UserCardProgress,
    quality: number // 0 to 5
  ): {
    status: CardStudyStatus;
    repetitionNumber: number;
    easeFactor: number;
    intervalDays: number;
    nextReviewDate: string;
    lapses: number;
  } {
    let { repetitionNumber, easeFactor, intervalDays, lapses } =
      currentProgress;

    // Quality < 3 means recall failed / incorrect
    if (quality < 3) {
      repetitionNumber = 0;
      intervalDays = 1;
      lapses += 1;
    } else {
      // Successful recall
      if (repetitionNumber === 0) {
        intervalDays = 1;
      } else if (repetitionNumber === 1) {
        intervalDays = 6;
      } else {
        intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
      }
      repetitionNumber += 1;
      if (lapses > 0) {
        lapses = Math.max(0, lapses - 1);
      }
    }

    // Ease Factor calculation formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    easeFactor =
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) {
      easeFactor = 1.3;
    }

    // Determine mastery status
    let status: CardStudyStatus = CardStudyStatus.LEARNING;
    if (intervalDays >= 21 && repetitionNumber >= 3) {
      status = CardStudyStatus.MASTERED;
    }

    const nextReviewDate = new Date(
      Date.now() + intervalDays * 86400000
    ).toISOString();

    return {
      status,
      repetitionNumber,
      easeFactor: Number(easeFactor.toFixed(2)),
      intervalDays,
      nextReviewDate,
      lapses,
    };
  }

  static async submitLearnAnswer(
    userId: string,
    setId: string,
    input: LearnAnswerInput
  ): Promise<{
    progress: UserCardProgress;
    isCorrect: boolean;
    streak?: StreakInfo;
  }> {
    const card = mockDb.cards.get(input.cardId);
    if (!card || card.studySetId !== setId) {
      throw ApiError.notFound('Card not found in this study set');
    }

    // Find or create progress record
    let progressRecord: UserCardProgress | undefined;
    for (const p of mockDb.userCardProgress.values()) {
      if (p.userId === userId && p.cardId === input.cardId) {
        progressRecord = p;
        break;
      }
    }

    const now = new Date().toISOString();
    if (!progressRecord) {
      progressRecord = {
        id: generateId('prog'),
        userId,
        cardId: input.cardId,
        studySetId: setId,
        status: CardStudyStatus.NOT_STUDIED,
        repetitionNumber: 0,
        easeFactor: 2.5,
        intervalDays: 0,
        nextReviewDate: now,
        lapses: 0,
        isStarred: false,
        lastStudiedAt: now,
        createdAt: now,
        updatedAt: now,
      };
    }

    const sm2Result = this.calculateSm2(progressRecord, input.quality);

    progressRecord.status = sm2Result.status;
    progressRecord.repetitionNumber = sm2Result.repetitionNumber;
    progressRecord.easeFactor = sm2Result.easeFactor;
    progressRecord.intervalDays = sm2Result.intervalDays;
    progressRecord.nextReviewDate = sm2Result.nextReviewDate;
    progressRecord.lapses = sm2Result.lapses;
    progressRecord.lastStudiedAt = now;
    progressRecord.updatedAt = now;

    mockDb.userCardProgress.set(progressRecord.id, progressRecord);

    const streakResult = await StreakService.recordStudyActivity(userId);

    return {
      progress: progressRecord,
      isCorrect: input.quality >= 3,
      streak: streakResult.streakInfo,
    };
  }

  static async getDueReviewCards(
    userId: string,
    studySetId?: string
  ): Promise<Array<Card & { progress: UserCardProgress }>> {
    const now = new Date().toISOString();
    const dueCards: Array<Card & { progress: UserCardProgress }> = [];

    for (const progress of mockDb.userCardProgress.values()) {
      if (progress.userId === userId) {
        if (studySetId && progress.studySetId !== studySetId) {
          continue;
        }

        if (progress.nextReviewDate <= now) {
          const card = mockDb.cards.get(progress.cardId);
          if (card) {
            dueCards.push({
              ...card,
              progress,
            });
          }
        }
      }
    }

    return dueCards;
  }

  static async getSetProgressSummary(
    userId: string,
    studySetId: string
  ): Promise<SetStudyProgressSummary> {
    const cards: Card[] = [];
    for (const c of mockDb.cards.values()) {
      if (c.studySetId === studySetId) {
        cards.push(c);
      }
    }

    const totalCards = cards.length;
    let notStudiedCount = 0;
    let learningCount = 0;
    let masteredCount = 0;
    let starredCount = 0;

    // Pre-index user progress into a Map for O(1) lookup
    const userProgressMap = new Map<string, UserCardProgress>();
    for (const p of mockDb.userCardProgress.values()) {
      if (p.userId === userId && p.studySetId === studySetId) {
        userProgressMap.set(p.cardId, p);
      }
    }

    for (const card of cards) {
      const cardProgress = userProgressMap.get(card.id);

      if (
        !cardProgress ||
        cardProgress.status === CardStudyStatus.NOT_STUDIED
      ) {
        notStudiedCount += 1;
      } else if (cardProgress.status === CardStudyStatus.LEARNING) {
        learningCount += 1;
      } else if (cardProgress.status === CardStudyStatus.MASTERED) {
        masteredCount += 1;
      }

      if (cardProgress?.isStarred) {
        starredCount += 1;
      }
    }

    const percentMastered =
      totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;

    return {
      studySetId,
      totalCards,
      notStudiedCount,
      learningCount,
      masteredCount,
      starredCount,
      percentMastered,
    };
  }

  /**
   * Retrieve cards from Mistake Bank (cards with lapses > 0)
   * Free users are limited to FREE_MISTAKE_BANK_LIMIT cards.
   */
  static async getMistakeBankCards(
    userId: string
  ): Promise<
    Array<Card & { progress: UserCardProgress; studySetTitle?: string }>
  > {
    const mistakeCards: Array<
      Card & { progress: UserCardProgress; studySetTitle?: string }
    > = [];

    for (const progress of mockDb.userCardProgress.values()) {
      if (progress.userId === userId) {
        // Strict mistake bank rule: card must have recorded lapses > 0
        const isMistake = progress.lapses > 0;

        if (isMistake) {
          const card = mockDb.cards.get(progress.cardId);
          if (card) {
            const set = mockDb.studySets.get(card.studySetId);
            mistakeCards.push({
              ...card,
              progress,
              studySetTitle: set?.title,
            });
          }
        }
      }
    }

    // Sort by lapses descending then lowest easeFactor
    mistakeCards.sort((a, b) => {
      if (b.progress.lapses !== a.progress.lapses) {
        return b.progress.lapses - a.progress.lapses;
      }
      return a.progress.easeFactor - b.progress.easeFactor;
    });

    // Keep and preserve all recorded mistakes for the user to review and correct
    return mistakeCards;
  }

  /**
   * Submit an answer for Mistake Bank Quiz:
   * - If correct: lapses - 1. If lapses reaches 0, it's removed from Mistake Bank.
   * - If incorrect: lapses + 1.
   */
  static async submitMistakeAnswer(
    userId: string,
    input: { cardId: string; isCorrect: boolean }
  ): Promise<{
    cardId: string;
    isCorrect: boolean;
    lapses: number;
    removedFromMistakeBank: boolean;
    progress: UserCardProgress;
    streak?: StreakInfo;
  }> {
    const card = mockDb.cards.get(input.cardId);
    if (!card) {
      throw ApiError.notFound('Card not found');
    }

    // Find progress record
    let progressRecord: UserCardProgress | undefined;
    for (const p of mockDb.userCardProgress.values()) {
      if (p.userId === userId && p.cardId === input.cardId) {
        progressRecord = p;
        break;
      }
    }

    const now = new Date().toISOString();
    if (!progressRecord) {
      progressRecord = {
        id: generateId('prog'),
        userId,
        cardId: input.cardId,
        studySetId: card.studySetId,
        status: CardStudyStatus.LEARNING,
        repetitionNumber: 0,
        easeFactor: 2.5,
        intervalDays: 1,
        nextReviewDate: now,
        lapses: 1,
        isStarred: false,
        lastStudiedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      mockDb.userCardProgress.set(progressRecord.id, progressRecord);
    }

    if (input.isCorrect) {
      // Correct: decrease lapses by 1
      progressRecord.lapses = Math.max(0, (progressRecord.lapses || 1) - 1);
      const sm2 = this.calculateSm2(progressRecord, 4);
      progressRecord.status = sm2.status;
      progressRecord.repetitionNumber = sm2.repetitionNumber;
      progressRecord.easeFactor = sm2.easeFactor;
      progressRecord.intervalDays = sm2.intervalDays;
      progressRecord.nextReviewDate = sm2.nextReviewDate;
    } else {
      // Incorrect: increase lapses by 1
      progressRecord.lapses = (progressRecord.lapses || 0) + 1;
      const sm2 = this.calculateSm2(progressRecord, 1);
      progressRecord.status = CardStudyStatus.LEARNING;
      progressRecord.repetitionNumber = sm2.repetitionNumber;
      progressRecord.easeFactor = sm2.easeFactor;
      progressRecord.intervalDays = sm2.intervalDays;
      progressRecord.nextReviewDate = sm2.nextReviewDate;
    }

    progressRecord.lastStudiedAt = now;
    progressRecord.updatedAt = now;
    mockDb.userCardProgress.set(progressRecord.id, progressRecord);

    const streakResult = await StreakService.recordStudyActivity(userId);

    return {
      cardId: input.cardId,
      isCorrect: input.isCorrect,
      lapses: progressRecord.lapses,
      removedFromMistakeBank: progressRecord.lapses === 0,
      progress: progressRecord,
      streak: streakResult.streakInfo,
    };
  }

  static async recordSession(
    userId: string,
    input: {
      studySetId: string;
      mode: StudyMode;
      cardsTotal: number;
      cardsCorrect: number;
      cardsIncorrect: number;
      timeSpentSeconds: number;
      correctCardIds?: string[];
      incorrectCardIds?: string[];
    }
  ): Promise<
    StudySession & {
      streak?: StreakInfo;
      streakIncreased?: boolean;
      streakMaintained?: boolean;
      mistakesUpdated?: { added: number; resolved: number };
    }
  > {
    const now = new Date().toISOString();
    const session: StudySession = {
      id: generateId('ses'),
      userId,
      studySetId: input.studySetId,
      mode: input.mode,
      cardsTotal: input.cardsTotal,
      cardsCorrect: input.cardsCorrect,
      cardsIncorrect: input.cardsIncorrect,
      timeSpentSeconds: input.timeSpentSeconds,
      completedAt: now,
    };

    mockDb.studySessions.set(session.id, session);

    // Update Mistake Bank (lapses) if card IDs provided
    let added = 0;
    let resolved = 0;

    if (input.incorrectCardIds && input.incorrectCardIds.length > 0) {
      for (const cardId of input.incorrectCardIds) {
        let progressRecord: UserCardProgress | undefined;
        for (const p of mockDb.userCardProgress.values()) {
          if (p.userId === userId && p.cardId === cardId) {
            progressRecord = p;
            break;
          }
        }

        if (!progressRecord) {
          progressRecord = {
            id: generateId('prog'),
            userId,
            cardId,
            studySetId: input.studySetId,
            status: CardStudyStatus.LEARNING,
            repetitionNumber: 0,
            easeFactor: 2.5,
            intervalDays: 0,
            nextReviewDate: now,
            lapses: 1,
            isStarred: false,
            lastStudiedAt: now,
            createdAt: now,
            updatedAt: now,
          };
        } else {
          progressRecord.lapses = (progressRecord.lapses || 0) + 1;
          if (progressRecord.status === CardStudyStatus.NOT_STUDIED) {
            progressRecord.status = CardStudyStatus.LEARNING;
          }
          progressRecord.lastStudiedAt = now;
          progressRecord.updatedAt = now;
        }
        mockDb.userCardProgress.set(progressRecord.id, progressRecord);
        added++;
      }
    }

    if (input.correctCardIds && input.correctCardIds.length > 0) {
      for (const cardId of input.correctCardIds) {
        for (const p of mockDb.userCardProgress.values()) {
          if (p.userId === userId && p.cardId === cardId) {
            if (p.lapses > 0) {
              p.lapses = Math.max(0, p.lapses - 1);
              p.lastStudiedAt = now;
              p.updatedAt = now;
              mockDb.userCardProgress.set(p.id, p);
              resolved++;
            }
            break;
          }
        }
      }
    }

    const streakResult = await StreakService.recordStudyActivity(userId);

    return {
      ...session,
      streak: streakResult.streakInfo,
      streakIncreased: streakResult.streakIncreased,
      streakMaintained: streakResult.streakMaintained,
      mistakesUpdated: { added, resolved },
    };
  }
}
