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

// Anti spam for registration: 5 accounts per hour per IP
const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message:
    'Quá nhiều lượt đăng ký từ địa chỉ mạng của bạn. Vui lòng thử lại sau 1 giờ!',
});

// Anti email spam for password reset: 5 requests per 15 minutes
const forgotPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message:
    'Bạn đã yêu cầu gửi email quá nhiều lần. Vui lòng chờ 15 phút trước khi thử lại!',
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
