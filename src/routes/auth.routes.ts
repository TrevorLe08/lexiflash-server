import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { createRateLimiter } from '../middlewares/rateLimiter.middleware.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validations/auth.schema.js';

const router = Router();

// Anti brute-force for login: 10 attempts per 15 minutes
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút!',
});

// Anti spam for registration: 15 attempts per 15 minutes per IP
const registerLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Bạn đã thử đăng ký quá 15 lần. Vui lòng thử lại sau 15 phút!',
});

// Anti email spam for password reset: 5 requests per 15 minutes
const forgotPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message:
    'Bạn đã yêu cầu gửi email quá nhiều lần. Vui lòng chờ 15 phút trước khi thử lại!',
});

// Anti brute-force for reset-password attempts: 10 attempts per 15 minutes
const resetPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message:
    'Bạn đã thử đặt lại mật khẩu quá nhiều lần. Vui lòng chờ 15 phút trước khi thử lại!',
});

router.post(
  '/register',
  registerLimiter,
  validate(registerSchema),
  AuthController.register
);
router.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  AuthController.login
);
router.post(
  '/admin-login',
  loginLimiter,
  validate(loginSchema),
  AuthController.adminLogin
);
router.post(
  '/refresh-token',
  validate(refreshTokenSchema),
  AuthController.refreshToken
);
router.post('/logout', AuthController.logout);
router.get('/me', authenticate, AuthController.me);

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  AuthController.forgotPassword
);
router.post(
  '/reset-password',
  resetPasswordLimiter,
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
