import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import studySetRoutes from './studySet.routes.js';
import cardRoutes from './card.routes.js';
import folderRoutes from './folder.routes.js';
import classRoutes from './class.routes.js';
import studyRoutes from './study.routes.js';
import testRoutes from './test.routes.js';
import matchRoutes from './match.routes.js';
import aiRoutes from './ai.routes.js';
import searchRoutes from './search.routes.js';
import adminRoutes from './admin.routes.js';
import systemRoutes from './system.routes.js';
import { studyRoomRoutes } from './studyRoom.routes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/study-sets', studySetRoutes);
apiRouter.use('/cards', cardRoutes);
apiRouter.use('/folders', folderRoutes);
apiRouter.use('/classes', classRoutes);
apiRouter.use('/study', studyRoutes);
apiRouter.use('/study-room', studyRoomRoutes);
apiRouter.use('/test', testRoutes);
apiRouter.use('/match', matchRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/search', searchRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/system', systemRoutes);

export default apiRouter;
