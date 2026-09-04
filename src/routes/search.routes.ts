import { Router } from 'express';
import { SearchController } from '../controllers/search.controller.js';
import { optionalAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', optionalAuth, SearchController.search);
router.get(
  '/explore',
  optionalAuth,
  SearchController.getExploreRecommendations
);

export default router;
