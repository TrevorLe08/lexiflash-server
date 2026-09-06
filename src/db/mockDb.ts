import { User, RefreshToken } from '../types/user.types.js';
import { StudySet } from '../types/studySet.types.js';
import { Card } from '../types/card.types.js';
import { Folder } from '../types/folder.types.js';
import { ClassGroup } from '../types/class.types.js';
import { UserCardProgress, StudySession } from '../types/study.types.js';
import { DailyQuest, StudyRoomSession } from '../types/studyRoom.types.js';
import { TestHistory } from '../types/test.types.js';
import { MatchLeaderboardEntry } from '../types/match.types.js';
import { CardStudyStatus, StudyMode } from '../config/constants.js';
import {
  BannerNotificationConfig,
  DEFAULT_BANNER_NOTIFICATION,
  MaintenanceConfig,
  DEFAULT_MAINTENANCE_CONFIG,
} from '../types/system.types.js';

import { initialUsersSeed } from './seeds/users.seed.js';
import {
  initialStudySetsSeed,
  initialCardsSeed,
} from './seeds/studySets.seed.js';
import { initialFoldersSeed } from './seeds/folders.seed.js';
import { initialClassesSeed } from './seeds/classes.seed.js';

import { isMongoConnected } from './mongo.js';
import {
  UserModel,
  StudySetModel,
  CardModel,
  FolderModel,
  ClassModel,
  UserCardProgressModel,
  DailyQuestModel,
  StudySessionModel,
  StudyRoomSessionModel,
  TestHistoryModel,
  MatchLeaderboardModel,
  SystemSettingModel,
} from '../models/index.js';

export const DEFAULT_FEATURED_TOPICS: string[] = [
  'Speaking',
  'IELTS',
  'Daily English',
  'Business',
  'Workplace',
  'Academic',
  'Writing',
  'Reading',
  'Negotiation',
  'Communication',
];

/**
 * SyncedMap extends standard JavaScript Map to provide:
 * 1. O(1) in-memory lookups for blazing-fast reads.
 * 2. Automatic, asynchronous write-through persistence to MongoDB Atlas.
 */
export class SyncedMap<T extends { id: string }> extends Map<string, T> {
  private model: any;

  constructor(model?: any) {
    super();
    this.model = model;
  }

  public setModel(model: any) {
    this.model = model;
  }

  // Raw set without triggering DB write (used during hydration/seeding)
  public rawSet(key: string, value: T): this {
    return super.set(key, value);
  }

  override set(key: string, value: T): this {
    super.set(key, value);
    if (this.model && isMongoConnected()) {
      const plain = { ...value };
      delete (plain as any)._id;
      delete (plain as any).__v;
      this.model
        .updateOne({ id: key }, { $set: plain }, { upsert: true })
        .catch((err: any) => {
          if (isMongoConnected()) {
            console.error(
              `[MongoSync] Error upserting to ${this.model.modelName}:`,
              err.message
            );
          }
        });
    }
    return this;
  }

  override delete(key: string): boolean {
    const res = super.delete(key);
    if (this.model && isMongoConnected()) {
      this.model.deleteOne({ id: key }).catch((err: any) => {
        if (isMongoConnected()) {
          console.error(
            `[MongoSync] Error deleting from ${this.model.modelName}:`,
            err.message
          );
        }
      });
    }
    return res;
  }
}

class MockDatabase {
  public users: SyncedMap<User> = new SyncedMap<User>(UserModel);
  public refreshTokens: Map<string, RefreshToken> = new Map();
  public studySets: SyncedMap<StudySet> = new SyncedMap<StudySet>(
    StudySetModel
  );
  public cards: SyncedMap<Card> = new SyncedMap<Card>(CardModel);
  public folders: SyncedMap<Folder> = new SyncedMap<Folder>(FolderModel);
  public classes: SyncedMap<ClassGroup> = new SyncedMap<ClassGroup>(ClassModel);
  public userCardProgress: SyncedMap<UserCardProgress> =
    new SyncedMap<UserCardProgress>(UserCardProgressModel);
  public studySessions: SyncedMap<StudySession> = new SyncedMap<StudySession>(
    StudySessionModel
  );
  public studyRoomSessions: SyncedMap<StudyRoomSession> =
    new SyncedMap<StudyRoomSession>(StudyRoomSessionModel);
  public dailyQuests: SyncedMap<DailyQuest> = new SyncedMap<DailyQuest>(
    DailyQuestModel
  );
  public testHistories: SyncedMap<TestHistory> = new SyncedMap<TestHistory>(
    TestHistoryModel
  );
  public matchLeaderboards: SyncedMap<MatchLeaderboardEntry> =
    new SyncedMap<MatchLeaderboardEntry>(MatchLeaderboardModel);
  public featuredTopics: string[] = [...DEFAULT_FEATURED_TOPICS];
  public bannerNotification: BannerNotificationConfig = {
    ...DEFAULT_BANNER_NOTIFICATION,
  };
  public maintenanceConfig: MaintenanceConfig = {
    ...DEFAULT_MAINTENANCE_CONFIG,
  };

