import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateUserRoleSchema } from '../validations/user.schema.js';
import {
  updateBannerNotificationSchema,
  updateMaintenanceSchema,
} from '../validations/system.schema.js';
import { UserRole } from '../config/constants.js';

const router = Router();

// Strictly guard all admin endpoints
router.use(authenticate, authorize(UserRole.ADMIN));

// Platform Overview Analytics
router.get('/stats', AdminController.getOverviewStats);

// User Management
router.get('/users', AdminController.getAllUsers);
router.patch(
  '/users/:id/role',
  validate(updateUserRoleSchema),
  AdminController.updateUserRole
);
router.patch('/users/:id/ban', AdminController.toggleUserBan);
router.post('/users/:id/vip', AdminController.updateUserVip);

// Content Moderation (Study Sets)
router.get('/sets', AdminController.getAllStudySets);
router.patch('/sets/:id/featured', AdminController.toggleFeaturedSet);
router.patch('/sets/:id/tags', AdminController.updateStudySetTags);
router.delete('/sets/:id', AdminController.deleteStudySet);

// Study Groups
router.get('/groups', AdminController.getAllStudyGroups);

// Featured Topics (Homepage tags)
router.get('/featured-topics', AdminController.getFeaturedTopics);
router.put('/featured-topics', AdminController.updateFeaturedTopics);

// Top Banner Notification
router.get('/banner', AdminController.getBannerNotification);
router.put(
  '/banner',
  validate(updateBannerNotificationSchema),
  AdminController.updateBannerNotification
);

// Folders Moderation & Featured Management
router.get('/folders', AdminController.getFolders);
router.patch('/folders/:id/featured', AdminController.toggleFeaturedFolder);
router.delete('/folders/:id', AdminController.deleteFolder);

// System Maintenance Mode
router.get('/maintenance', AdminController.getMaintenance);
router.put(
  '/maintenance',
  validate(updateMaintenanceSchema),
  AdminController.updateMaintenance
);

export default router;
