import { Router } from 'express';
import { TestController } from '../controllers/test.controller.js';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  generateTestSchema,
  submitTestSchema,
} from '../validations/study.schema.js';

const router = Router();

router.post(
  '/sets/:setId/generate',
  optionalAuth,
  validate(generateTestSchema),
  TestController.generate
);

router.use(authenticate);

router.post(
  '/:testId/submit',
  validate(submitTestSchema),
  TestController.submit
);
router.get('/history', TestController.getHistories);

export default router;
