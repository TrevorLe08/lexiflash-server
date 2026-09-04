import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  JWT: {
    ACCESS_SECRET:
      process.env.JWT_ACCESS_SECRET || 'lexiflash_super_secret_access_key_2026',
    REFRESH_SECRET:
      process.env.JWT_REFRESH_SECRET || 'lexiflash_super_secret_refresh_key_2026',
    ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
  MONGODB_URI: process.env.MONGODB_URI || '',
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'lexiflash',
  GMAIL_USER: process.env.GMAIL_USER || '',
  GMAIL_APP_PASSWORD: (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, ''),
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'LexiFlash Support',
  EMAIL_FROM: process.env.EMAIL_FROM || '',
};
