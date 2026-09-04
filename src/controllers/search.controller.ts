import { Request, Response, NextFunction } from 'express';
import { SearchService } from '../services/search.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class SearchController {
  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const q = (req.query.q as string) || '';
      const type =
        (req.query.type as 'all' | 'sets' | 'users' | 'folders' | 'classes') ||
        'all';
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 10;
      const currentUserId = req.user?.userId;

      const results = await SearchService.search(q, type, limit, currentUserId);

      return ApiResponse.success(
        res,
        results,
        'Search results retrieved successfully'
      );
    } catch (err) {
      next(err);
    }
  }

  static async getExploreRecommendations(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const currentUserId = req.user?.userId;
      const recommendations =
        await SearchService.getExploreRecommendations(currentUserId);

      return ApiResponse.success(
        res,
        recommendations,
        'Explore recommendations retrieved successfully'
      );
    } catch (err) {
      next(err);
    }
  }
}
