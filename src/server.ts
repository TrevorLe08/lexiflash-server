import { createApp } from './app.js';
import { ENV } from './config/env.js';
import {
  connectDatabase,
  disconnectDatabase,
  setupChangeStreams,
} from './db/mongo.js';
import { mockDb } from './db/mockDb.js';
import { StreakService } from './services/streak.service.js';

function startMidnightStreakScheduler() {
  const scheduleNextMidnight = () => {
    const now = new Date();
    const tomorrowMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      500
    );
    const msUntilMidnight = tomorrowMidnight.getTime() - now.getTime();

    setTimeout(async () => {
      try {
        await StreakService.recalculateAllUsers();
      } catch (err: any) {
        console.error(
          'Error running midnight streak recalculation:',
          err.message
        );
      }
      scheduleNextMidnight();
    }, msUntilMidnight);

    console.log(
      `⏱️ [Midnight Streak Scheduler] Next streak rollover in ${(
        msUntilMidnight /
        1000 /
        60
      ).toFixed(1)} minutes (at 00:00).`
    );
  };

  scheduleNextMidnight();
}

async function bootstrap() {
  // 1. Connect to MongoDB Atlas and auto-seed if empty
  const mongo = await connectDatabase();
  if (mongo) {
    await mockDb.loadFromMongo();
    setupChangeStreams(() => {
      mockDb.syncUsersFromMongo().catch(() => {});
    });
  }

  // 2. Start Midnight Streak Rollover Scheduler
  startMidnightStreakScheduler();

  // Security check for production JWT secrets
  if (ENV.NODE_ENV === 'production') {
    if (
      ENV.JWT.ACCESS_SECRET === 'lexiflash_super_secret_access_key_2026' ||
      ENV.JWT.REFRESH_SECRET === 'lexiflash_super_secret_refresh_key_2026'
    ) {
      console.warn(
        '⚠️ [SECURITY ALERT] Production server is running with DEFAULT JWT secrets! Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in environment variables immediately to prevent token forgery.'
      );
    }
  }

  // 3. Initialize Express application
  const app = createApp();

  const server = app.listen(ENV.PORT, () => {
    console.log('====================================================');
    console.log(`🚀 LexiFlash Backend Server is running!`);
    console.log(`🌐 Server URL: http://localhost:${ENV.PORT}`);
    console.log(`📚 Health check: http://localhost:${ENV.PORT}/health`);
    console.log(`📖 API Base: http://localhost:${ENV.PORT}/api/v1`);
    console.log(`🔧 Environment: ${ENV.NODE_ENV}`);
    console.log(`🗄️ Database: MongoDB Atlas (${ENV.MONGODB_DB_NAME})`);
    console.log('====================================================');
  });

  // Graceful shutdown handlers
  const handleShutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Stopping server gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      console.log('Server terminated cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
