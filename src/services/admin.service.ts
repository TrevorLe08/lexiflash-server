import { mockDb, DEFAULT_FEATURED_TOPICS } from '../db/mockDb.js';
import {
  UserRole,
  PrivacyLevel,
  CardStudyStatus,
  StudyMode,
} from '../config/constants.js';
import { User, StreakStatus } from '../types/user.types.js';
import { StudySetWithDetails } from '../types/studySet.types.js';
import { FolderWithDetails } from '../types/folder.types.js';
import { ClassWithDetails } from '../types/class.types.js';
import { StudySetService } from './studySet.service.js';
import { FolderService } from './folder.service.js';
import { ClassService } from './class.service.js';
import { StreakService } from './streak.service.js';
import { ApiError } from '../utils/apiError.js';
import { paginateArray, PaginatedResult } from '../utils/pagination.js';
import { isUserVip, countUserTotalCards } from '../utils/user.utils.js';
import {
  BannerNotificationConfig,
  BannerColor,
  MaintenanceConfig,
} from '../types/system.types.js';

export interface AdminUserListItem {
  id: string;
  email: string;
  username: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  role: UserRole;
  isBanned: boolean;
  isVip: boolean;
  vipExpiresAt?: string | null;
  vipPlan?: string | null;
  streakCount: number;
  lastStudyDate?: string;
  isStreakActiveToday: boolean;
  isStreakAtRisk: boolean;
  streakStatus: StreakStatus;
  stats: {
    totalSetsCreated: number;
    totalCardsOwned: number;
    totalCardsMastered: number;
    totalSessions: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AdminOverviewStats {
  users: {
    totalUsers: number;
    adminCount: number;
    userCount: number;
    vipCount: number;
    vipGoldCount: number;
    vipDiamondCount: number;
    bannedCount: number;
    activeTodayCount: number;
    activeStreakCount: number;
  };
  content: {
    totalStudySets: number;
    publicSets: number;
    privateSets: number;
    featuredSets: number;
    totalCards: number;
    totalFolders: number;
    totalStudyGroups: number;
  };
  activity: {
    totalStudySessions: number;
    modeDistribution: Record<string, { count: number; percentage: number }>;
    totalTestsTaken: number;
    averageTestScore: number;
  };
  recentUsers: Array<{
    id: string;
    name: string;
    username: string;
    email: string;
    role: UserRole;
    avatarUrl?: string;
    createdAt: string;
  }>;
  recentSets: Array<{
    id: string;
    title: string;
    creatorName: string;
    cardCount: number;
    privacy: PrivacyLevel;
    isFeatured: boolean;
    createdAt: string;
  }>;
}

export class AdminService {
  /**
   * 1. Aggregated Platform Overview Statistics & Metrics
   */
  static async getOverviewStats(): Promise<AdminOverviewStats> {
    await mockDb.syncUsersFromMongo();
    const today = StreakService.getTodayDateString();

    // Users Stats
    let totalUsers = 0;
    let adminCount = 0;
    let userCount = 0;
    let vipCount = 0;
    let vipGoldCount = 0;
    let vipDiamondCount = 0;
    let bannedCount = 0;
    let activeTodayCount = 0;
    let activeStreakCount = 0;

    const allUsers = Array.from(mockDb.users.values());
    for (const u of allUsers) {
      totalUsers += 1;
      if (u.role === UserRole.ADMIN) adminCount += 1;
      else userCount += 1;

      if (isUserVip(u) && u.role !== UserRole.ADMIN) {
        vipCount += 1;
        if (u.vipPlan === '1_YEAR') {
          vipDiamondCount += 1;
        } else {
          vipGoldCount += 1;
        }
      }
      if (u.isBanned) bannedCount += 1;
      if (u.lastStudyDate === today) activeTodayCount += 1;
      if (u.streakCount > 0) activeStreakCount += 1;
    }

    // Content Stats
    let totalStudySets = 0;
    let publicSets = 0;
    let privateSets = 0;
    let featuredSets = 0;

    const allSets = Array.from(mockDb.studySets.values());
    for (const s of allSets) {
      totalStudySets += 1;
      if (s.privacy === PrivacyLevel.PUBLIC) publicSets += 1;
      else privateSets += 1;

      if (s.isFeatured) featuredSets += 1;
    }

    const totalCards = mockDb.cards.size;
    const totalFolders = mockDb.folders.size;
    const totalStudyGroups = mockDb.classes.size;

    // Study Sessions Breakdown
    const allSessions = Array.from(mockDb.studySessions.values());
    const totalStudySessions = allSessions.length;
    const modeCounts: Record<string, number> = {
      [StudyMode.FLASHCARDS]: 0,
      [StudyMode.LEARN]: 0,
      [StudyMode.WRITE]: 0,
      [StudyMode.TEST]: 0,
      [StudyMode.MATCH]: 0,
      [StudyMode.CLOZE]: 0,
    };

    for (const session of allSessions) {
      if (modeCounts[session.mode] !== undefined) {
        modeCounts[session.mode] = (modeCounts[session.mode] || 0) + 1;
      }
    }

    const modeDistribution: Record<
      string,
      { count: number; percentage: number }
    > = {};
    for (const mode of Object.values(StudyMode)) {
      const count = modeCounts[mode] || 0;
      const percentage =
        totalStudySessions > 0
          ? Math.round((count / totalStudySessions) * 100)
          : 0;
      modeDistribution[mode] = { count, percentage };
    }

    // Test Histories Stats
    const allTests = Array.from(mockDb.testHistories.values());
    const totalTestsTaken = allTests.length;
    const totalScoreSum = allTests.reduce(
      (acc, t) => acc + (t.scorePercentage || 0),
      0
    );
    const averageTestScore =
      totalTestsTaken > 0 ? Math.round(totalScoreSum / totalTestsTaken) : 0;

    // Recent Users (Newest 5)
    const sortedUsers = [...allUsers].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const recentUsers = sortedUsers.slice(0, 5).map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      email: u.email,
      role: u.role,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
    }));

