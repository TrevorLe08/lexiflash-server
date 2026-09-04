import { Request, Response, NextFunction } from 'express';
import { ClassService } from '../services/class.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { getParam } from '../utils/params.js';

export class ClassController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const q = (req.query || {}) as Record<string, unknown>;
      const result = await ClassService.getAll(
        {
          page: q['page'] ? Number(q['page']) : 1,
          limit: q['limit'] ? Number(q['limit']) : 8,
          search:
            typeof q['search'] === 'string' && q['search'].trim() !== ''
              ? q['search'].trim()
              : undefined,
        },
        userId
      );
      return ApiResponse.success(
        res,
        result.items,
        'Classes retrieved',
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
      const userId = req.user?.userId;
      const cl = await ClassService.getById(id, userId);
      return ApiResponse.success(res, cl, 'Class retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const newClass = await ClassService.create(req.body, userId);
      return ApiResponse.created(res, newClass, 'Class created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async joinByCode(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { joinCode } = req.body;
      const joinedClass = await ClassService.joinByCode(joinCode, userId);
      return ApiResponse.success(res, joinedClass, 'Joined class successfully');
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params['id']);
      const userId = req.user!.userId;
      const updated = await ClassService.update(id, req.body, userId);
      return ApiResponse.success(res, updated, 'Class updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params['id']);
      const userId = req.user!.userId;
      await ClassService.delete(id, userId);
      return ApiResponse.success(res, null, 'Class deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async addSets(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params['id']);
      const userId = req.user!.userId;
      const { studySetIds } = req.body;
      const updated = await ClassService.addSets(id, studySetIds, userId);
      return ApiResponse.success(res, updated, 'Study sets added to class');
    } catch (error) {
      next(error);
    }
  }

  static async removeSets(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params['id']);
      const userId = req.user!.userId;
      const { studySetIds } = req.body;
      const updated = await ClassService.removeSets(id, studySetIds, userId);
      return ApiResponse.success(res, updated, 'Study sets removed from class');
    } catch (error) {
      next(error);
    }
  }
}
