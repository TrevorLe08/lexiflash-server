import { Router, Request, Response } from 'express';
import { mockDb } from '../db/mockDb.js';
import { ApiResponse } from '../utils/apiResponse.js';

const router = Router();

/**
 * Public route to fetch active top banner notification
 * Accessible by all users and guests without authentication
 */
router.get('/banner', (_req: Request, res: Response) => {
  const banner = mockDb.bannerNotification;
  return ApiResponse.success(
    res,
    { banner: banner.isEnabled ? banner : null },
    'System banner retrieved successfully'
  );
});

/**
 * Public route to fetch system maintenance status
 * Accessible by all users and guests without authentication
 */
router.get('/maintenance', (_req: Request, res: Response) => {
  const maintenance = mockDb.maintenanceConfig;
  return ApiResponse.success(
    res,
    { maintenance },
    'System maintenance status retrieved successfully'
  );
});

export default router;
