import { Request, Response, NextFunction } from 'express';
import { FolderService } from '../services/folder.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { getParam } from '../utils/params.js';

export class FolderController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUserId = req.user?.userId;
      const q = (req.query || {}) as Record<string, unknown>;
      const result = await FolderService.getAll(
        {
          page: q['page'] ? Number(q['page']) : 1,
          limit: q['limit'] ? Number(q['limit']) : 8,
          search:
            typeof q['search'] === 'string' && q['search'].trim() !== ''
              ? q['search'].trim()
              : undefined,
        },
        currentUserId
      );
      return ApiResponse.success(
        res,
        result.items,
        'Folders retrieved',
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
      const currentUserId = req.user?.userId;
      const folder = await FolderService.getById(id, currentUserId);
      return ApiResponse.success(res, folder, 'Folder retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const folder = await FolderService.create(req.body, userId);
      return ApiResponse.created(res, folder, 'Folder created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params['id']);
      const userId = req.user!.userId;
      const updated = await FolderService.update(id, req.body, userId);
      return ApiResponse.success(res, updated, 'Folder updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params['id']);
      const userId = req.user!.userId;
      await FolderService.delete(id, userId);
      return ApiResponse.success(res, null, 'Folder deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async addSets(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params['id']);
      const userId = req.user!.userId;
      const { studySetIds } = req.body;
      const updated = await FolderService.addSets(id, studySetIds, userId);
      return ApiResponse.success(res, updated, 'Study sets added to folder');
    } catch (error) {
      next(error);
    }
  }

  static async removeSets(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params['id']);
      const userId = req.user!.userId;
      const { studySetIds } = req.body;
      const updated = await FolderService.removeSets(id, studySetIds, userId);
      return ApiResponse.success(
        res,
        updated,
        'Study sets removed from folder'
      );
    } catch (error) {
      next(error);
    }
  }
}
