import { z } from 'zod';

export const updateBannerNotificationSchema = z.object({
  body: z.object({
    isEnabled: z.boolean(),
    message: z.string().max(500, 'Nội dung thông báo không vượt quá 500 ký tự'),
    color: z.enum([
      'red',
      'amber',
      'emerald',
      'blue',
      'purple',
      'cyan',
      'dark',
    ]),
    linkUrl: z.string().max(300).optional().or(z.literal('')),
    linkText: z.string().max(50).optional().or(z.literal('')),
  }),
});

export const updateMaintenanceSchema = z.object({
  body: z.object({
    isActive: z.boolean(),
    title: z.string().max(200, 'Tiêu đề bảo trì không vượt quá 200 ký tự'),
    message: z.string().max(1000, 'Nội dung bảo trì không vượt quá 1000 ký tự'),
    estimatedEndTime: z.string().max(100).optional().or(z.literal('')),
  }),
});
