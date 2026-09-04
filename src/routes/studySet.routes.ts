import { Router } from 'express';
import { StudySetController } from '../controllers/studySet.controller.js';
import { CardController } from '../controllers/card.controller.js';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createRateLimiter } from '../middlewares/rateLimiter.middleware.js';
import {
  createStudySetSchema,
  updateStudySetSchema,
  queryStudySetsSchema,
} from '../validations/studySet.schema.js';
import {
  createCardSchema,
  bulkCreateCardsSchema,
  importCardsFromTextSchema,
} from '../validations/card.schema.js';

const router = Router();

// Throttling: Protect against automated crawlers and scraper scripts (max 60 queries/min per user/IP)
const cardReadLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message:
    'Tốc độ truy xuất dữ liệu từ vựng quá nhanh (tối đa 60 lượt/phút). Vui lòng không sử dụng script tự động crawl!',
});

// Throttling: Protect against bot spamming and rapid creation floods (max 20 creations/min per user)
const cardWriteLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message:
    'Tốc độ tạo hoặc nhập từ vựng quá nhanh (tối đa 20 lượt/phút). Vui lòng thao tác chậm lại!',
});

// Public / optionally authenticated routes
router.get(
  '/',
  optionalAuth,
  validate(queryStudySetsSchema),
  StudySetController.getAll
);
router.get('/bookmarked', authenticate, StudySetController.getBookmarked);
router.get('/:id', optionalAuth, StudySetController.getById);
router.get('/:setId/cards', cardReadLimiter, CardController.getCardsBySetId);

// Authenticated routes
router.post(
  '/',
  authenticate,
  cardWriteLimiter,
  validate(createStudySetSchema),
  StudySetController.create
);
router.put(
  '/:id',
  authenticate,
  validate(updateStudySetSchema),
  StudySetController.update
);
router.delete('/:id', authenticate, StudySetController.delete);
router.post('/:id/clone', authenticate, StudySetController.clone);
router.post('/:id/star', authenticate, StudySetController.toggleStar);
router.post('/:id/bookmark', authenticate, StudySetController.toggleBookmark);

// Sub-resource: Cards in a study set (with write throttling)
router.post(
  '/:setId/cards',
  authenticate,
  cardWriteLimiter,
  validate(createCardSchema),
  CardController.createCard
);
router.post(
  '/:setId/cards/bulk',
  authenticate,
  cardWriteLimiter,
  validate(bulkCreateCardsSchema),
  CardController.bulkCreate
);
router.post(
  '/:setId/cards/import',
  authenticate,
  cardWriteLimiter,
  validate(importCardsFromTextSchema),
  CardController.importFromText
);

export default router;
