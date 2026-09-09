import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { getParam } from '../utils/params.js';
import { UserRole, PrivacyLevel } from '../config/constants.js';

export class AdminController {
  static async getOverviewStats(
    _req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const stats = await AdminService.getOverviewStats();
      return ApiResponse.success(
        res,
        stats,
        'Admin overview statistics retrieved'
      );
    } catch (error) {
      next(error);
    }
  }

  static async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query['page'] as string, 10) || 1;
      const limit = parseInt(req.query['limit'] as string, 10) || 10;
      const search = (req.query['search'] as string) || '';
      const role = (req.query['role'] as UserRole) || undefined;
      const isBanned =
        req.query['isBanned'] === 'true'
          ? true
          : req.query['isBanned'] === 'false'
            ? false
            : undefined;
      const vipFilter =
        (req.query['vipTier'] as string) ||
        (req.query['vipPlan'] as string) ||
        undefined;

      const result = await AdminService.getAllUsers({
        page,
        limit,
        search,
        role,
        isBanned,
        vipFilter,
      });

      return ApiResponse.paginated(
        res,
        result.items,
        result.pagination,
        `Retrieved ${result.items.length} users`
      );
    } catch (error) {
      next(error);
    }
  }

  static async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = getParam(req.params['id']);
      const { role } = req.body;
      const adminActorId = req.user!.userId;

      const updatedUser = await AdminService.updateUserRole(
        userId,
        role,
        adminActorId
      );

      return ApiResponse.success(
        res,
        {
          id: updatedUser.id,
          name: updatedUser.name,
          username: updatedUser.username,
          role: updatedUser.role,
        },
        `User role updated to ${role}`
      );
    } catch (error) {
      next(error);
    }
  }

  static async toggleUserBan(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = getParam(req.params['id']);
      const { isBanned } = req.body;
      const adminActorId = req.user!.userId;

      const updatedUser = await AdminService.toggleUserBan(
        userId,
        Boolean(isBanned),
        adminActorId
      );

      return ApiResponse.success(
        res,
        {
          id: updatedUser.id,
          name: updatedUser.name,
          username: updatedUser.username,
          isBanned: updatedUser.isBanned,
        },
        `User account ${isBanned ? 'suspended' : 'reactivated'}`
      );
    } catch (error) {
      next(error);
    }
  }

  static async updateUserVip(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = getParam(req.params['id']);
      const { plan } = req.body; // '1_MONTH' | '1_YEAR' | 'CANCEL'

      const updatedUser = await AdminService.updateUserVip(userId, plan);

      return ApiResponse.success(
        res,
        {
          id: updatedUser.id,
          name: updatedUser.name,
          username: updatedUser.username,
          isVip: updatedUser.isVip,
          vipPlan: updatedUser.vipPlan || null,
          vipExpiresAt: updatedUser.vipExpiresAt,
        },
        `VIP subscription updated: ${plan}`
      );
    } catch (error) {
      next(error);
    }
  }

  static async getAllStudySets(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const page = parseInt(req.query['page'] as string, 10) || 1;
      const limit = parseInt(req.query['limit'] as string, 10) || 10;
      const search = (req.query['search'] as string) || '';
      const privacy = (req.query['privacy'] as PrivacyLevel) || undefined;
      const isFeatured =
        req.query['isFeatured'] === 'true'
          ? true
          : req.query['isFeatured'] === 'false'
            ? false
            : undefined;

      const result = await AdminService.getAllStudySets({
        page,
        limit,
        search,
        privacy,
        isFeatured,
      });

      return ApiResponse.paginated(
        res,
        result.items,
        result.pagination,
        `Retrieved ${result.items.length} study sets`
      );
    } catch (error) {
      next(error);
    }
  }

  static async toggleFeaturedSet(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const setId = getParam(req.params['id']);
      const { isFeatured } = req.body;

      const updatedSet = await AdminService.toggleFeaturedSet(
        setId,
        Boolean(isFeatured)
      );

      return ApiResponse.success(
        res,
        updatedSet,
        `Study set ${isFeatured ? 'featured' : 'unfeatured'} successfully`
      );
    } catch (error) {
      next(error);
    }
  }

  static async updateStudySetTags(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const setId = getParam(req.params['id']);
      const { tags } = req.body;

      const updatedSet = await AdminService.updateStudySetTags(setId, tags);

      return ApiResponse.success(
        res,
        updatedSet,
        'Study set tags updated successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  static async deleteStudySet(req: Request, res: Response, next: NextFunction) {
    try {
      const setId = getParam(req.params['id']);
      await AdminService.deleteStudySetByAdmin(setId);
      return ApiResponse.noContent(res);
    } catch (error) {
      next(error);
    }
  }

  static async getAllStudyGroups(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const page = parseInt(req.query['page'] as string, 10) || 1;
      const limit = parseInt(req.query['limit'] as string, 10) || 10;
      const search = (req.query['search'] as string) || '';

      const result = await AdminService.getAllStudyGroups({
        page,
        limit,
        search,
      });

      return ApiResponse.paginated(
        res,
        result.items,
        result.pagination,
        `Retrieved ${result.items.length} study groups`
      );
    } catch (error) {
      next(error);
    }
  }

  static async getFeaturedTopics(
    _req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const topics = await AdminService.getFeaturedTopics();
      return ApiResponse.success(
        res,
        { topics },
        'Featured topics retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  static async updateFeaturedTopics(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { topics } = req.body;
      const updated = await AdminService.updateFeaturedTopics(topics);
      return ApiResponse.success(
        res,
        { topics: updated },
        'Featured topics updated successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  static async getBannerNotification(
    _req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const banner = await AdminService.getBannerNotification();
      return ApiResponse.success(
        res,
        { banner },
        'Banner notification retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  static async updateBannerNotification(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const banner = await AdminService.updateBannerNotification(req.body);
      return ApiResponse.success(
        res,
        { banner },
        'Banner notification updated successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  static async getFolders(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query['page'] ? Number(req.query['page']) : 1;
      const limit = req.query['limit'] ? Number(req.query['limit']) : 10;
      const search = (req.query['search'] as string) || '';
      const isFeatured =
        req.query['isFeatured'] === 'true'
          ? true
          : req.query['isFeatured'] === 'false'
            ? false
            : undefined;

      const result = await AdminService.getAllFolders({
        page,
        limit,
        search,
        isFeatured,
      });

      return ApiResponse.success(
        res,
        result,
        'Admin folders retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  static async toggleFeaturedFolder(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const folderId = getParam(req.params['id']);
      const { isFeatured } = req.body;

      const updated = await AdminService.toggleFeaturedFolder(
        folderId,
        Boolean(isFeatured)
      );

      return ApiResponse.success(
        res,
        updated,
        `Folder ${isFeatured ? 'featured' : 'unfeatured'} successfully`
      );
    } catch (error) {
      next(error);
    }
  }

  static async deleteFolder(req: Request, res: Response, next: NextFunction) {
    try {
      const folderId = getParam(req.params['id']);
      await AdminService.deleteFolder(folderId);
      return ApiResponse.success(res, null, 'Folder deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getMaintenance(
    _req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const maintenance = await AdminService.getMaintenanceConfig();
      return ApiResponse.success(
        res,
        { maintenance },
        'Maintenance configuration retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  static async updateMaintenance(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { isActive, title, message, estimatedEndTime } = req.body;
      const updated = await AdminService.updateMaintenanceConfig({
        isActive,
        title,
        message,
        estimatedEndTime,
      });

      return ApiResponse.success(
        res,
        { maintenance: updated },
        'Maintenance configuration updated successfully'
      );
    } catch (error) {
      next(error);
    }
  }
}
