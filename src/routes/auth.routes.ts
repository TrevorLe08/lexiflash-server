import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validations/auth.schema.js';

const router = Router();

router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.post(
  '/refresh-token',
  validate(refreshTokenSchema),
  AuthController.refreshToken
);
router.post('/logout', AuthController.logout);
router.get('/me', authenticate, AuthController.me);

router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  AuthController.forgotPassword
);
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  AuthController.resetPassword
);
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  AuthController.changePassword
);

export default router;
