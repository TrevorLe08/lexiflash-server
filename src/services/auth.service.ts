import { mockDb } from '../db/mockDb.js';
import {
  User,
  RefreshToken,
  UserProfileResponse,
} from '../types/user.types.js';
import { UserRole } from '../config/constants.js';
import { generateId } from '../utils/id.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  TokenPayload,
} from '../utils/token.js';
import { ApiError } from '../utils/apiError.js';
import { StreakService } from './streak.service.js';
import { isUserVip } from '../utils/user.utils.js';
import { ENV } from '../config/env.js';
import { MailService } from './mail.service.js';
import crypto from 'crypto';

export class AuthService {
  static async register(input: {
    email: string;
    username: string;
    password: string;
    name: string;
    role?: UserRole;
    avatarUrl?: string;
    bio?: string;
  }): Promise<{
    user: UserProfileResponse;
    accessToken: string;
    refreshToken: string;
  }> {
    const email = input.email.toLowerCase();
    const username = input.username.toLowerCase();

    // Check unique email
    for (const u of mockDb.users.values()) {
      if (u.email.toLowerCase() === email) {
        throw ApiError.conflict('Email already registered');
      }
      if (u.username.toLowerCase() === username) {
        throw ApiError.conflict('Username already taken');
      }
    }

    const passwordHash = await hashPassword(input.password);
    const now = new Date().toISOString();

    const newUser: User = {
      id: generateId('usr'),
      email,
      username,
      passwordHash,
      name: input.name,
      avatarUrl:
        input.avatarUrl ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
          username
        )}`,
      bio: input.bio || '',
      role: input.role || UserRole.USER,
      streakCount: 0,
      lastStudyDate: undefined,
      bookmarkedSetIds: [],
      createdAt: now,
      updatedAt: now,
    };

    mockDb.users.set(newUser.id, newUser);

    const tokenPayload: TokenPayload = {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // Save refresh token
    const refreshTokenRecord: RefreshToken = {
      id: generateId('rtk'),
      token: refreshToken,
      userId: newUser.id,
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: now,
    };
    mockDb.refreshTokens.set(refreshTokenRecord.id, refreshTokenRecord);

    const streakInfo = StreakService.calculateStreakStatus(newUser);

    const userProfile: UserProfileResponse = {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      name: newUser.name,
      avatarUrl: newUser.avatarUrl,
      bio: newUser.bio,
      role: newUser.role,
      isBanned: newUser.isBanned,
      isVip: isUserVip(newUser),
      vipExpiresAt: newUser.vipExpiresAt || null,
      vipPlan: newUser.vipPlan || null,
      streakCount: streakInfo.streakCount,
      lastStudyDate: streakInfo.lastStudyDate,
      isStreakActiveToday: streakInfo.isStreakActiveToday,
      isStreakAtRisk: streakInfo.isStreakAtRisk,
      streakStatus: streakInfo.streakStatus,
      createdAt: newUser.createdAt,
    };

    return { user: userProfile, accessToken, refreshToken };
  }

  static async login(input: {
    loginIdentifier?: string;
    username?: string;
    email?: string;
    password: string;
  }): Promise<{
    user: UserProfileResponse;
    accessToken: string;
    refreshToken: string;
  }> {
    const rawId =
      input.loginIdentifier || input.username || input.email || '';
    const identifier = rawId.trim().toLowerCase();
    let foundUser: User | undefined;

    for (const u of mockDb.users.values()) {
      if (
        u.email.toLowerCase() === identifier ||
        u.username.toLowerCase() === identifier
      ) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser) {
      throw ApiError.unauthorized('Invalid email/username or password');
    }

    if (foundUser.isBanned) {
      throw ApiError.forbidden(
        'Your account has been suspended by an administrator. Please contact support.'
      );
    }

    const isMatch = await comparePassword(
      input.password,
      foundUser.passwordHash
    );
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email/username or password');
    }

    // Dynamic streak calculation without false login-increment
    const streakInfo = StreakService.calculateStreakStatus(foundUser);

    const tokenPayload: TokenPayload = {
      userId: foundUser.id,
      email: foundUser.email,
      role: foundUser.role,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // Save refresh token
    const refreshTokenRecord: RefreshToken = {
      id: generateId('rtk'),
      token: refreshToken,
      userId: foundUser.id,
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    mockDb.refreshTokens.set(refreshTokenRecord.id, refreshTokenRecord);

    const userProfile: UserProfileResponse = {
      id: foundUser.id,
      email: foundUser.email,
      username: foundUser.username,
      name: foundUser.name,
      avatarUrl: foundUser.avatarUrl,
      bio: foundUser.bio,
      role: foundUser.role,
      isBanned: foundUser.isBanned,
      isVip: isUserVip(foundUser),
      vipExpiresAt: foundUser.vipExpiresAt || null,
      vipPlan: foundUser.vipPlan || null,
      streakCount: streakInfo.streakCount,
      lastStudyDate: streakInfo.lastStudyDate,
      isStreakActiveToday: streakInfo.isStreakActiveToday,
      isStreakAtRisk: streakInfo.isStreakAtRisk,
      streakStatus: streakInfo.streakStatus,
      createdAt: foundUser.createdAt,
    };

    return { user: userProfile, accessToken, refreshToken };
  }

  static async refreshToken(
    oldRefreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: TokenPayload;
    try {
      payload = verifyRefreshToken(oldRefreshToken);
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    // Find token in database
    let tokenRecord: RefreshToken | undefined;
    for (const rtk of mockDb.refreshTokens.values()) {
      if (rtk.token === oldRefreshToken && !rtk.revokedAt) {
        tokenRecord = rtk;
        break;
      }
    }

    if (!tokenRecord) {
      throw ApiError.unauthorized(
        'Refresh token has been revoked or is invalid'
      );
    }

    // Revoke old token (Token rotation)
    tokenRecord.revokedAt = new Date().toISOString();
    mockDb.refreshTokens.set(tokenRecord.id, tokenRecord);

    const user = mockDb.users.get(payload.userId);
    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const newAccessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(tokenPayload);

    const newRecord: RefreshToken = {
      id: generateId('rtk'),
      token: newRefreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    mockDb.refreshTokens.set(newRecord.id, newRecord);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  static async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    for (const rtk of mockDb.refreshTokens.values()) {
      if (rtk.token === refreshToken) {
        rtk.revokedAt = new Date().toISOString();
        mockDb.refreshTokens.set(rtk.id, rtk);
      }
    }
  }

  static async getMe(userId: string): Promise<UserProfileResponse> {
    const user = mockDb.users.get(userId);
    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    const streakInfo = StreakService.calculateStreakStatus(user);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      isBanned: user.isBanned,
      isVip: isUserVip(user),
      vipExpiresAt: user.vipExpiresAt || null,
      vipPlan: user.vipPlan || null,
      streakCount: streakInfo.streakCount,
      lastStudyDate: streakInfo.lastStudyDate,
      isStreakActiveToday: streakInfo.isStreakActiveToday,
      isStreakAtRisk: streakInfo.isStreakAtRisk,
      streakStatus: streakInfo.streakStatus,
      createdAt: user.createdAt,
    };
  }

  static async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    let user: User | null = null;
    for (const u of mockDb.users.values()) {
      if (u.email.toLowerCase() === normalizedEmail) {
        user = u;
        break;
      }
    }

    // Return silently if user not found to prevent user enumeration attacks
    if (!user) {
      console.log(
        `[AuthService.forgotPassword] Email ${normalizedEmail} not found in database. Silently ignored.`
      );
      return;
    }

    // Generate 32 bytes random reset token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes validity

    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = expires;
    user.updatedAt = new Date().toISOString();
    mockDb.users.set(user.id, user);

    const resetUrl = `${ENV.CLIENT_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(
      user.email
    )}`;

    await MailService.sendPasswordResetEmail({
      to: user.email,
      userName: user.name,
      resetUrl,
    });
  }

  static async resetPassword(input: {
    token: string;
    email: string;
    newPassword: string;
  }): Promise<void> {
    const normalizedEmail = input.email.toLowerCase().trim();
    let user: User | null = null;
    for (const u of mockDb.users.values()) {
      if (u.email.toLowerCase() === normalizedEmail) {
        user = u;
        break;
      }
    }

    if (!user || !user.resetPasswordToken || !user.resetPasswordExpires) {
      throw ApiError.badRequest('Invalid or expired password reset link');
    }

    const tokenHash = crypto.createHash('sha256').update(input.token.trim()).digest('hex');
    if (tokenHash !== user.resetPasswordToken) {
      throw ApiError.badRequest('Invalid or expired password reset link');
    }

    if (new Date(user.resetPasswordExpires).getTime() < Date.now()) {
      throw ApiError.badRequest(
        'Password reset link has expired. Please request a new one.'
      );
    }

    const newPasswordHash = await hashPassword(input.newPassword);
    user.passwordHash = newPasswordHash;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.updatedAt = new Date().toISOString();
    mockDb.users.set(user.id, user);

    // Invalidate any active refresh tokens for maximum security
    for (const [id, rtk] of mockDb.refreshTokens.entries()) {
      if (rtk.userId === user.id) {
        mockDb.refreshTokens.delete(id);
      }
    }
  }

  static async changePassword(
    userId: string,
    input: { oldPassword: string; newPassword: string }
  ): Promise<void> {
    const user = mockDb.users.get(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const isMatch = await comparePassword(input.oldPassword, user.passwordHash);
    if (!isMatch) {
      throw ApiError.badRequest('Mật khẩu hiện tại không chính xác (Current password is incorrect)');
    }

    if (input.oldPassword === input.newPassword) {
      throw ApiError.badRequest(
        'Mật khẩu mới không được trùng với mật khẩu cũ (New password must be different from current password)'
      );
    }

    user.passwordHash = await hashPassword(input.newPassword);
    user.updatedAt = new Date().toISOString();
    mockDb.users.set(user.id, user);
  }
}
