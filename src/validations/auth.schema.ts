import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    username: z
      .string()
      .min(2, 'Username must be at least 2 characters')
      .max(30, 'Username must not exceed 30 characters')
      .regex(
        /^[a-zA-Z0-9_]+$/,
        'Username can only contain letters, numbers, and underscores'
      ),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(
        /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/,
        'Password must contain at least one special character (!@#$%^&*...)'
      ),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    avatarUrl: z.string().url().optional(),
    bio: z.string().max(300).optional(),
  }),
});

export const loginSchema = z.object({
  body: z
    .object({
      loginIdentifier: z.string().optional(),
      username: z.string().optional(),
      email: z.string().optional(),
      password: z.string().min(1, 'Password is required'),
    })
    .refine(
      (data) =>
        Boolean(
          (data.loginIdentifier && data.loginIdentifier.trim()) ||
          (data.username && data.username.trim()) ||
          (data.email && data.email.trim())
        ),
      {
        message: 'Email, username, or loginIdentifier is required',
        path: ['loginIdentifier'],
      }
    ),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/,
    'Password must contain at least one special character (!@#$%^&*...)'
  );

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    email: z.string().email('Invalid email format'),
    newPassword: passwordRule,
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordRule,
  }),
});