  constructor() {
    this.seedDefaults();
  }

  public seedDefaults() {
    this.featuredTopics = [...DEFAULT_FEATURED_TOPICS];
    this.bannerNotification = { ...DEFAULT_BANNER_NOTIFICATION };
    this.maintenanceConfig = { ...DEFAULT_MAINTENANCE_CONFIG };
    this.users.clear();
    this.refreshTokens.clear();
    this.studySets.clear();
    this.cards.clear();
    this.folders.clear();
    this.classes.clear();
    this.userCardProgress.clear();
    this.studySessions.clear();
    this.studyRoomSessions.clear();
    this.dailyQuests.clear();
    this.testHistories.clear();
    this.matchLeaderboards.clear();

    // Populate Users
    for (const u of initialUsersSeed) {
      this.users.rawSet(u.id, { ...u });
    }

    // Populate StudySets
    for (const s of initialStudySetsSeed) {
      this.studySets.rawSet(s.id, { ...s });
    }

    // Populate Cards
    for (const c of initialCardsSeed) {
      this.cards.rawSet(c.id, { ...c });
    }

    // Populate Folders
    for (const f of initialFoldersSeed) {
      this.folders.rawSet(f.id, { ...f });
    }

    // Populate Classes
    for (const cl of initialClassesSeed) {
      this.classes.rawSet(cl.id, { ...cl });
    }

    // Initial User Progress for minh_learner & sarah_teacher
    const initialProgress: UserCardProgress[] = [
      {
        id: 'prog_001',
        userId: 'usr_minh_002',
        cardId: 'crd_001',
        studySetId: 'set_ielts_801',
        status: CardStudyStatus.MASTERED,
        repetitionNumber: 4,
        easeFactor: 2.6,
        intervalDays: 10,
        nextReviewDate: new Date(Date.now() + 10 * 86400000).toISOString(),
        lapses: 0,
        isStarred: false,
        lastStudiedAt: '2026-02-28T09:00:00.000Z',
        createdAt: '2026-02-20T09:00:00.000Z',
        updatedAt: '2026-02-28T09:00:00.000Z',
      },
      {
        id: 'prog_002',
        userId: 'usr_minh_002',
        cardId: 'crd_002',
        studySetId: 'set_ielts_801',
        status: CardStudyStatus.LEARNING,
        repetitionNumber: 1,
        easeFactor: 2.3,
        intervalDays: 1,
        nextReviewDate: new Date(Date.now() - 3600000).toISOString(), // due now!
        lapses: 1,
        isStarred: true,
        lastStudiedAt: '2026-02-28T09:00:00.000Z',
        createdAt: '2026-02-20T09:00:00.000Z',
        updatedAt: '2026-02-28T09:00:00.000Z',
      },
      {
        id: 'prog_003',
        userId: 'usr_sarah_003',
        cardId: 'crd_007',
        studySetId: 'set_idioms_803',
        status: CardStudyStatus.MASTERED,
        repetitionNumber: 5,
        easeFactor: 2.7,
        intervalDays: 14,
        nextReviewDate: new Date(Date.now() + 14 * 86400000).toISOString(),
        lapses: 0,
        isStarred: true,
        lastStudiedAt: '2026-02-26T11:00:00.000Z',
        createdAt: '2026-02-15T11:00:00.000Z',
        updatedAt: '2026-02-26T11:00:00.000Z',
      },
    ];

    for (const p of initialProgress) {
      this.userCardProgress.rawSet(p.id, { ...p });
    }

    // Initial Study Sessions
    const initialSessions: StudySession[] = [
      {
        id: 'sess_001',
        userId: 'usr_sarah_003',
        studySetId: 'set_oxford_805',
        mode: StudyMode.FLASHCARDS,
        cardsTotal: 12,
        cardsCorrect: 10,
        cardsIncorrect: 2,
        timeSpentSeconds: 340,
        completedAt: '2026-02-26T11:15:00.000Z',
      },
    ];
    for (const sess of initialSessions) {
      this.studySessions.rawSet(sess.id, { ...sess });
    }

    // Initial Match Leaderboard entry
    const initialMatch: MatchLeaderboardEntry = {
      id: 'match_lead_01',
      studySetId: 'set_ielts_801',
      userId: 'usr_alex_001',
      user: {
        id: 'usr_alex_001',
        name: 'Alex Johnson',
        username: 'alex_ielts',
        avatarUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      },
      timeRecordMs: 14250, // 14.25 seconds
      matchedPairs: 6,
      createdAt: '2026-02-15T15:00:00.000Z',
    };
    this.matchLeaderboards.rawSet(initialMatch.id, initialMatch);
  }

