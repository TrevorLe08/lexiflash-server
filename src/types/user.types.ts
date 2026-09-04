import { UserRole } from '../config/constants.js';
import { StudySetWithDetails } from './studySet.types.js';
import { FolderWithDetails } from './folder.types.js';

export type StreakStatus = 'ACTIVE' | 'COOLED' | 'BROKEN' | 'INACTIVE';

export interface StreakInfo {
  streakCount: number;
  lastStudyDate?: string;
  isStreakActiveToday: boolean;
  isStreakAtRisk: boolean;
  streakStatus: StreakStatus;
}

export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  role: UserRole;
  isBanned?: boolean;
  isVip?: boolean;
  vipExpiresAt?: string | null; // ISO Date string
  vipPlan?: '1_MONTH' | '1_YEAR' | null;
  aiUsageToday?: number;
  aiUsageResetDate?: string; // YYYY-MM-DD
  streakCount: number;
  lastStudyDate?: string; // YYYY-MM-DD
  isStreakActiveToday?: boolean;
  isStreakAtRisk?: boolean;
  streakStatus?: StreakStatus;
  bookmarkedSetIds?: string[];
  resetPasswordToken?: string | null;
  resetPasswordExpires?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  username: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  role: UserRole;
  isBanned?: boolean;
  isVip?: boolean;
  vipExpiresAt?: string | null;
  vipPlan?: '1_MONTH' | '1_YEAR' | null;
  streakCount: number;
  lastStudyDate?: string;
  isStreakActiveToday?: boolean;
  isStreakAtRisk?: boolean;
  streakStatus?: StreakStatus;
  createdAt: string;
  stats?: {
    totalSetsCreated: number;
    totalCardsOwned?: number;
    totalCardsMastered: number;
    totalStudySessions: number;
    streakDays: number;
  };
  createdSets?: StudySetWithDetails[];
  createdFolders?: FolderWithDetails[];
  bookmarkedSets?: StudySetWithDetails[];
}

export interface RefreshToken {
  id: string;
  token: string;
  userId: string;
  expiresAt: string;
  revokedAt?: string;
  createdAt: string;
}
