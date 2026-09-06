import { connectDatabase, disconnectDatabase } from '../db/mongo.js';
import { autoMigrateDatabase } from '../db/mongoMigrator.js';

async function runStandaloneMigration() {
  console.log(
    '🚀 [CLI Migration] Starting manual database schema migration...'
  );
  const conn = await connectDatabase();
  if (!conn) {
    console.error('❌ [CLI Migration] Failed to connect to MongoDB. Aborting.');
    process.exit(1);
  }

  const result = await autoMigrateDatabase();
  if (result.success) {
    console.log('✨ [CLI Migration] Migration completed successfully!');
  } else {
    console.error(
      '❌ [CLI Migration] Migration finished with warnings:',
      result.message
    );
  }

  await disconnectDatabase();
  process.exit(result.success ? 0 : 1);
}

runStandaloneMigration();
