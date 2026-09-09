import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { requestLogger } from './middlewares/logger.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { ApiError } from './utils/apiError.js';
import { ApiResponse } from './utils/apiResponse.js';
import { mockDb } from './db/mockDb.js';
import { isMongoConnected } from './db/mongo.js';
import { ENV } from './config/env.js';
import {
  UserModel,
  StudySetModel,
  CardModel,
  FolderModel,
  ClassModel,
  UserCardProgressModel,
} from './models/index.js';
import { seedDefaultDataIfEmpty } from './db/mongoSeeder.js';
import apiRouter from './routes/index.js';

export const createApp = (): Express => {
  const app = express();

  // Trust proxy for Render/Vercel reverse proxies (vital for rate-limiting by client IP)
  app.set('trust proxy', 1);

  // OWASP Recommended Security Headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (ENV.NODE_ENV === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      );
    }
    next();
  });

  // Strict CORS policy
  const allowedOrigins = [
    ENV.CLIENT_URL,
    'http://localhost:3000',
    'http://localhost:5173',
  ].filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);

        const isAllowed =
          ENV.NODE_ENV === 'development' ||
          allowedOrigins.includes(origin) ||
          origin.endsWith('.vercel.app');

        if (isAllowed) {
          return callback(null, true);
        }
        return callback(
          new ApiError(403, `CORS blocked: Origin ${origin} is not allowed`)
        );
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(requestLogger);

  // Root & Health check
  app.get('/', (_req: Request, res: Response) => {
    return ApiResponse.success(
      res,
      {
        name: 'LexiFlash English Learning API',
        version: '1.0.0',
        status: 'active',
        endpoints: {
          health: '/health',
          apiV1: '/api/v1',
          auth: '/api/v1/auth',
          users: '/api/v1/users',
          studySets: '/api/v1/study-sets',
          cards: '/api/v1/cards',
          folders: '/api/v1/folders',
          classes: '/api/v1/classes',
          study: '/api/v1/study',
          test: '/api/v1/test',
          match: '/api/v1/match',
          ai: '/api/v1/ai',
        },
      },
      'LexiFlash English Backend API Server is running'
    );
  });

  app.get('/health', (_req: Request, res: Response) => {
    const mongoReady = isMongoConnected();
    return ApiResponse.success(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: mongoReady ? 'mongodb_atlas_connected' : 'memory_fallback',
      dbName: ENV.MONGODB_DB_NAME,
      counts: {
        users: mockDb.users.size,
        studySets: mockDb.studySets.size,
        cards: mockDb.cards.size,
        folders: mockDb.folders.size,
        classes: mockDb.classes.size,
      },
    });
  });

  // Development ONLY helper: Reset mock database and MongoDB Atlas to default seeds (DISABLED in production)
  if (ENV.NODE_ENV === 'development') {
    app.post('/api/v1/reset-mock-db', async (_req: Request, res: Response) => {
      mockDb.seedDefaults();
      if (isMongoConnected()) {
        try {
          await Promise.all([
            UserModel.deleteMany({}),
            StudySetModel.deleteMany({}),
            CardModel.deleteMany({}),
            FolderModel.deleteMany({}),
            ClassModel.deleteMany({}),
            UserCardProgressModel.deleteMany({}),
          ]);
          await seedDefaultDataIfEmpty();
          await mockDb.loadFromMongo();
        } catch (err: unknown) {
          console.error('Error resetting MongoDB Atlas:', err);
        }
      }
      return ApiResponse.success(
        res,
        null,
        'Database has been reset to default seeds in MongoDB Atlas'
      );
    });
  }

  // Main API Router
  app.use('/api/v1', apiRouter);

  // 404 Catch-all Handler
  app.use((req: Request, _res: Response, next) => {
    next(
      ApiError.notFound(
        `Endpoint ${req.method} ${req.originalUrl} not found on this server`
      )
    );
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};
