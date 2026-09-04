import { mockDb } from '../db/mockDb.js';
import { User, StreakInfo } from '../types/user.types.js';
import { ApiError } from '../utils/apiError.js';

export class StreakService {
  /**
   * Helper to get current calendar date in YYYY-MM-DD
   */
  static getTodayDateString(): string {
    return new Date().toISOString().split('T')[0]!;
  }

  /**
   * Calculate difference in whole calendar days between two YYYY-MM-DD date strings
   */
  static getDiffInDays(dateA: string, dateB: string): number {
    const a = new Date(dateA.split('T')[0]!);
    const b = new Date(dateB.split('T')[0]!);
    const diffMs = a.getTime() - b.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Evaluate user streak lifecycle dynamically:
   * - diffDays === 0: ACTIVE (🔥 today learned)
   * - diffDays === 1: COOLED (❄️/grayed out - learned yesterday, must learn today to keep streak)
   * - diffDays >= 2: BROKEN (⚪ lost streak - drops to 0 and grayed out)
   * - no lastStudyDate: INACTIVE (⚪ 0 days)
   */
  static calculateStreakStatus(
    user: User
  ): StreakInfo & { userUpdated: boolean } {
    const today = this.getTodayDateString();
    let userUpdated = false;

    if (!user.lastStudyDate) {
      if (
        user.streakCount !== 0 ||
        user.isStreakActiveToday !== false ||
        user.streakStatus !== 'INACTIVE' ||
        user.isStreakAtRisk !== false
      ) {
        user.streakCount = 0;
        user.isStreakActiveToday = false;
        user.isStreakAtRisk = false;
        user.streakStatus = 'INACTIVE';
        user.updatedAt = new Date().toISOString();
        userUpdated = true;
        mockDb.users.set(user.id, user);
      }
      return {
        streakCount: 0,
        lastStudyDate: undefined,
        isStreakActiveToday: false,
        isStreakAtRisk: false,
        streakStatus: 'INACTIVE',
        userUpdated,
      };
    }

    const diffDays = this.getDiffInDays(today, user.lastStudyDate);

    if (diffDays === 0) {
      const calculatedCount = Math.max(1, user.streakCount || 1);
      if (
        user.streakCount !== calculatedCount ||
        user.isStreakActiveToday !== true ||
        user.streakStatus !== 'ACTIVE' ||
        user.isStreakAtRisk !== false
      ) {
        user.streakCount = calculatedCount;
        user.isStreakActiveToday = true;
        user.isStreakAtRisk = false;
        user.streakStatus = 'ACTIVE';
        user.updatedAt = new Date().toISOString();
        userUpdated = true;
        mockDb.users.set(user.id, user);
      }
      return {
        streakCount: user.streakCount,
        lastStudyDate: user.lastStudyDate,
        isStreakActiveToday: true,
        isStreakAtRisk: false,
        streakStatus: 'ACTIVE',
        userUpdated,
      };
    }

    if (diffDays === 1) {
      const calculatedCount = Math.max(1, user.streakCount || 1);
      if (
        user.streakCount !== calculatedCount ||
        user.isStreakActiveToday !== false ||
        user.isStreakAtRisk !== true ||
        user.streakStatus !== 'COOLED'
      ) {
        user.streakCount = calculatedCount;
        user.isStreakActiveToday = false;
        user.isStreakAtRisk = true;
        user.streakStatus = 'COOLED';
        user.updatedAt = new Date().toISOString();
        userUpdated = true;
        mockDb.users.set(user.id, user);
      }
      return {
        streakCount: user.streakCount,
        lastStudyDate: user.lastStudyDate,
        isStreakActiveToday: false,
        isStreakAtRisk: true,
        streakStatus: 'COOLED',
        userUpdated,
      };
    }

    // diffDays >= 2: Streak broken, reset to 0
    if (
      user.streakCount !== 0 ||
      user.isStreakActiveToday !== false ||
      user.streakStatus !== 'BROKEN' ||
      user.isStreakAtRisk !== false
    ) {
      user.streakCount = 0;
      user.isStreakActiveToday = false;
      user.isStreakAtRisk = false;
      user.streakStatus = 'BROKEN';
      user.updatedAt = new Date().toISOString();
      userUpdated = true;
      mockDb.users.set(user.id, user);
    }

    return {
      streakCount: 0,
      lastStudyDate: user.lastStudyDate,
      isStreakActiveToday: false,
      isStreakAtRisk: false,
      streakStatus: 'BROKEN',
      userUpdated,
    };
  }

  /**
   * Record a study event (called when practicing in any study mode)
   */
  static async recordStudyActivity(userId: string): Promise<{
    streakInfo: StreakInfo;
    streakIncreased: boolean;
    streakMaintained: boolean;
  }> {
    const user = mockDb.users.get(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const today = this.getTodayDateString();
    let streakIncreased = false;
    let streakMaintained = false;

    if (!user.lastStudyDate) {
      user.streakCount = 1;
      user.lastStudyDate = today;
      streakIncreased = true;
      streakMaintained = true;
    } else {
      const diffDays = this.getDiffInDays(today, user.lastStudyDate);

      if (diffDays === 0) {
        // Already recorded today - streak is already active, do not notify repeatedly
        user.streakCount = Math.max(1, user.streakCount || 1);
        streakIncreased = false;
        streakMaintained = false;
      } else if (diffDays === 1) {
        // Consecutive study day -> increment streak
        user.streakCount = (user.streakCount || 0) + 1;
        user.lastStudyDate = today;
        streakIncreased = true;
        streakMaintained = true;
      } else {
        // diffDays >= 2: previous streak lost, restart new streak at 1
        user.streakCount = 1;
        user.lastStudyDate = today;
        streakIncreased = true;
        streakMaintained = true;
      }
    }

    // Explicitly update all streak lifecycle attributes on the user document
    user.isStreakActiveToday = true;
    user.isStreakAtRisk = false;
    user.streakStatus = 'ACTIVE';
    user.updatedAt = new Date().toISOString();

    // Persist to SyncedMap (which writes through to MongoDB Atlas)
    mockDb.users.set(user.id, user);

    const streakInfo: StreakInfo = {
      streakCount: user.streakCount,
      lastStudyDate: user.lastStudyDate,
      isStreakActiveToday: true,
      isStreakAtRisk: false,
      streakStatus: 'ACTIVE',
    };

    return {
      streakInfo,
      streakIncreased,
      streakMaintained,
    };
  }

  /**
   * Recalculate streak lifecycle for all registered users (runs at 00:00 midnight)
   */
  static async recalculateAllUsers(): Promise<number> {
    let updatedCount = 0;
    for (const user of mockDb.users.values()) {
      const { userUpdated } = this.calculateStreakStatus(user);
      if (userUpdated) {
        updatedCount += 1;
      }
    }
    if (updatedCount > 0) {
      console.log(
        `🌙 [Midnight Streak] Processed midnight rollover at 00:00: updated ${updatedCount} users.`
      );
    }
    return updatedCount;
  }
}
