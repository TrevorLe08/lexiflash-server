import { Router } from 'express';
import { AiController } from '../controllers/ai.controller.js';
import { authenticate, requireVip } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createRateLimiter } from '../middlewares/rateLimiter.middleware.js';
import {
  aiGenerateSetSchema,
  aiExplainTermSchema,
} from '../validations/ai.schema.js';

import { mockDb } from '../db/mockDb.js';

const router = Router();

router.use(authenticate);
router.use(requireVip);

// Throttling: VIP Diamond = 20 req/min, VIP Gold = 10 req/min, Admin = bypass
const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: (req) => {
    const user = req.user?.userId ? mockDb.users.get(req.user.userId) : null;
    return user?.vipPlan === '1_YEAR' ? 20 : 10;
  },
  message: (req) => {
    const user = req.user?.userId ? mockDb.users.get(req.user.userId) : null;
    const isDiamond = user?.vipPlan === '1_YEAR';
    const limit = isDiamond ? 20 : 10;
    const tierName = isDiamond ? 'VIP Diamond' : 'VIP Gold';
    return `Tốc độ gọi AI quá nhanh (tối đa ${limit} lần/phút cho gói ${tierName}). Vui lòng đợi một chút trước khi thực hiện tiếp!`;
  },
});
router.use(aiRateLimiter);

router.post(
  '/generate-set',
  validate(aiGenerateSetSchema),
  AiController.generateSet
);
router.post('/explain', validate(aiExplainTermSchema), AiController.explain);

export default router;
