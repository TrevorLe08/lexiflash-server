import bcrypt from 'bcryptjs';
import { UserRole } from '../../config/constants.js';
import { User } from '../../types/user.types.js';

// Pre-hashed 'Password123!'
const defaultPasswordHash = bcrypt.hashSync('Password123!', 10);

const today = new Date().toISOString().split('T')[0];

export const initialUsersSeed: User[] = [
  {
    id: 'usr_alex_001',
    email: 'alex@example.com',
    username: 'alex_ielts',
    passwordHash: defaultPasswordHash,
    name: 'Alex Johnson',
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    bio: 'IELTS learner & English enthusiast. Scoring 8.5 IELTS.',
    role: UserRole.USER,
    streakCount: 12,
    lastStudyDate: today,
    isStreakActiveToday: true,
    isStreakAtRisk: false,
    streakStatus: 'ACTIVE',
    bookmarkedSetIds: ['set_idioms_803', 'set_oxford_805'],
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-01-10T08:00:00.000Z',
  },
  {
    id: 'usr_minh_002',
    email: 'minh@example.com',
    username: 'minh_learner',
    passwordHash: defaultPasswordHash,
    name: 'Nguyễn Văn Minh',
    avatarUrl:
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
    bio: 'Học tiếng Anh mỗi ngày để săn học bổng du học.',
    role: UserRole.USER,
    streakCount: 7,
    lastStudyDate: today,
    isStreakActiveToday: true,
    isStreakAtRisk: false,
    streakStatus: 'ACTIVE',
    bookmarkedSetIds: ['set_ielts_801', 'set_oxford_805'],
    createdAt: '2026-02-01T09:30:00.000Z',
    updatedAt: '2026-02-01T09:30:00.000Z',
  },
  {
    id: 'usr_sarah_003',
    email: 'sarah@example.com',
    username: 'sarah_learner',
    passwordHash: defaultPasswordHash,
    name: 'Sarah Williams',
    avatarUrl:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    bio: 'Passionate English learner. Achieving fluency with Oxford 3000 & Travel English.',
    role: UserRole.USER,
    streakCount: 18,
    lastStudyDate: today,
    isStreakActiveToday: true,
    isStreakAtRisk: false,
    streakStatus: 'ACTIVE',
    bookmarkedSetIds: ['set_ielts_801', 'set_toeic_804', 'set_phrasal_806'],
    createdAt: '2026-01-12T09:00:00.000Z',
    updatedAt: '2026-01-12T09:00:00.000Z',
  },
  {
    id: 'usr_admin_004',
    email: 'admin@example.com',
    username: 'admin',
    passwordHash: defaultPasswordHash,
    name: 'System Administrator',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    bio: 'Platform Admin',
    role: UserRole.ADMIN,
    streakCount: 30,
    lastStudyDate: today,
    isStreakActiveToday: true,
    isStreakAtRisk: false,
    streakStatus: 'ACTIVE',
    bookmarkedSetIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];