    // Recent Sets (Newest 5)
    const sortedSets = [...allSets].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const recentSets = sortedSets.slice(0, 5).map((s) => {
      const creator = mockDb.users.get(s.creatorId);
      let cardCount = 0;
      for (const c of mockDb.cards.values()) {
        if (c.studySetId === s.id) cardCount += 1;
      }
      return {
        id: s.id,
        title: s.title,
        creatorName: creator?.name || 'Unknown',
        cardCount,
        privacy: s.privacy,
        isFeatured: Boolean(s.isFeatured),
        createdAt: s.createdAt,
      };
    });

    return {
      users: {
        totalUsers,
        adminCount,
        userCount,
        vipCount,
        vipGoldCount,
        vipDiamondCount,
        bannedCount,
        activeTodayCount,
        activeStreakCount,
      },
      content: {
        totalStudySets,
        publicSets,
        privateSets,
        featuredSets,
        totalCards,
        totalFolders,
        totalStudyGroups,
      },
      activity: {
        totalStudySessions,
        modeDistribution,
        totalTestsTaken,
        averageTestScore,
      },
      recentUsers,
      recentSets,
    };
  }

  /**
   * 2. Paginated User Management List with Study Metrics
   */
  static async getAllUsers(options: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    isBanned?: boolean;
    vipFilter?: string;
  }): Promise<PaginatedResult<AdminUserListItem>> {
    const {
      page = 1,
      limit = 10,
      search = '',
      role,
      isBanned,
      vipFilter,
    } = options;

    await mockDb.syncUsersFromMongo();
    let users = Array.from(mockDb.users.values());

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }

    if (role) {
      users = users.filter((u) => u.role === role);
    }

    if (typeof isBanned === 'boolean') {
      users = users.filter((u) => Boolean(u.isBanned) === isBanned);
    }

    if (vipFilter && vipFilter !== 'ALL') {
      users = users.filter((u) => {
        if (vipFilter === 'FREE')
          return !isUserVip(u) && u.role !== UserRole.ADMIN;
        if (vipFilter === 'VIP_ALL' || vipFilter === 'VIP')
          return isUserVip(u) && u.role !== UserRole.ADMIN;
        if (vipFilter === '1_YEAR' || vipFilter === 'VIP_DIAMOND')
          return isUserVip(u) && u.vipPlan === '1_YEAR';
        if (vipFilter === '1_MONTH' || vipFilter === 'VIP_GOLD')
          return isUserVip(u) && u.vipPlan === '1_MONTH';
        if (vipFilter === 'ADMIN') return u.role === UserRole.ADMIN;
        return true;
      });
    }

    users.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const paginated = paginateArray(users, page, limit);

    const populatedUsers = paginated.items.map((user) => {
      const streakInfo = StreakService.calculateStreakStatus(user);

      let totalSetsCreated = 0;
      for (const set of mockDb.studySets.values()) {
        if (set.creatorId === user.id) totalSetsCreated += 1;
      }

      let totalCardsMastered = 0;
      for (const progress of mockDb.userCardProgress.values()) {
        if (
          progress.userId === user.id &&
          progress.status === CardStudyStatus.MASTERED
        ) {
          totalCardsMastered += 1;
        }
      }

      let totalSessions = 0;
      for (const s of mockDb.studySessions.values()) {
        if (s.userId === user.id) totalSessions += 1;
      }

      const totalCardsOwned = countUserTotalCards(user.id);

      return {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        role: user.role,
        isBanned: Boolean(user.isBanned),
        isVip: isUserVip(user),
        vipExpiresAt: user.vipExpiresAt || null,
        vipPlan: user.vipPlan || null,
        streakCount: streakInfo.streakCount,
        lastStudyDate: streakInfo.lastStudyDate,
        isStreakActiveToday: streakInfo.isStreakActiveToday,
        isStreakAtRisk: streakInfo.isStreakAtRisk,
        streakStatus: streakInfo.streakStatus,
        stats: {
          totalSetsCreated,
          totalCardsOwned,
          totalCardsMastered,
          totalSessions,
        },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    });

    return {
      ...paginated,
      items: populatedUsers,
    };
  }

  /**
   * 3. Update User Role (Promote/Demote)
   */
  static async updateUserRole(
    userId: string,
    newRole: UserRole,
    adminActorId: string
  ): Promise<User> {
    const user = mockDb.users.get(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (userId === adminActorId && newRole !== UserRole.ADMIN) {
      // Check how many admins remain
      const adminCount = Array.from(mockDb.users.values()).filter(
        (u) => u.role === UserRole.ADMIN && !u.isBanned
      ).length;
      if (adminCount <= 1) {
        throw ApiError.badRequest(
          'Cannot demote the only remaining active Administrator'
        );
      }
    }

    user.role = newRole;
    user.updatedAt = new Date().toISOString();
    mockDb.users.set(user.id, user);
    return user;
  }

  /**
   * 4. Toggle User Ban/Suspension Status
   */
  static async toggleUserBan(
    userId: string,
    isBanned: boolean,
    adminActorId: string
  ): Promise<User> {
    const user = mockDb.users.get(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (userId === adminActorId && isBanned) {
      throw ApiError.badRequest(
        'You cannot suspend your own Administrator account'
      );
    }

    user.isBanned = isBanned;
    user.updatedAt = new Date().toISOString();
    mockDb.users.set(user.id, user);
    return user;
  }

  /**
   * 4b. Grant / Extend or Cancel User VIP Subscription
   */
  static async updateUserVip(
    userId: string,
    plan: '1_MONTH' | '1_YEAR' | 'CANCEL'
  ): Promise<User> {
    const user = mockDb.users.get(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const now = new Date();
    if (plan === 'CANCEL') {
      user.isVip = false;
      user.vipExpiresAt = null;
      user.vipPlan = null;
    } else {
      let baseDate = now;
      if (
        user.vipExpiresAt &&
        new Date(user.vipExpiresAt).getTime() > now.getTime()
      ) {
        baseDate = new Date(user.vipExpiresAt);
      }

      const newExpiresAt = new Date(baseDate);
      if (plan === '1_MONTH') {
        newExpiresAt.setDate(newExpiresAt.getDate() + 30);
      } else if (plan === '1_YEAR') {
        newExpiresAt.setDate(newExpiresAt.getDate() + 365);
      }

      user.isVip = true;
      user.vipPlan = plan;
      user.vipExpiresAt = newExpiresAt.toISOString();
    }

    user.updatedAt = new Date().toISOString();
    mockDb.users.set(user.id, user);
    return user;
  }

  /**
   * 5. Paginated Study Sets List for Content Moderation
   */
  static async getAllStudySets(options: {
    page?: number;
    limit?: number;
    search?: string;
    privacy?: PrivacyLevel;
    isFeatured?: boolean;
  }): Promise<PaginatedResult<StudySetWithDetails>> {
    const { page = 1, limit = 10, search = '', privacy, isFeatured } = options;

    let sets = Array.from(mockDb.studySets.values());

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      sets = sets.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q)) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (privacy) {
      sets = sets.filter((s) => s.privacy === privacy);
    }

    if (typeof isFeatured === 'boolean') {
      sets = sets.filter((s) => Boolean(s.isFeatured) === isFeatured);
    }

    sets.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const paginated = paginateArray(sets, page, limit);

    const populatedItems = paginated.items.map((s) =>
      StudySetService.populateSetDetails(s)
    );

    return {
      ...paginated,
      items: populatedItems,
    };
  }

  /**
   * 6. Toggle Featured Badge on Study Set
   */
  static async toggleFeaturedSet(
    setId: string,
    isFeatured: boolean
  ): Promise<StudySetWithDetails> {
    const set = mockDb.studySets.get(setId);
    if (!set) {
      throw ApiError.notFound('Study set not found');
    }

    set.isFeatured = isFeatured;
    set.updatedAt = new Date().toISOString();
    mockDb.studySets.set(set.id, set);

    return StudySetService.populateSetDetails(set);
  }

  /**
   * 6b. Update Study Set Custom Tags by Administrator
   */
  static async updateStudySetTags(
    setId: string,
    tags: string[]
  ): Promise<StudySetWithDetails> {
    const set = mockDb.studySets.get(setId);
    if (!set) {
      throw ApiError.notFound('Study set not found');
    }

    const cleanTags = Array.isArray(tags)
      ? Array.from(new Set(tags.map((t) => String(t).trim()).filter(Boolean)))
      : [];

    set.tags = cleanTags;
    set.updatedAt = new Date().toISOString();
    mockDb.studySets.set(set.id, set);

    return StudySetService.populateSetDetails(set);
  }

  /**
   * 7. Delete Study Set By Administrator (Content Removal)
   */
  static async deleteStudySetByAdmin(setId: string): Promise<void> {
    const set = mockDb.studySets.get(setId);
    if (!set) {
      throw ApiError.notFound('Study set not found');
    }

    // Delete all cards
    for (const [cardId, card] of mockDb.cards.entries()) {
      if (card.studySetId === setId) {
        mockDb.cards.delete(cardId);
      }
    }

    // Delete user progress records
    for (const [progId, prog] of mockDb.userCardProgress.entries()) {
      if (prog.studySetId === setId) {
        mockDb.userCardProgress.delete(progId);
      }
    }

    // Delete test histories
    for (const [hisId, his] of mockDb.testHistories.entries()) {
      if (his.studySetId === setId) {
        mockDb.testHistories.delete(hisId);
      }
    }

    // Delete study sessions
    for (const [sessId, sess] of mockDb.studySessions.entries()) {
      if (sess.studySetId === setId) {
        mockDb.studySessions.delete(sessId);
      }
    }

    // Delete match leaderboards
    for (const [mId, mEntry] of mockDb.matchLeaderboards.entries()) {
      if (mEntry.studySetId === setId) {
        mockDb.matchLeaderboards.delete(mId);
      }
    }

    // Delete study set
    mockDb.studySets.delete(setId);

    // Remove from folders
    for (const folder of mockDb.folders.values()) {
      if (folder.studySetIds && folder.studySetIds.includes(setId)) {
        folder.studySetIds = folder.studySetIds.filter((id) => id !== setId);
        mockDb.folders.set(folder.id, folder);
      }
    }

    // Remove from classes/study groups
    for (const cls of mockDb.classes.values()) {
      if (cls.studySetIds && cls.studySetIds.includes(setId)) {
        cls.studySetIds = cls.studySetIds.filter((id) => id !== setId);
        mockDb.classes.set(cls.id, cls);
      }
    }
  }

  /**
   * 8. Paginated Study Groups List
   */
  static async getAllStudyGroups(options: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResult<ClassWithDetails>> {
    const { page = 1, limit = 10, search = '' } = options;

    let classes = Array.from(mockDb.classes.values());

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      classes = classes.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q))
      );
    }

    classes.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const paginated = paginateArray(classes, page, limit);
    const populated = paginated.items.map((c) =>
      ClassService.populateClassDetails(c, undefined, true)
    );

    return {
      ...paginated,
      items: populated,
    };
  }

  /**
   * Get the current featured topic tags displayed on the Homepage
   */
  static async getFeaturedTopics(): Promise<string[]> {
    if (mockDb.featuredTopics && mockDb.featuredTopics.length > 0) {
      return [...mockDb.featuredTopics];
    }
    return [...DEFAULT_FEATURED_TOPICS];
  }

  /**
   * Update the featured topic tags displayed on the Homepage
   */
  static async updateFeaturedTopics(topics: string[]): Promise<string[]> {
    if (!Array.isArray(topics)) {
      throw ApiError.badRequest('Topics must be an array of strings');
    }

    // Filter, sanitize, remove hashes if passed, and deduplicate
    const sanitized = Array.from(
      new Set(
        topics
          .map((t) =>
            typeof t === 'string' ? t.trim().replace(/^#+/, '') : ''
          )
          .filter((t) => t.length > 0 && t.length <= 50)
      )
    );

    const finalTopics =
      sanitized.length > 0 ? sanitized : [...DEFAULT_FEATURED_TOPICS];

    await mockDb.saveFeaturedTopics(finalTopics);
    return finalTopics;
  }

  /**
   * Get the current top banner notification configuration
   */
  static async getBannerNotification(): Promise<BannerNotificationConfig> {
    return { ...mockDb.bannerNotification };
  }

  /**
   * Update the top banner notification configuration
   */
  static async updateBannerNotification(data: {
    isEnabled: boolean;
    message: string;
    color: BannerColor;
    linkUrl?: string;
    linkText?: string;
  }): Promise<BannerNotificationConfig> {
    const current = mockDb.bannerNotification;

    const isContentChanged =
      current.message !== data.message || current.color !== data.color;

    const updatedBanner: BannerNotificationConfig = {
      id: isContentChanged ? `banner_${Date.now()}` : current.id,
      isEnabled: Boolean(data.isEnabled),
      message: (data.message || '').trim(),
      color: data.color || 'blue',
      linkUrl: data.linkUrl ? data.linkUrl.trim() : '',
      linkText: data.linkText ? data.linkText.trim() : '',
      updatedAt: new Date().toISOString(),
    };

    return await mockDb.saveBannerNotification(updatedBanner);
  }

  /**
   * 9. Paginated Folders List for Content Moderation & Featured Management
   */
  static async getAllFolders(options: {
    page?: number;
    limit?: number;
    search?: string;
    privacy?: PrivacyLevel;
    isFeatured?: boolean;
  }): Promise<PaginatedResult<FolderWithDetails>> {
    const { page = 1, limit = 10, search = '', privacy, isFeatured } = options;

    let folders = Array.from(mockDb.folders.values());

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      folders = folders.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          (f.description && f.description.toLowerCase().includes(q))
      );
    }

    if (privacy) {
      folders = folders.filter((f) => f.privacy === privacy);
    }

    if (typeof isFeatured === 'boolean') {
      folders = folders.filter((f) => Boolean(f.isFeatured) === isFeatured);
    }

    folders.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const paginated = paginateArray(folders, page, limit);

    const populatedItems = paginated.items.map((f) =>
      FolderService.populateFolderDetails(f)
    );

    return {
      ...paginated,
      items: populatedItems,
    };
  }

  /**
   * 10. Toggle Featured Badge on Folder
   */
  static async toggleFeaturedFolder(
    folderId: string,
    isFeatured: boolean
  ): Promise<FolderWithDetails> {
    const folder = mockDb.folders.get(folderId);
    if (!folder) {
      throw ApiError.notFound('Folder not found');
    }

    folder.isFeatured = isFeatured;
    folder.updatedAt = new Date().toISOString();
    mockDb.folders.set(folder.id, folder);

    return FolderService.populateFolderDetails(folder);
  }

  /**
   * 11. Delete Folder by Admin (Content Moderation)
   */
  static async deleteFolder(folderId: string): Promise<void> {
    const folder = mockDb.folders.get(folderId);
    if (!folder) {
      throw ApiError.notFound('Folder not found');
    }
    mockDb.folders.delete(folderId);
  }

  /**
   * 12. Get System Maintenance Configuration
   */
  static async getMaintenanceConfig(): Promise<MaintenanceConfig> {
    return { ...mockDb.maintenanceConfig };
  }

  /**
   * 13. Update System Maintenance Configuration
   */
  static async updateMaintenanceConfig(data: {
    isActive: boolean;
    title: string;
    message: string;
    estimatedEndTime?: string;
  }): Promise<MaintenanceConfig> {
    const updated = await mockDb.saveMaintenanceConfig({
      isActive: Boolean(data.isActive),
      title: (data.title || '').trim() || 'Hệ thống đang bảo trì nâng cấp',
      message:
        (data.message || '').trim() ||
        'LexiFlash đang thực hiện bảo trì định kỳ. Xin vui lòng quay lại sau!',
      estimatedEndTime: (data.estimatedEndTime || '').trim(),
      updatedAt: new Date().toISOString(),
    });
    return updated;
  }
}
