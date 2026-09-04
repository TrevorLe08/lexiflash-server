import { CardStudyStatus, StudyMode } from '../config/constants.js';

export interface UserCardProgress {
  id: string;
  userId: string;
  cardId: string;
  studySetId: string;
  status: CardStudyStatus;
  repetitionNumber: number; // consecutive correct reviews
  easeFactor: number; // default 2.5 (SM-2 standard)
  intervalDays: number; // days until next review
  nextReviewDate: string; // ISO string or YYYY-MM-DD
  lapses: number; // number of times forgotten
  isStarred: boolean; // starred by user for extra focus
  lastStudiedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  id: string;
  userId: string;
  studySetId: string;
  mode: StudyMode;
  cardsTotal: number;
  cardsCorrect: number;
  cardsIncorrect: number;
  timeSpentSeconds: number;
  completedAt: string;
}

export interface LearnAnswerInput {
  cardId: string;
  /**
   * Rating of recall quality:
   * 0 = complete blackout / incorrect
   * 1 = incorrect, but recognized upon seeing answer
   * 2 = correct with serious difficulty / hesitation
   * 3 = correct with some difficulty / moderate hesitation
   * 4 = correct with minimal hesitation
   * 5 = perfect recall / instant response
   */
  quality: number; // 0 to 5 (or boolean isCorrect: quality 1 vs 4)
  userResponse?: string;
}

export interface SetStudyProgressSummary {
  studySetId: string;
  totalCards: number;
  notStudiedCount: number;
  learningCount: number;
  masteredCount: number;
  starredCount: number;
  percentMastered: number;
}
