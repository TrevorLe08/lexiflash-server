import { Request, Response, NextFunction } from 'express';
import { MatchService } from '../services/match.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { getParam } from '../utils/params.js';

export class MatchController {
  static async getTiles(req: Request, res: Response, next: NextFunction) {
    try {
      const setId = getParam(req.params['setId']);
      const pairCount = req.query['pairCount']
        ? parseInt(req.query['pairCount'] as string, 10)
        : 6;
      const data = await MatchService.getMatchTiles(setId, pairCount);
      return ApiResponse.success(res, data, 'Match game tiles generated');
    } catch (error) {
      next(error);
    }
  }

  static async submitScore(req: Request, res: Response, next: NextFunction) {
    try {
      const setId = getParam(req.params['setId']);
      const userId = req.user!.userId;
      const { timeRecordMs, matchedPairs } = req.body;
      const result = await MatchService.submitScore(
        setId,
        timeRecordMs,
        matchedPairs,
        userId
      );
      return ApiResponse.success(
        res,
        result,
        result.isNewPersonalBest
          ? 'New personal best score recorded!'
          : 'Match score submitted'
      );
    } catch (error) {
      next(error);
    }
  }

  static async getLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const setId = getParam(req.params['setId']);
      const leaderboard = await MatchService.getLeaderboard(setId);
      return ApiResponse.success(
        res,
        leaderboard,
        'Match leaderboard retrieved'
      );
    } catch (error) {
      next(error);
    }
  }
}
