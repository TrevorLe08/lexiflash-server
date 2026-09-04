import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.register(req.body);
      return ApiResponse.created(res, result, 'User registered successfully');
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.login(req.body);
      return ApiResponse.success(res, result, 'Logged in successfully');
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refreshToken(refreshToken);
      return ApiResponse.success(res, result, 'Tokens refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      await AuthService.logout(refreshToken);
      return ApiResponse.success(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required');
      }
      const user = await AuthService.getMe(req.user.userId);
      return ApiResponse.success(res, user, 'Current session info');
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      await AuthService.forgotPassword(email);
      return ApiResponse.success(
        res,
        null,
        'Nếu tài khoản tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến email của bạn.'
      );
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, email, newPassword } = req.body;
      await AuthService.resetPassword({ token, email, newPassword });
      return ApiResponse.success(
        res,
        null,
        'Đặt lại mật khẩu thành công! Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.'
      );
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required');
      }
      const { oldPassword, newPassword } = req.body;
      await AuthService.changePassword(req.user.userId, {
        oldPassword,
        newPassword,
      });
      return ApiResponse.success(
        res,
        null,
        'Đổi mật khẩu thành công!'
      );
    } catch (error) {
      next(error);
    }
  }
}
