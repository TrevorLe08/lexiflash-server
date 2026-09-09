import { mockDb } from '../db/mockDb.js';
import { UserProfileResponse } from '../types/user.types.js';
import {
  CardStudyStatus,
  PrivacyLevel,
  UserRole,
} from '../config/constants.js';
import { ApiError } from '../utils/apiError.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { StudySetService } from './studySet.service.js';
import { FolderService } from './folder.service.js';
import { StudySetWithDetails } from '../types/studySet.types.js';
import { FolderWithDetails } from '../types/folder.types.js';
import { StreakService } from './streak.service.js';
import { isUserVip, countUserTotalCards } from '../utils/user.utils.js';
import { UploadService } from './upload.service.js';

export class UserService {
  static async getProfile(
    userIdOrUsername: string,
    viewerId?: string
  ): Promise<UserProfileResponse> {
    // Look up by id first, then by username
    let user = mockDb.users.get(userIdOrUsername);
    if (!user) {
      for (const u of mockDb.users.values()) {
        if (u.username.toLowerCase() === userIdOrUsername.toLowerCase()) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const streakInfo = StreakService.calculateStreakStatus(user);
    const targetUserId = user.id;

    let totalSetsCreated = 0;
    const createdSets: StudySetWithDetails[] = [];
    for (const set of mockDb.studySets.values()) {
      if (set.creatorId === targetUserId) {
        totalSetsCreated += 1;
        if (
          set.privacy === PrivacyLevel.PUBLIC ||
          viewerId === targetUserId ||
          set.creatorId === viewerId
        ) {
          createdSets.push(
            StudySetService.populateSetDetails(set, viewerId || undefined)
          );
        }
      }
    }

    const createdFolders: FolderWithDetails[] = [];
    for (const f of mockDb.folders.values()) {
      if (f.creatorId === targetUserId) {
        if (
          f.privacy === PrivacyLevel.PUBLIC ||
          viewerId === targetUserId ||
          f.creatorId === viewerId
        ) {
          createdFolders.push(
            FolderService.populateFolderDetails(f, viewerId || undefined)
          );
        }
      }
    }

    // Fetch bookmarked sets
    const bookmarkedSets: StudySetWithDetails[] = [];
    const bookmarkedIds = new Set(user.bookmarkedSetIds || []);
    for (const set of mockDb.studySets.values()) {
      if (
        bookmarkedIds.has(set.id) ||
        (set.bookmarkedUserIds && set.bookmarkedUserIds.includes(targetUserId))
      ) {
        if (
          set.privacy === PrivacyLevel.PUBLIC ||
          viewerId === targetUserId ||
          set.creatorId === viewerId
        ) {
          bookmarkedSets.push(
            StudySetService.populateSetDetails(set, viewerId || undefined)
          );
        }
      }
    }

    let totalCardsMastered = 0;
    for (const progress of mockDb.userCardProgress.values()) {
      if (
        progress.userId === targetUserId &&
        progress.status === CardStudyStatus.MASTERED
      ) {
        totalCardsMastered += 1;
      }
    }

    let totalStudySessions = 0;
    for (const session of mockDb.studySessions.values()) {
      if (session.userId === targetUserId) {
        totalStudySessions += 1;
      }
    }

    const totalCardsOwned = countUserTotalCards(targetUserId);

    const isOwnerOrAdmin =
      viewerId &&
      (viewerId === targetUserId ||
        mockDb.users.get(viewerId)?.role === UserRole.ADMIN);

    return {
      id: user.id,
      email: isOwnerOrAdmin ? user.email : '',
      username: user.username,
      name: user.name,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      isBanned: user.isBanned,
      isVip: isUserVip(user),
      vipExpiresAt: isOwnerOrAdmin ? user.vipExpiresAt || null : null,
      vipPlan: isOwnerOrAdmin ? user.vipPlan || null : null,
      streakCount: streakInfo.streakCount,
      lastStudyDate: streakInfo.lastStudyDate,
      isStreakActiveToday: streakInfo.isStreakActiveToday,
      isStreakAtRisk: streakInfo.isStreakAtRisk,
      streakStatus: streakInfo.streakStatus,
      createdAt: user.createdAt,
      stats: {
        totalSetsCreated,
        totalCardsOwned,
        totalCardsMastered,
        totalStudySessions,
        streakDays: streakInfo.streakCount,
      },
      createdSets,
      createdFolders,
      bookmarkedSets,
    };
  }

  static async updateProfile(
    userId: string,
    data: { name?: string; avatarUrl?: string; bio?: string }
  ): Promise<UserProfileResponse> {
    const user = mockDb.users.get(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (data.name !== undefined) user.name = data.name;
    if (data.avatarUrl !== undefined) {
      let finalAvatarUrl = data.avatarUrl;
      // If user uploaded a custom base64 image, upload to Cloudinary
      if (finalAvatarUrl && finalAvatarUrl.startsWith('data:image/')) {
        finalAvatarUrl = await UploadService.uploadAvatar(
          finalAvatarUrl,
          userId
        );
      }
      user.avatarUrl = finalAvatarUrl;
    }
    if (data.bio !== undefined) user.bio = data.bio;
    user.updatedAt = new Date().toISOString();

    mockDb.users.set(user.id, user);
    return this.getProfile(userId, userId);
  }

  static async changePassword(
    userId: string,
    input: { currentPassword: string; newPassword: string }
  ): Promise<void> {
    const user = mockDb.users.get(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const isMatch = await comparePassword(
      input.currentPassword,
      user.passwordHash
    );
    if (!isMatch) {
      throw ApiError.badRequest('Current password does not match');
    }

    user.passwordHash = await hashPassword(input.newPassword);
    user.updatedAt = new Date().toISOString();
    mockDb.users.set(user.id, user);

    // Invalidate all existing refresh tokens for this user
    for (const [id, rtk] of mockDb.refreshTokens.entries()) {
      if (rtk.userId === user.id) {
        mockDb.refreshTokens.delete(id);
      }
    }
  }

  static async changeEmail(
    userId: string,
    input: { newEmail: string; password: string }
  ): Promise<UserProfileResponse> {
    const user = mockDb.users.get(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const normalizedNewEmail = input.newEmail.trim().toLowerCase();
    if (user.email.toLowerCase() === normalizedNewEmail) {
      throw ApiError.badRequest('Email mới phải khác email hiện tại');
    }

    // Check if new email is taken by another account
    for (const u of mockDb.users.values()) {
      if (u.id !== userId && u.email.toLowerCase() === normalizedNewEmail) {
        throw ApiError.conflict(
          'Email này đã được sử dụng bởi một tài khoản khác'
        );
      }
    }

    if (!input.password) {
      throw ApiError.badRequest(
        'Vui lòng cung cấp mật khẩu hiện tại để xác nhận đổi email'
      );
    }

    const isMatch = await comparePassword(input.password, user.passwordHash);
    if (!isMatch) {
      throw ApiError.badRequest('Mật khẩu xác nhận không chính xác');
    }

    user.email = normalizedNewEmail;
    user.updatedAt = new Date().toISOString();
    mockDb.users.set(user.id, user);

    return this.getProfile(userId, userId);
  }

  static async getStats(userId: string) {
    const profile = await this.getProfile(userId, userId);

    // Breakdown by study mode
    const modeCounts: Record<string, number> = {};
    let totalStudyTimeSeconds = 0;

    for (const session of mockDb.studySessions.values()) {
      if (session.userId === userId) {
        modeCounts[session.mode] = (modeCounts[session.mode] || 0) + 1;
        totalStudyTimeSeconds += session.timeSpentSeconds || 0;
      }
    }

    return {
      userId,
      streak: profile.streakCount,
      lastStudyDate: profile.lastStudyDate,
      totalStudyTimeSeconds,
      sessionsByMode: modeCounts,
      stats: profile.stats,
    };
  }
}
