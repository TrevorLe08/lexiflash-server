import mongoose from 'mongoose';
import { ENV } from '../config/env.js';
import { seedDefaultDataIfEmpty } from './mongoSeeder.js';

let isConnected = false;

export async function connectDatabase(): Promise<typeof mongoose | null> {
  if (isConnected) {
    return mongoose;
  }

  if (!ENV.MONGODB_URI) {
    console.warn('⚠️ [MongoDB] MONGODB_URI is not defined in environment variables. Running in memory fallback mode.');
    return null;
  }

  try {
    let uri = ENV.MONGODB_URI;
    if (!uri.includes('?')) {
      uri = uri.replace(/\/+$/, '') + `/${ENV.MONGODB_DB_NAME}?retryWrites=true&w=majority`;
    }

    const maskedUri = uri.replace(/:([^:@]+)@/, ':****@');
    console.log(`🔌 [MongoDB] Connecting to MongoDB Atlas: ${maskedUri}...`);

    const connection = await mongoose.connect(uri, {
      dbName: ENV.MONGODB_DB_NAME,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log(`✅ [MongoDB] Connected successfully to MongoDB Atlas! (Database: ${ENV.MONGODB_DB_NAME})`);

    // Auto-seed initial default data if database is empty
    await seedDefaultDataIfEmpty();

    return connection;
  } catch (error: any) {
    console.error('❌ [MongoDB] Connection error:', error.message);
    // Don't crash immediately, allow graceful fallback or retry
    return null;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) return;
  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('🔌 [MongoDB] Disconnected from MongoDB Atlas.');
  } catch (error: any) {
    console.error('❌ [MongoDB] Error disconnecting from MongoDB:', error.message);
  }
}

export function isMongoConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

let userChangeStream: any = null;

export function setupChangeStreams(onUserChange?: () => void) {
  try {
    if (!isConnected || userChangeStream) return;
    const UserModel = mongoose.models['User'];
    if (UserModel) {
      userChangeStream = UserModel.watch([], { fullDocument: 'updateLookup' });
      userChangeStream.on('change', () => {
        if (onUserChange) {
          onUserChange();
        }
      });
      userChangeStream.on('error', () => {
        userChangeStream = null;
      });
    }
  } catch {
    // Ignore if not supported
  }
}

