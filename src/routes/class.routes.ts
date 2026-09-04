import { Router } from 'express';
import { ClassController } from '../controllers/class.controller.js';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createClassSchema,
  updateClassSchema,
  joinClassSchema,
  addRemoveClassSetsSchema,
  queryClassesSchema,
} from '../validations/class.schema.js';

const router = Router();

router.get(
  '/',
  authenticate,
  validate(queryClassesSchema),
  ClassController.getAll
);
router.post(
  '/',
  authenticate,
  validate(createClassSchema),
  ClassController.create
);
router.post(
  '/join',
  authenticate,
  validate(joinClassSchema),
  ClassController.joinByCode
);
router.get('/:id', optionalAuth, ClassController.getById);
router.put(
  '/:id',
  authenticate,
  validate(updateClassSchema),
  ClassController.update
);
router.delete('/:id', authenticate, ClassController.delete);
router.post(
  '/:id/sets/add',
  authenticate,
  validate(addRemoveClassSetsSchema),
  ClassController.addSets
);
router.post(
  '/:id/sets/remove',
  authenticate,
  validate(addRemoveClassSetsSchema),
  ClassController.removeSets
);

export default router;
