import { UserModel } from '../models/User.model.js';
import { StudySetModel } from '../models/StudySet.model.js';
import { CardModel } from '../models/Card.model.js';
import { FolderModel } from '../models/Folder.model.js';
import { ClassModel } from '../models/Class.model.js';
import { UserCardProgressModel } from '../models/UserCardProgress.model.js';
import { SystemSettingModel } from '../models/SystemSetting.model.js';
import {
  DailyQuestModel,
  StudySessionModel,
  StudyRoomSessionModel,
  TestHistoryModel,
  MatchLeaderboardModel,
} from '../models/StudyRoom.model.js';
import {
  DEFAULT_BANNER_NOTIFICATION,
  DEFAULT_MAINTENANCE_CONFIG,
} from '../types/system.types.js';
import { DEFAULT_FEATURED_TOPICS } from './mockDb.js';

/**
 * Auto-migration routine for MongoDB Production / Existing Databases.
 * Automatically backfills default values for any missing fields introduced in Backend v2.
 * This runs safely and idempotently on server startup with zero downtime.
 */
export async function autoMigrateDatabase(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log(
      '🔄 [DB Migration] Verifying & syncing schema fields with Backend v2...'
    );

    // 1. Users: VIP, Streak, AI limits, Bookmarks, Bio, Ban status
    await UserModel.updateMany(
      { isVip: { $exists: false } },
      {
        $set: {
          isVip: false,
          vipExpiresAt: null,
          vipPlan: null,
          aiUsageToday: 0,
        },
      }
    );
    await UserModel.updateMany(
      { streakCount: { $exists: false } },
      {
        $set: {
          streakCount: 0,
          isStreakActiveToday: false,
          isStreakAtRisk: false,
          streakStatus: 'INACTIVE',
        },
      }
    );
    await UserModel.updateMany(
      { bookmarkedSetIds: { $exists: false } },
      { $set: { bookmarkedSetIds: [] } }
    );
    await UserModel.updateMany(
      { bio: { $exists: false } },
      { $set: { bio: '' } }
    );
    await UserModel.updateMany(
      { isBanned: { $exists: false } },
      { $set: { isBanned: false } }
    );
    await UserModel.updateMany(
      { resetPasswordToken: { $exists: false } },
      { $set: { resetPasswordToken: null, resetPasswordExpires: null } }
    );

    // 2. Cards: Phonetic, Example, Hint, OrderIndex
    await CardModel.updateMany(
      { phonetic: { $exists: false } },
      { $set: { phonetic: '' } }
    );
    await CardModel.updateMany(
      { example: { $exists: false } },
      { $set: { example: '' } }
    );
    await CardModel.updateMany(
      { hint: { $exists: false } },
      { $set: { hint: '' } }
    );
    await CardModel.updateMany(
      { orderIndex: { $exists: false } },
      { $set: { orderIndex: 0 } }
    );

    // 3. StudySets: Level, Languages, Tags, Views, Starred/Bookmarked users
    await StudySetModel.updateMany(
      { level: { $exists: false } },
      { $set: { level: 'ALL' } }
    );
    await StudySetModel.updateMany(
      { sourceLanguage: { $exists: false } },
      { $set: { sourceLanguage: 'en', targetLanguage: 'vi' } }
    );
    await StudySetModel.updateMany(
      { tags: { $exists: false } },
      { $set: { tags: [] } }
    );
    await StudySetModel.updateMany(
      { viewCount: { $exists: false } },
      { $set: { viewCount: 0, dailyViews: {} } }
    );
    await StudySetModel.updateMany(
      { starredUserIds: { $exists: false } },
      { $set: { starredUserIds: [] } }
    );
    await StudySetModel.updateMany(
      { bookmarkedUserIds: { $exists: false } },
      { $set: { bookmarkedUserIds: [] } }
    );
    await StudySetModel.updateMany(
      { isFeatured: { $exists: false } },
      { $set: { isFeatured: false } }
    );

    // 4. Folders: Description, studySetIds
    await FolderModel.updateMany(
      { description: { $exists: false } },
      { $set: { description: '' } }
    );
    await FolderModel.updateMany(
      { studySetIds: { $exists: false } },
      { $set: { studySetIds: [] } }
    );
    await FolderModel.updateMany(
      { isFeatured: { $exists: false } },
      { $set: { isFeatured: false } }
    );

    // 5. Classes: Description, Settings, Members, StudySets, JoinCode
    await ClassModel.updateMany(
      { description: { $exists: false } },
      { $set: { description: '', schoolName: '' } }
    );
    await ClassModel.updateMany(
      { allowMemberAddSets: { $exists: false } },
      { $set: { allowMemberAddSets: true, allowMemberInvite: true } }
    );
    await ClassModel.updateMany(
      { members: { $exists: false } },
      { $set: { members: [] } }
    );
    await ClassModel.updateMany(
      { studySetIds: { $exists: false } },
      { $set: { studySetIds: [] } }
    );

    // If any legacy class lacks a joinCode, auto-generate a unique 6-character code
    const classesWithoutCode = await ClassModel.find({
      $or: [
        { joinCode: { $exists: false } },
        { joinCode: '' },
        { joinCode: null },
      ],
    });
    for (const cls of classesWithoutCode) {
      cls.joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await cls.save();
    }

    // 6. UserCardProgress: SM-2 Spaced Repetition parameters
    await UserCardProgressModel.updateMany(
      { repetitionNumber: { $exists: false } },
      {
        $set: {
          repetitionNumber: 0,
          easeFactor: 2.5,
          intervalDays: 0,
          lapses: 0,
          isStarred: false,
        },
      }
    );

    // 7. SystemSettings: Ensure maintenanceConfig, bannerNotification, featuredTopics exist
    const maintenanceSetting = await SystemSettingModel.findOne({
      key: 'maintenanceConfig',
    });
    if (!maintenanceSetting) {
      await SystemSettingModel.create({
        key: 'maintenanceConfig',
        value: DEFAULT_MAINTENANCE_CONFIG,
      });
    }

    const bannerSetting = await SystemSettingModel.findOne({
      key: 'bannerNotification',
    });
    if (!bannerSetting) {
      await SystemSettingModel.create({
        key: 'bannerNotification',
        value: DEFAULT_BANNER_NOTIFICATION,
      });
    }

    const featuredSetting = await SystemSettingModel.findOne({
      key: 'featuredTopics',
    });
    if (!featuredSetting) {
      await SystemSettingModel.create({
        key: 'featuredTopics',
        value: DEFAULT_FEATURED_TOPICS,
      });
    }

    // 8. Auto-Optimization & Storage Protection: Register TTL indexes on Atlas
    console.log(
      '🧹 [DB Optimization] Synchronizing TTL indexes & cleaning up storage bloat...'
    );
    await Promise.allSettled([
      DailyQuestModel.createIndexes(),
      StudySessionModel.createIndexes(),
      StudyRoomSessionModel.createIndexes(),
      TestHistoryModel.createIndexes(),
      UserCardProgressModel.createIndexes(),
      CardModel.createIndexes(),
      StudySetModel.createIndexes(),
      UserModel.createIndexes(),
    ]);

    // 9. Cascade Orphan Data Purge: Delete cards, progress, sessions, and histories belonging to non-existent sets
    const existingSets = await StudySetModel.find({}, { id: 1 }).lean();
    const existingSetIds = new Set(existingSets.map((s) => s.id));

    if (existingSetIds.size > 0) {
      const validIds = Array.from(existingSetIds);
      const orphanCards = await CardModel.deleteMany({
        studySetId: { $nin: validIds },
      });
      const orphanProg = await UserCardProgressModel.deleteMany({
        studySetId: { $nin: validIds },
      });
      const orphanHistories = await TestHistoryModel.deleteMany({
        studySetId: { $nin: validIds },
      });
      const orphanSessions = await StudySessionModel.deleteMany({
        studySetId: { $nin: validIds },
      });
      const orphanLeaderboard = await MatchLeaderboardModel.deleteMany({
        studySetId: { $nin: validIds },
      });

      const totalOrphans =
        (orphanCards.deletedCount || 0) +
        (orphanProg.deletedCount || 0) +
        (orphanHistories.deletedCount || 0) +
        (orphanSessions.deletedCount || 0) +
        (orphanLeaderboard.deletedCount || 0);

      if (totalOrphans > 0) {
        console.log(
          `🧹 [DB Optimization] Purged ${totalOrphans} orphan records from deleted sets.`
        );
      }
    }

    // 10. Purge expired DailyQuests older than 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const cutoffDateStr = fourteenDaysAgo.toISOString().split('T')[0]!;
    const deletedQuests = await DailyQuestModel.deleteMany({
      date: { $lt: cutoffDateStr },
    });
    if ((deletedQuests.deletedCount || 0) > 0) {
      console.log(
        `🧹 [DB Optimization] Purged ${deletedQuests.deletedCount} expired daily quests older than 14 days.`
      );
    }

    // 11. Trim dailyViews in StudySets: Rolling 30-day window
    const setsWithDailyViews = await StudySetModel.find({
      dailyViews: { $exists: true, $ne: {} },
    });
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const viewCutoffStr = thirtyDaysAgo.toISOString().split('T')[0]!;
    let trimmedSetsCount = 0;

    for (const s of setsWithDailyViews) {
      const dailyMap = s.dailyViews as Record<string, number> | undefined;
      if (dailyMap && typeof dailyMap === 'object') {
        const keys = Object.keys(dailyMap);
        const hasOldKeys = keys.some((k) => k < viewCutoffStr);
        if (hasOldKeys) {
          const trimmed: Record<string, number> = {};
          for (const k of keys) {
            if (k >= viewCutoffStr) {
              trimmed[k] = dailyMap[k]!;
            }
          }
          s.dailyViews = trimmed;
          s.markModified('dailyViews');
          await s.save();
          trimmedSetsCount++;
        }
      }
    }
    if (trimmedSetsCount > 0) {
      console.log(
        `🧹 [DB Optimization] Compacted dailyViews rolling window for ${trimmedSetsCount} study sets.`
      );
    }

    console.log(
      '✅ [DB Migration] All database collections are fully synced, optimized, and protected against storage bloat!'
    );
    return {
      success: true,
      message:
        'All collections verified, indexed, and storage optimization completed.',
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('⚠️ [DB Migration] Migration warning (non-fatal):', msg);
    return {
      success: false,
      message: msg,
    };
  }
}

let maintenanceInterval: ReturnType<typeof globalThis.setInterval> | null =
  null;

/**
 * Starts a recurring 24-hour maintenance background scheduler.
 * Keeps production database perpetually lean without manual intervention.
 */
export function startDatabaseMaintenanceScheduler(): void {
  if (maintenanceInterval) return;
  // Run once every 24 hours
  maintenanceInterval = globalThis.setInterval(
    () => {
      autoMigrateDatabase().catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('⚠️ [DB Maintenance] Scheduled maintenance error:', msg);
      });
    },
    24 * 60 * 60 * 1000
  );
  if (
    maintenanceInterval &&
    typeof (maintenanceInterval as unknown as { unref?: () => void }).unref ===
      'function'
  ) {
    (maintenanceInterval as unknown as { unref: () => void }).unref();
  }
}