  /**
   * Hydrates the in-memory cache directly from MongoDB Atlas documents.
   */
  public async loadFromMongo() {
    if (!isMongoConnected()) return;

    try {
      const [
        users,
        sets,
        cards,
        folders,
        classes,
        progress,
        quests,
        sessions,
        tests,
        leaderboards,
        featuredTopicsSetting,
        bannerNotificationSetting,
        maintenanceSetting,
      ] = await Promise.all([
        UserModel.find().lean(),
        StudySetModel.find().lean(),
        CardModel.find().lean(),
        FolderModel.find().lean(),
        ClassModel.find().lean(),
        UserCardProgressModel.find().lean(),
        DailyQuestModel.find().lean(),
        StudySessionModel.find().lean(),
        TestHistoryModel.find().lean(),
        MatchLeaderboardModel.find().lean(),
        SystemSettingModel.findOne({ key: 'featuredTopics' }).lean(),
        SystemSettingModel.findOne({ key: 'bannerNotification' }).lean(),
        SystemSettingModel.findOne({ key: 'maintenanceConfig' }).lean(),
      ]);

      if (
        featuredTopicsSetting &&
        Array.isArray((featuredTopicsSetting as any).value) &&
        (featuredTopicsSetting as any).value.length > 0
      ) {
        this.featuredTopics = [...(featuredTopicsSetting as any).value];
      }

      if (
        bannerNotificationSetting &&
        (bannerNotificationSetting as any).value &&
        typeof (bannerNotificationSetting as any).value === 'object'
      ) {
        this.bannerNotification = {
          ...DEFAULT_BANNER_NOTIFICATION,
          ...(bannerNotificationSetting as any).value,
        };
      }

      if (
        maintenanceSetting &&
        (maintenanceSetting as any).value &&
        typeof (maintenanceSetting as any).value === 'object'
      ) {
        this.maintenanceConfig = {
          ...DEFAULT_MAINTENANCE_CONFIG,
          ...(maintenanceSetting as any).value,
        };
      }

      this.users.clear();
      const todayStr = new Date().toISOString().split('T')[0]!;
      for (const u of users) {
        const userObj = { ...(u as any) };
        if (userObj.lastStudyDate) {
          const a = new Date(todayStr);
          const b = new Date(userObj.lastStudyDate.split('T')[0]!);
          const diffDays = Math.floor(
            (a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diffDays === 0) {
            userObj.streakCount = Math.max(1, userObj.streakCount || 1);
            userObj.isStreakActiveToday = true;
            userObj.isStreakAtRisk = false;
            userObj.streakStatus = 'ACTIVE';
          } else if (diffDays === 1) {
            userObj.streakCount = Math.max(1, userObj.streakCount || 1);
            userObj.isStreakActiveToday = false;
            userObj.isStreakAtRisk = true;
            userObj.streakStatus = 'COOLED';
          } else {
            userObj.streakCount = 0;
            userObj.isStreakActiveToday = false;
            userObj.isStreakAtRisk = false;
            userObj.streakStatus = 'BROKEN';
          }
        }
        this.users.rawSet(userObj.id, userObj);
      }

      this.studySets.clear();
      for (const s of sets) {
        this.studySets.rawSet((s as any).id, s as any);
      }

      this.cards.clear();
      for (const c of cards) {
        this.cards.rawSet((c as any).id, c as any);
      }

      this.folders.clear();
      for (const f of folders) {
        this.folders.rawSet((f as any).id, f as any);
      }

      this.classes.clear();
      for (const cl of classes) {
        this.classes.rawSet((cl as any).id, cl as any);
      }

      this.userCardProgress.clear();
      for (const p of progress) {
        this.userCardProgress.rawSet((p as any).id, p as any);
      }

      this.dailyQuests.clear();
      for (const q of quests) {
        this.dailyQuests.rawSet((q as any).id, q as any);
      }

      this.studySessions.clear();
      for (const s of sessions) {
        this.studySessions.rawSet((s as any).id, s as any);
      }

      this.testHistories.clear();
      for (const t of tests) {
        this.testHistories.rawSet((t as any).id, t as any);
      }

      this.matchLeaderboards.clear();
      for (const l of leaderboards) {
        this.matchLeaderboards.rawSet((l as any).id, l as any);
      }
    } catch (err: any) {
      console.error(
        '❌ [MongoDB] Error hydrating cache from MongoDB Atlas:',
        err.message
      );
    }
  }

  public async saveFeaturedTopics(topics: string[]): Promise<string[]> {
    this.featuredTopics = [...topics];
    if (isMongoConnected()) {
      try {
        await SystemSettingModel.findOneAndUpdate(
          { key: 'featuredTopics' },
          { key: 'featuredTopics', value: this.featuredTopics },
          { upsert: true, returnDocument: 'after' }
        );
      } catch (err: any) {
        console.error(
          '[MongoSync] Error saving featuredTopics setting:',
          err.message
        );
      }
    }
    return this.featuredTopics;
  }

  public async saveBannerNotification(
    banner: BannerNotificationConfig
  ): Promise<BannerNotificationConfig> {
    this.bannerNotification = { ...banner };
    if (isMongoConnected()) {
      try {
        await SystemSettingModel.findOneAndUpdate(
          { key: 'bannerNotification' },
          { key: 'bannerNotification', value: this.bannerNotification },
          { upsert: true, returnDocument: 'after' }
        );
      } catch (err: any) {
        console.error(
          '[MongoSync] Error saving bannerNotification setting:',
          err.message
        );
      }
    }
    return this.bannerNotification;
  }

  public async saveMaintenanceConfig(
    config: MaintenanceConfig
  ): Promise<MaintenanceConfig> {
    this.maintenanceConfig = { ...config, updatedAt: new Date().toISOString() };
    if (isMongoConnected()) {
      try {
        await SystemSettingModel.findOneAndUpdate(
          { key: 'maintenanceConfig' },
          { key: 'maintenanceConfig', value: this.maintenanceConfig },
          { upsert: true, returnDocument: 'after' }
        );
      } catch (err: any) {
        console.error(
          '[MongoSync] Error saving maintenanceConfig setting:',
          err.message
        );
      }
    }
    return this.maintenanceConfig;
  }

  public async syncUsersFromMongo(): Promise<void> {
    if (!isMongoConnected()) return;
    try {
      const users = await UserModel.find().lean();
      this.users.clear();
      const todayStr = new Date().toISOString().split('T')[0]!;
      for (const u of users) {
        const userObj = { ...(u as any) };
        if (userObj.lastStudyDate) {
          const a = new Date(todayStr);
          const b = new Date(userObj.lastStudyDate.split('T')[0]!);
          const diffDays = Math.floor(
            (a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diffDays === 0) {
            userObj.streakCount = Math.max(1, userObj.streakCount || 1);
            userObj.isStreakActiveToday = true;
            userObj.isStreakAtRisk = false;
            userObj.streakStatus = 'ACTIVE';
          } else if (diffDays === 1) {
            userObj.streakCount = Math.max(1, userObj.streakCount || 1);
            userObj.isStreakActiveToday = false;
            userObj.isStreakAtRisk = true;
            userObj.streakStatus = 'COOLED';
          } else {
            userObj.streakCount = 0;
            userObj.isStreakActiveToday = false;
            userObj.isStreakAtRisk = false;
            userObj.streakStatus = 'BROKEN';
          }
        }
        this.users.rawSet(userObj.id, userObj);
      }
    } catch (err: any) {
      console.warn(
        '[MongoSync] Error syncing users from MongoDB:',
        err.message
      );
    }
  }

  public async syncWithMongo(): Promise<void> {
    if (!isMongoConnected()) return;
    await this.loadFromMongo();
  }
}

export const mockDb = new MockDatabase();
