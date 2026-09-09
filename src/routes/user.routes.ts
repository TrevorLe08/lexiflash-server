import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  updateProfileSchema,
  changePasswordSchema,
  changeEmailSchema,
} from '../validations/user.schema.js';

const router = Router();

// Authenticated user private actions
router.get('/me', authenticate, UserController.getProfile);
router.get(
  '/avatar-signature',
  authenticate,
  UserController.getAvatarUploadSignature
);
router.put(
  '/me',
  authenticate,
  validate(updateProfileSchema),
  UserController.updateProfile
);
router.put(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  UserController.changePassword
);
router.put(
  '/change-email',
  authenticate,
  validate(changeEmailSchema),
  UserController.changeEmail
);
router.get('/stats', authenticate, UserController.getStats);

// Public / open view for any user profile by ID or username
router.get('/:id', optionalAuth, UserController.getProfile);

export default router;
