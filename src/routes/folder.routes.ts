import { Router } from 'express';
import { FolderController } from '../controllers/folder.controller.js';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createFolderSchema,
  updateFolderSchema,
  addRemoveFolderSetsSchema,
  queryFoldersSchema,
} from '../validations/folder.schema.js';

const router = Router();

router.get(
  '/',
  optionalAuth,
  validate(queryFoldersSchema),
  FolderController.getAll
);
router.get('/:id', optionalAuth, FolderController.getById);

router.use(authenticate);

router.post('/', validate(createFolderSchema), FolderController.create);
router.put('/:id', validate(updateFolderSchema), FolderController.update);
router.delete('/:id', FolderController.delete);
router.post(
  '/:id/sets/add',
  validate(addRemoveFolderSetsSchema),
  FolderController.addSets
);
router.post(
  '/:id/sets/remove',
  validate(addRemoveFolderSetsSchema),
  FolderController.removeSets
);

export default router;
