import { UserModel } from '../models/User.model.js';
import { StudySetModel } from '../models/StudySet.model.js';
import { CardModel } from '../models/Card.model.js';
import { FolderModel } from '../models/Folder.model.js';
import { ClassModel } from '../models/Class.model.js';
import { UserCardProgressModel } from '../models/UserCardProgress.model.js';
import { CardStudyStatus } from '../config/constants.js';

import { initialUsersSeed } from './seeds/users.seed.js';
import { initialStudySetsSeed, initialCardsSeed } from './seeds/studySets.seed.js';
import { initialFoldersSeed } from './seeds/folders.seed.js';
import { initialClassesSeed } from './seeds/classes.seed.js';

export async function seedDefaultDataIfEmpty() {
  const userCount = await UserModel.countDocuments();
  if (userCount > 0) {
    console.log(`[MongoDB] Database already contains ${userCount} users. Skipping auto-seed.`);
    return;
  }

  console.log('[MongoDB] Empty database detected. Seeding initial default data into MongoDB Atlas...');

  try {
    // 1. Seed Users
    await UserModel.insertMany(initialUsersSeed);
    console.log(`[MongoDB] Seeded ${initialUsersSeed.length} default users.`);

    // 2. Seed StudySets
    await StudySetModel.insertMany(initialStudySetsSeed);
    console.log(`[MongoDB] Seeded ${initialStudySetsSeed.length} default study sets.`);

    // 3. Seed Cards
    await CardModel.insertMany(initialCardsSeed);
    console.log(`[MongoDB] Seeded ${initialCardsSeed.length} default cards.`);

    // 4. Seed Folders
    await FolderModel.insertMany(initialFoldersSeed);
    console.log(`[MongoDB] Seeded ${initialFoldersSeed.length} default folders.`);

    // 5. Seed Classes
    await ClassModel.insertMany(initialClassesSeed);
    console.log(`[MongoDB] Seeded ${initialClassesSeed.length} default classes.`);

    // 6. Initial User Progress
    const initialProgress = [
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
        nextReviewDate: new Date(Date.now() - 3600000).toISOString(),
        lapses: 1,
        isStarred: true,
        lastStudiedAt: '2026-02-28T09:00:00.000Z',
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
      },
    ];
    await UserCardProgressModel.insertMany(initialProgress);
    console.log(`[MongoDB] Seeded ${initialProgress.length} user progress records.`);

    console.log('✅ [MongoDB] All initial default data seeded successfully into MongoDB Atlas!');
  } catch (error) {
    console.error('❌ [MongoDB] Error seeding initial data:', error);
  }
}
