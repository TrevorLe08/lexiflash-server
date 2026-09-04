import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { getParam } from '../utils/params.js';

export class UserController {
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const rawId = req.params['id']
        ? getParam(req.params['id'])
        : req.user?.userId;
      if (!rawId) {
        throw ApiError.badRequest('User ID is required');
      }
      const viewerId = req.user?.userId;
      const profile = await UserService.getProfile(rawId, viewerId);
      return ApiResponse.success(res, profile, 'User profile retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const updated = await UserService.updateProfile(userId, req.body);
      return ApiResponse.success(res, updated, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      await UserService.changePassword(userId, req.body);
      return ApiResponse.success(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async changeEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const updated = await UserService.changeEmail(userId, req.body);
      return ApiResponse.success(res, updated, 'Email changed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const stats = await UserService.getStats(userId);
      return ApiResponse.success(res, stats, 'User study statistics retrieved');
    } catch (error) {
      next(error);
    }
  }
}
