import { Router } from 'express';
import { StudyController } from '../controllers/study.controller.js';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  learnAnswerSchema,
  recordStudySessionSchema,
  mistakeAnswerSchema,
} from '../validations/study.schema.js';

const router = Router();

// Flashcards mode (can be played anonymously or authenticated)
router.get(
  '/sets/:setId/flashcards',
  optionalAuth,
  StudyController.getFlashcards
);

// Authenticated study & SRS routes
router.use(authenticate);

router.post(
  '/learn/:setId/answer',
  validate(learnAnswerSchema),
  StudyController.submitLearnAnswer
);
router.get('/reviews-due', StudyController.getDueReviews);
router.get('/mistakes', StudyController.getMistakeBank);
router.post(
  '/mistakes/answer',
  validate(mistakeAnswerSchema),
  StudyController.submitMistakeAnswer
);
router.get('/progress/:setId', StudyController.getSetProgress);
router.post(
  '/session',
  validate(recordStudySessionSchema),
  StudyController.recordSession
);
router.post('/streak/record', StudyController.recordStreak);
router.get('/streak', StudyController.getStreak);

export default router;
