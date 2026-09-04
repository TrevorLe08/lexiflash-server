import { Request, Response, NextFunction } from 'express';
import { SrsService } from '../services/srs.service.js';
import { CardService } from '../services/card.service.js';
import { StreakService } from '../services/streak.service.js';
import { UserService } from '../services/user.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { getParam } from '../utils/params.js';

export class StudyController {
  static async getFlashcards(req: Request, res: Response, next: NextFunction) {
    try {
      const setId = getParam(req.params['setId']);
      const shuffle = req.query['shuffle'] === 'true';
      const starredOnly = req.query['starredOnly'] === 'true';
      const userId = req.user?.userId;

      let cards = await CardService.getCardsBySetId(setId);

      if (starredOnly && userId) {
        const dueReviews = await SrsService.getDueReviewCards(userId, setId);
        const starredCardIds = new Set(
          dueReviews.filter((r) => r.progress.isStarred).map((r) => r.id)
        );
        cards = cards.filter((c) => starredCardIds.has(c.id));
      }

      if (shuffle) {
        cards = [...cards].sort(() => Math.random() - 0.5);
      }

      return ApiResponse.success(res, cards, 'Flashcards retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async submitLearnAnswer(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const setId = getParam(req.params['setId']);
      const userId = req.user!.userId;
      const result = await SrsService.submitLearnAnswer(
        userId,
        setId,
        req.body
      );
      return ApiResponse.success(res, result, 'Answer processed by SRS engine');
    } catch (error) {
      next(error);
    }
  }

  static async getDueReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const setId = req.query['setId'] as string | undefined;
      const dueCards = await SrsService.getDueReviewCards(userId, setId);
      return ApiResponse.success(
        res,
        dueCards,
        `Found ${dueCards.length} cards due for review today`
      );
    } catch (error) {
      next(error);
    }
  }

  static async getSetProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const setId = getParam(req.params['setId']);
      const userId = req.user!.userId;
      const summary = await SrsService.getSetProgressSummary(userId, setId);
      return ApiResponse.success(res, summary, 'Set study progress retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getMistakeBank(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const mistakes = await SrsService.getMistakeBankCards(userId);
      return ApiResponse.success(
        res,
        mistakes,
        `Found ${mistakes.length} cards in Mistake Bank`
      );
    } catch (error) {
      next(error);
    }
  }

  static async submitMistakeAnswer(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user!.userId;
      const result = await SrsService.submitMistakeAnswer(userId, req.body);
      return ApiResponse.success(
        res,
        result,
        'Mistake answer processed successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  static async recordSession(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const session = await SrsService.recordSession(userId, req.body);
      return ApiResponse.created(res, session, 'Study session recorded');
    } catch (error) {
      next(error);
    }
  }

  static async recordStreak(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const result = await StreakService.recordStudyActivity(userId);
      return ApiResponse.success(res, result, 'Streak activity recorded');
    } catch (error) {
      next(error);
    }
  }

  static async getStreak(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const user = await UserService.getProfile(userId, userId);
      return ApiResponse.success(
        res,
        {
          streakCount: user.streakCount,
          lastStudyDate: user.lastStudyDate,
          isStreakActiveToday: user.isStreakActiveToday,
          isStreakAtRisk: user.isStreakAtRisk,
          streakStatus: user.streakStatus,
        },
        'Streak status retrieved'
      );
    } catch (error) {
      next(error);
    }
  }
}
