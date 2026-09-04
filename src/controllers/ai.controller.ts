import { Request, Response, NextFunction } from 'express';
import { AiService } from '../services/ai.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { mockDb } from '../db/mockDb.js';
import {
  checkAndIncrementAiUsage,
  getVipAiDailyLimit,
} from '../utils/user.utils.js';

export class AiController {
  /**
   * Check and decrement daily AI usage for VIP users based on their plan (Month: 20, Year: 40).
   * Admin users have unlimited access.
   */
  private static enforceAiDailyLimit(req: Request): void {
    const userId = req.user?.userId;
    if (!userId) return;

    const user = mockDb.users.get(userId);
    if (!user) return;

    // Admins bypass daily limit
    if (user.role === 'ADMIN') return;

    const limit = getVipAiDailyLimit(user);
    const remaining = checkAndIncrementAiUsage(user);
    if (remaining <= 0 && (user.aiUsageToday || 0) >= limit) {
      const planName =
        user.vipPlan === '1_YEAR'
          ? 'VIP Diamond Elite (1 Năm)'
          : 'VIP Gold (1 Tháng)';
      const upgradeHint =
        user.vipPlan !== '1_YEAR'
          ? ' hoặc nâng cấp lên gói VIP Diamond Elite để nhận 40 lượt/ngày (gấp đôi quota)'
          : '';
      throw ApiError.forbidden(
        `Bạn đã sử dụng hết ${limit} lượt gọi AI hôm nay của gói ${planName}. Vui lòng quay lại vào ngày mai${upgradeHint}!`
      );
    }
  }

  static async generateSet(req: Request, res: Response, next: NextFunction) {
    try {
      AiController.enforceAiDailyLimit(req);

      const { prompt, cardCount, sourceLanguage, targetLanguage } = req.body;
      const generated = await AiService.generateStudySet(
        prompt,
        cardCount,
        sourceLanguage,
        targetLanguage
      );
      return ApiResponse.success(
        res,
        generated,
        'Flashcard set generated with AI'
      );
    } catch (error) {
      next(error);
    }
  }

  static async explain(req: Request, res: Response, next: NextFunction) {
    try {
      AiController.enforceAiDailyLimit(req);

      const { term, context, targetLanguage } = req.body;
      const explanation = await AiService.explainTerm(
        term,
        context,
        targetLanguage
      );
      return ApiResponse.success(res, explanation, 'Term explained with AI');
    } catch (error) {
      next(error);
    }
  }
}
