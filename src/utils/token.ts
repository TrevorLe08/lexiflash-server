import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { UserRole } from '../config/constants.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export const signAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, ENV.JWT.ACCESS_SECRET, {
    expiresIn: (ENV.JWT.ACCESS_EXPIRES_IN ||
      '15m') as jwt.SignOptions['expiresIn'],
  });
};

export const signRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, ENV.JWT.REFRESH_SECRET, {
    expiresIn: (ENV.JWT.REFRESH_EXPIRES_IN ||
      '7d') as jwt.SignOptions['expiresIn'],
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, ENV.JWT.ACCESS_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, ENV.JWT.REFRESH_SECRET) as TokenPayload;
};
