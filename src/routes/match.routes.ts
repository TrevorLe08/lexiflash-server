import { Router } from 'express';
import { MatchController } from '../controllers/match.controller.js';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { submitMatchScoreSchema } from '../validations/study.schema.js';

const router = Router();

router.get('/sets/:setId/tiles', optionalAuth, MatchController.getTiles);
router.get(
  '/sets/:setId/leaderboard',
  optionalAuth,
  MatchController.getLeaderboard
);

router.post(
  '/sets/:setId/submit',
  authenticate,
  validate(submitMatchScoreSchema),
  MatchController.submitScore
);

export default router;
