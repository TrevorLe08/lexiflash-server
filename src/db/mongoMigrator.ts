import { UserModel } from '../models/User.model.js';
import { StudySetModel } from '../models/StudySet.model.js';
import { CardModel } from '../models/Card.model.js';
import { FolderModel } from '../models/Folder.model.js';
import { ClassModel } from '../models/Class.model.js';
import { UserCardProgressModel } from '../models/UserCardProgress.model.js';

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

    console.log(
      '✅ [DB Migration] All database collections are fully synced and compatible with Backend v2!'
    );
    return {
      success: true,
      message: 'All collections verified and synced with Backend v2 schema.',
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
