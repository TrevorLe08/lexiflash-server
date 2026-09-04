import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError.js';
import { UserRole } from '../config/constants.js';

interface RateLimitOptions {
  windowMs: number; // e.g. 60000 (1 minute)
  max: number | ((req: Request) => number); // Max requests allowed per window (dynamic per tier)
  message?: string | ((req: Request) => string);
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}

interface RateLimitRecord {
  timestamps: number[];
}

/**
 * Creates an in-memory sliding-window rate limiter middleware.
 * Highly performant, automatically cleans up stale buckets to avoid memory leaks.
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = 'Bạn đang thao tác quá nhanh. Vui lòng thử lại sau ít phút!',
    keyGenerator = (req: Request) =>
      req.user?.userId || req.ip || req.socket?.remoteAddress || 'anonymous',
    skip = (req: Request) => req.user?.role === UserRole.ADMIN,
  } = options;

  const storage = new Map<string, RateLimitRecord>();

  // Periodically clean up stale buckets every few minutes
  const cleanupInterval = globalThis.setInterval(
    () => {
      const now = Date.now();
      for (const [key, record] of storage.entries()) {
        const valid = record.timestamps.filter((ts) => now - ts < windowMs);
        if (valid.length === 0) {
          storage.delete(key);
        } else {
          record.timestamps = valid;
        }
      }
    },
    Math.max(30000, windowMs)
  );

  // Ensure timer does not prevent process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    // Admins or explicitly skipped requests bypass rate limiting
    if (skip(req)) {
      return next();
    }

    const currentMax = typeof max === 'function' ? max(req) : max;
    const currentMessage =
      typeof message === 'function' ? message(req) : message;

    const key = keyGenerator(req);
    const now = Date.now();
    const record = storage.get(key) || { timestamps: [] };

    // Filter out timestamps outside the sliding window
    const recentTimestamps = record.timestamps.filter(
      (ts) => now - ts < windowMs
    );

    const remaining = Math.max(0, currentMax - recentTimestamps.length);
    const oldestTimestamp = recentTimestamps[0] || now;
    const resetTimeSeconds = Math.ceil(
      (oldestTimestamp + windowMs - now) / 1000
    );

    // Set standard rate limit headers
    res.setHeader('X-RateLimit-Limit', currentMax);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining - 1));
    res.setHeader('X-RateLimit-Reset', resetTimeSeconds);

    if (recentTimestamps.length >= currentMax) {
      res.setHeader('Retry-After', resetTimeSeconds);
      return next(ApiError.tooManyRequests(currentMessage));
    }

    recentTimestamps.push(now);
    storage.set(key, { timestamps: recentTimestamps });

    return next();
  };
}
