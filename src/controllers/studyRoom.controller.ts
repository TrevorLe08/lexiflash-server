import { Request, Response, NextFunction } from 'express';
import { StudyRoomService } from '../services/studyRoom.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { getParam } from '../utils/params.js';

export class StudyRoomController {
  /**
   * GET /api/study-room/daily-dashboard
   */
  static async getDailyDashboard(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw ApiError.unauthorized('Authentication required');
      }

      const dashboard = await StudyRoomService.getDailyDashboard(userId);
      return ApiResponse.success(res, dashboard, 'Daily dashboard retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/study-room/sessions
   */
  static async recordSession(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw ApiError.unauthorized('Authentication required');
      }

      const session = await StudyRoomService.recordSession(userId, req.body);
      return ApiResponse.created(
        res,
        session,
        'Study session recorded successfully'
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/study-room/quests/custom
   */
  static async createCustomQuest(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw ApiError.unauthorized('Authentication required');
      }

      const quest = await StudyRoomService.createCustomQuest(userId, req.body);
      return ApiResponse.created(
        res,
        quest,
        'Custom quest created successfully'
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/study-room/quests/:id/toggle
   */
  static async toggleQuest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw ApiError.unauthorized('Authentication required');
      }

      const questId = getParam(req.params['id']);
      const quest = await StudyRoomService.toggleQuest(userId, questId);
      return ApiResponse.success(res, quest, 'Quest status updated');
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/study-room/quests/:id
   */
  static async deleteCustomQuest(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw ApiError.unauthorized('Authentication required');
      }

      const questId = getParam(req.params['id']);
      const result = await StudyRoomService.deleteCustomQuest(userId, questId);
      return ApiResponse.success(res, result, 'Custom quest deleted');
    } catch (err) {
      next(err);
    }
  }
}
