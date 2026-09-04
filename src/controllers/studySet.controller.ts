import { Request, Response, NextFunction } from 'express';
import { StudySetService } from '../services/studySet.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { getParam } from '../utils/params.js';
import { StudyLevel } from '../types/studySet.types.js';

export class StudySetController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUserId = req.user?.userId;
      const q = (req.query || {}) as Record<string, unknown>;

      const result = await StudySetService.getAll(
        {
          page: q['page'] ? Number(q['page']) : 1,
          limit: q['limit'] ? Number(q['limit']) : 10,
          search:
            typeof q['search'] === 'string' && q['search'].trim() !== ''
              ? q['search'].trim()
              : undefined,
          tag:
            typeof q['tag'] === 'string' && q['tag'].trim() !== ''
              ? q['tag'].trim()
              : undefined,
          level:
            typeof q['level'] === 'string' &&
            q['level'] !== '' &&
            q['level'] !== 'ALL'
              ? (q['level'] as StudyLevel)
              : undefined,
          creatorId:
            typeof q['creatorId'] === 'string' && q['creatorId'].trim() !== ''
              ? q['creatorId'].trim()
              : undefined,
          onlyMine: q['onlyMine'] === true || q['onlyMine'] === 'true',
          onlyStarred: q['onlyStarred'] === true || q['onlyStarred'] === 'true',
          onlyBookmarked:
            q['onlyBookmarked'] === true || q['onlyBookmarked'] === 'true',
          sortBy:
            typeof q['sortBy'] === 'string'
              ? (q['sortBy'] as 'createdAt' | 'viewCount' | 'title')
              : 'createdAt',
          sortOrder:
            typeof q['sortOrder'] === 'string'
              ? (q['sortOrder'] as 'asc' | 'desc')
              : 'desc',
        },
        currentUserId
      );

      return ApiResponse.success(
        res,
        result.items,
        'Study sets retrieved',
        200,
        result.pagination
      );
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params['id']);
      const password = req.query['password'] as string | undefined;
      const currentUserId = req.user?.userId;
      const viewerKey = (req.user?.userId ||
        req.ip ||
        req.headers['x-forwarded-for'] ||
        'guest') as string;
      const set = await StudySetService.getById(
        id,
        currentUserId,
        password,
        viewerKey
      );
      return ApiResponse.success(res, set, 'Study set retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const newSet = await StudySetService.create(req.body, userId);
      return ApiResponse.created(res, newSet, 'Study set created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params['id']);
      const userId = req.user!.userId;
      const updated = await StudySetService.update(id, req.body, userId);
      return ApiResponse.success(
        res,
        updated,
        'Study set updated successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params['id']);
      const userId = req.user!.userId;
      await StudySetService.delete(id, userId);
      return ApiResponse.success(res, null, 'Study set deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async clone(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params['id']);
      const userId = req.user!.userId;
      const cloned = await StudySetService.clone(id, userId);
      return ApiResponse.created(res, cloned, 'Study set cloned successfully');
    } catch (error) {
      next(error);
    }
  }

  static async toggleStar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params['id']);
      const userId = req.user!.userId;
      const result = await StudySetService.toggleStar(id, userId);
      return ApiResponse.success(
        res,
        result,
        result.isStarred ? 'Study set starred' : 'Study set unstarred'
      );
    } catch (error) {
      next(error);
    }
  }

  static async toggleBookmark(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params['id']);
      const userId = req.user!.userId;
      const result = await StudySetService.toggleBookmark(id, userId);
      return ApiResponse.success(
        res,
        result,
        result.isBookmarked ? 'Added to bookmarks' : 'Removed from bookmarks'
      );
    } catch (error) {
      next(error);
    }
  }

  static async getBookmarked(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const sets = await StudySetService.getBookmarkedSets(userId);
      return ApiResponse.success(res, sets, 'Bookmarked study sets retrieved');
    } catch (error) {
      next(error);
    }
  }
}
