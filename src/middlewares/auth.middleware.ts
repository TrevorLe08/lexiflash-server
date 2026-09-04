import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token.js';
import { ApiError } from '../utils/apiError.js';
import { UserRole } from '../config/constants.js';
import { mockDb } from '../db/mockDb.js';

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(ApiError.unauthorized('Authentication token is required'));
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next(ApiError.unauthorized('Authentication token is missing'));
    }

    const payload = verifyAccessToken(token);

    // Check if user still exists in database
    const user = mockDb.users.get(payload.userId);
    if (!user) {
      return next(
        ApiError.unauthorized('User associated with token no longer exists')
      );
    }

    if (user.isBanned) {
      return next(
        ApiError.forbidden(
          'Your account has been suspended by an administrator.'
        )
      );
    }

    req.user = payload;
    next();
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error) {
      if (error.name === 'TokenExpiredError') {
        return next(ApiError.unauthorized('Authentication token has expired'));
      }
      if (error.name === 'JsonWebTokenError') {
        return next(ApiError.unauthorized('Invalid authentication token'));
      }
    }
    next(ApiError.unauthorized('Authentication failed'));
  }
};

export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const payload = verifyAccessToken(token);
        const user = mockDb.users.get(payload.userId);
        if (user) {
          req.user = payload;
        }
      }
    }
    next();
  } catch {
    // Ignore error for optional authentication and continue anonymously
    next();
  }
};

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden('You do not have permission to access this resource')
      );
    }

    next();
  };
};

export const requireVip = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required'));
  }

  const user = mockDb.users.get(req.user.userId);
  if (!user) {
    return next(ApiError.unauthorized('User not found'));
  }

  // Admins always have VIP privileges
  if (user.role === UserRole.ADMIN) {
    return next();
  }

  // Check VIP expiration
  const isVipActive =
    user.vipExpiresAt && new Date(user.vipExpiresAt).getTime() > Date.now();

  if (!isVipActive && !user.isVip) {
    return next(
      ApiError.forbidden(
        'Tính năng AI chỉ dành riêng cho thành viên VIP hoặc Admin. Vui lòng nâng cấp VIP!'
      )
    );
  }

  next();
};
