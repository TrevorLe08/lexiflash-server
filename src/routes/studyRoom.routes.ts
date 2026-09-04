import { Router } from 'express';
import { StudyRoomController } from '../controllers/studyRoom.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  recordFocusSessionSchema,
  createCustomQuestSchema,
  toggleQuestSchema,
} from '../validations/studyRoom.schema.js';

const router = Router();

// All study-room endpoints require authentication
router.use(authenticate);

router.get('/daily-dashboard', StudyRoomController.getDailyDashboard);
router.post(
  '/sessions',
  validate(recordFocusSessionSchema),
  StudyRoomController.recordSession
);
router.post(
  '/quests/custom',
  validate(createCustomQuestSchema),
  StudyRoomController.createCustomQuest
);
router.patch(
  '/quests/:id/toggle',
  validate(toggleQuestSchema),
  StudyRoomController.toggleQuest
);
router.delete('/quests/:id', StudyRoomController.deleteCustomQuest);

export const studyRoomRoutes = router;
