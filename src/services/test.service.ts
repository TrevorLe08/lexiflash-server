import { mockDb } from '../db/mockDb.js';
import {
  QuestionType,
  StudyMode,
  CardStudyStatus,
  PrivacyLevel,
} from '../config/constants.js';
import {
  GenerateTestOptions,
  GeneratedTest,
  TestQuestion,
  SubmitTestAnswer,
  TestHistory,
  TestResultQuestionReview,
} from '../types/test.types.js';
import { UserCardProgress } from '../types/study.types.js';
import { Card } from '../types/card.types.js';
import { generateId } from '../utils/id.js';
import { ApiError } from '../utils/apiError.js';
import { SrsService } from './srs.service.js';

// Temporary cache for generated tests to validate submissions
const activeTestsCache = new Map<
  string,
  { questions: TestQuestion[]; studySetId: string }
>();

export class TestService {
  static shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = temp;
    }
    return arr;
  }

  static async generateTest(
    setId: string,
    options: GenerateTestOptions,
    userId?: string
  ): Promise<GeneratedTest> {
    const set = mockDb.studySets.get(setId);
    if (!set) {
      throw ApiError.notFound('Study set not found');
    }

    const isOwner = userId && set.creatorId === userId;
    if (!isOwner) {
      if (set.privacy === PrivacyLevel.PRIVATE) {
        throw ApiError.forbidden('This study set is private');
      }
      if (set.privacy === PrivacyLevel.PASSWORD) {
        if (!options.password || options.password !== set.password) {
          throw ApiError.forbidden(
            'Invalid password for this protected study set'
          );
        }
      }
    }

    let cards: Card[] = [];
    for (const c of mockDb.cards.values()) {
      if (c.studySetId === setId) {
        cards.push(c);
      }
    }

    if (cards.length < 1) {
      throw ApiError.badRequest(
        'Study set must have at least 1 card to generate a test'
      );
    }

    // Filter starred only if requested
    if (options.starredOnly && userId) {
      const starredCardIds = new Set(
        Array.from(mockDb.userCardProgress.values())
          .filter(
            (p) => p.userId === userId && p.isStarred && p.studySetId === setId
          )
          .map((p) => p.cardId)
      );
      const filtered = cards.filter((c) => starredCardIds.has(c.id));
      if (filtered.length >= 1) {
        cards = filtered;
      }
    }

    const shuffledCards = this.shuffle(cards);
    const requestedCount = Math.max(
      1,
      Math.min(options.questionCount || 10, shuffledCards.length)
    );
    const selectedCards = shuffledCards.slice(0, requestedCount);
    let allowedTypes = options.questionTypes?.length
      ? options.questionTypes
      : [
          QuestionType.MULTIPLE_CHOICE,
          QuestionType.TRUE_FALSE,
          QuestionType.WRITTEN,
        ];

    // Enforce business rules based on card count:
    // 1 card: only written is possible
    if (cards.length === 1) {
      allowedTypes = [QuestionType.WRITTEN];
    } else if (cards.length === 2) {
      // 2 cards: lock multiple choice (needs min 3 cards)
      allowedTypes = allowedTypes.filter(
        (t) => t !== QuestionType.MULTIPLE_CHOICE
      );
      if (allowedTypes.length === 0) {
        allowedTypes = [QuestionType.TRUE_FALSE, QuestionType.WRITTEN];
      }
    }

    const questions: TestQuestion[] = [];
    const allDefinitions = Array.from(mockDb.cards.values()).map(
      (c) => c.definition
    );

    selectedCards.forEach((card, index) => {
      const questionId = generateId('q');
      const questionType = allowedTypes[index % allowedTypes.length]!;

      if (questionType === QuestionType.MULTIPLE_CHOICE) {
        // Collect 3 distractor definitions
        const otherCards = cards.filter((c) => c.id !== card.id);
        let distractors = this.shuffle(otherCards)
          .slice(0, 3)
          .map((c) => c.definition);

        // Fallback distractors if set has fewer cards
        while (distractors.length < 3) {
          const randomDef =
            allDefinitions[Math.floor(Math.random() * allDefinitions.length)]!;
          if (
            !distractors.includes(randomDef) &&
            randomDef !== card.definition
          ) {
            distractors.push(randomDef);
          }
        }

        const optionsList = this.shuffle([card.definition, ...distractors]);

        questions.push({
          id: questionId,
          cardId: card.id,
          type: QuestionType.MULTIPLE_CHOICE,
          prompt: `What is the definition of "${card.term}"?`,
          correctAnswer: card.definition,
          options: optionsList,
        });
      } else if (questionType === QuestionType.TRUE_FALSE) {
        const isTrueStatement = Math.random() > 0.5;
        let displayedDefinition = card.definition;

        if (!isTrueStatement) {
          const otherCards = cards.filter((c) => c.id !== card.id);
          const fakeCard =
            otherCards[Math.floor(Math.random() * otherCards.length)] || card;
          displayedDefinition = fakeCard.definition;
        }

        questions.push({
          id: questionId,
          cardId: card.id,
          type: QuestionType.TRUE_FALSE,
          prompt: `Term: "${card.term}"\nDefinition: "${displayedDefinition}"\nIs this match correct?`,
          correctAnswer: isTrueStatement ? 'true' : 'false',
          options: ['true', 'false'],
        });
      } else if (questionType === QuestionType.WRITTEN) {
        questions.push({
          id: questionId,
          cardId: card.id,
          type: QuestionType.WRITTEN,
          prompt: `Give the English term for: "${card.definition}"${
            card.phonetic ? ` (${card.phonetic})` : ''
          }`,
          correctAnswer: card.term,
        });
      } else if (questionType === QuestionType.MATCHING) {
        // Matching format
        questions.push({
          id: questionId,
          cardId: card.id,
          type: QuestionType.MULTIPLE_CHOICE,
          prompt: `Select the correct English term for definition: "${card.definition}"`,
          correctAnswer: card.term,
          options: this.shuffle(cards.slice(0, 4).map((c) => c.term)),
        });
      }
    });

    const testId = generateId('tst');
    activeTestsCache.set(testId, { questions, studySetId: setId });

    // Client receives questions without correct answers and with masked cardId to prevent answer disclosure
    const clientQuestions = questions.map((q) => ({
      id: q.id,
      cardId: '',
      type: q.type,
      prompt: q.prompt,
      options: q.options,
      matchingPairs: q.matchingPairs,
      userAnswer: q.userAnswer,
    }));

    return {
      testId,
      studySetId: setId,
      studySetTitle: set.title,
      totalQuestions: questions.length,
      questions: clientQuestions,
    };
  }

  static async submitTest(
    testId: string,
    answers: SubmitTestAnswer[],
    timeSpentSeconds: number,
    userId: string
  ): Promise<TestHistory> {
    const cachedTest = activeTestsCache.get(testId);
    if (!cachedTest) {
      throw ApiError.badRequest(
        'Test session expired or invalid. Please generate a new test.'
      );
    }

    const { questions, studySetId } = cachedTest;
    let correctCount = 0;
    const reviews: TestResultQuestionReview[] = [];
    const correctTerms: string[] = [];
    const incorrectTerms: string[] = [];
    const now = new Date().toISOString();

    // Pre-index answers and user progress for O(1) lookup
    const answerMapByQuestionId = new Map<string, SubmitTestAnswer>();
    const answerMapByCardId = new Map<string, SubmitTestAnswer>();
    for (const a of answers) {
      if (a.questionId) answerMapByQuestionId.set(a.questionId, a);
      if (a.cardId) answerMapByCardId.set(a.cardId, a);
    }

    const userProgressMap = new Map<string, UserCardProgress>();
    for (const p of mockDb.userCardProgress.values()) {
      if (p.userId === userId && p.studySetId === studySetId) {
        userProgressMap.set(p.cardId, p);
      }
    }

    questions.forEach((q) => {
      const userSubmission =
        answerMapByQuestionId.get(q.id) || answerMapByCardId.get(q.cardId);
      const rawUserAnswer = userSubmission?.userAnswer?.trim() || '';

      let isCorrect = false;
      if (q.type === QuestionType.TRUE_FALSE) {
        const normalizeTf = (val: string): 'true' | 'false' | null => {
          const s = val.trim().toLowerCase();
          if (['true', 't', 'đúng', 'dung', 'yes', '1'].includes(s))
            return 'true';
          if (['false', 'f', 'sai', 'no', '0'].includes(s)) return 'false';
          return null;
        };
        const userNorm = normalizeTf(rawUserAnswer);
        const correctNorm = normalizeTf(q.correctAnswer);
        isCorrect = userNorm !== null && userNorm === correctNorm;
      } else if (q.type === QuestionType.WRITTEN) {
        // Case-insensitive normalized match
        isCorrect =
          rawUserAnswer.toLowerCase().replace(/[^a-zA-Z0-9]/g, '') ===
          q.correctAnswer.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
      } else {
        isCorrect =
          rawUserAnswer.toLowerCase() === q.correctAnswer.toLowerCase();
      }

      const card = mockDb.cards.get(q.cardId);
      const termName = card?.term || q.cardId;

      // Update card progress & lapses in Mistake Bank
      let progressRecord = userProgressMap.get(q.cardId);
      if (!progressRecord) {
        progressRecord = {
          id: generateId('prog'),
          userId,
          cardId: q.cardId,
          studySetId,
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
        userProgressMap.set(q.cardId, progressRecord);
      }

      if (isCorrect) {
        correctCount += 1;
        correctTerms.push(termName);
        if (progressRecord.lapses > 0) {
          progressRecord.lapses = Math.max(0, progressRecord.lapses - 1);
        }
      } else {
        incorrectTerms.push(termName);
        progressRecord.lapses = (progressRecord.lapses || 0) + 1;
        if (progressRecord.status === CardStudyStatus.NOT_STUDIED) {
          progressRecord.status = CardStudyStatus.LEARNING;
        }
      }

      progressRecord.lastStudiedAt = now;
      progressRecord.updatedAt = now;
      mockDb.userCardProgress.set(progressRecord.id, progressRecord);

      reviews.push({
        questionId: q.id,
        cardId: q.cardId,
        prompt: q.prompt,
        type: q.type,
        userAnswer: rawUserAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
      });
    });

    const totalQuestions = questions.length;
    const scorePercentage =
      totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 100)
        : 0;
    const incorrectCount = totalQuestions - correctCount;

    const testHistory: TestHistory = {
      id: generateId('his'),
      userId,
      studySetId,
      scorePercentage,
      totalQuestions,
      correctCount,
      incorrectCount,
      timeSpentSeconds,
      questionTypes: Array.from(new Set(questions.map((q) => q.type))),
      reviews,
      correctTerms,
      incorrectTerms,
      createdAt: now,
    };

    mockDb.testHistories.set(testHistory.id, testHistory);

    // Database Optimization: Keep at most 10 recent test histories per user per study set
    const userSetHistories: TestHistory[] = [];
    for (const h of mockDb.testHistories.values()) {
      if (h.userId === userId && h.studySetId === studySetId) {
        userSetHistories.push(h);
      }
    }
    if (userSetHistories.length > 10) {
      userSetHistories.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const toRemove = userSetHistories.slice(0, userSetHistories.length - 10);
      for (const old of toRemove) {
        mockDb.testHistories.delete(old.id);
      }
    }

    // Record study session
    await SrsService.recordSession(userId, {
      studySetId,
      mode: StudyMode.TEST,
      cardsTotal: totalQuestions,
      cardsCorrect: correctCount,
      cardsIncorrect: incorrectCount,
      timeSpentSeconds,
    });

    // Cleanup cache
    activeTestsCache.delete(testId);

    return testHistory;
  }

  static async getTestHistories(
    userId: string,
    setId?: string
  ): Promise<TestHistory[]> {
    const histories: TestHistory[] = [];
    for (const h of mockDb.testHistories.values()) {
      if (h.userId === userId) {
        if (!setId || h.studySetId === setId) {
          histories.push(h);
        }
      }
    }
    histories.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return histories;
  }
}
