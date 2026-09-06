import { z } from 'zod';
import { UserRole } from '../config/constants.js';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    avatarUrl: z.string().url().optional().or(z.literal('')),
    bio: z.string().max(300).optional(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long')
      .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'New password must contain at least one number')
      .regex(
        /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/,
        'New password must contain at least one special character (!@#$%^&*...)'
      ),
  }),
});

export const changeEmailSchema = z.object({
  body: z.object({
    newEmail: z.string().email('Email không đúng định dạng'),
    password: z.string().min(1, 'Vui lòng nhập mật khẩu xác nhận'),
  }),
});

export const updateUserRoleSchema = z.object({
  body: z.object({
    role: z.nativeEnum(UserRole),
  }),
});
