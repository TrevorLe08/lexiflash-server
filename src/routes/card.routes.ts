import { Router } from 'express';
import { CardController } from '../controllers/card.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateCardSchema } from '../validations/card.schema.js';

const router = Router();

router.use(authenticate);

router.put('/:id', validate(updateCardSchema), CardController.updateCard);
router.delete('/:id', CardController.deleteCard);
router.post('/:id/star', CardController.toggleStar);

export default router;
