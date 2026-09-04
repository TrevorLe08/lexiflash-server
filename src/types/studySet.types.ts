import { PrivacyLevel } from '../config/constants.js';
import { Card, CreateCardInput } from './card.types.js';

export type StudyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL';

export interface StudySet {
  id: string;
  title: string;
  description?: string;
  privacy: PrivacyLevel;
  password?: string;
  level?: StudyLevel;
  sourceLanguage: string;
  targetLanguage: string;
  creatorId: string;
  tags: string[];
  viewCount: number;
  dailyViews?: Record<string, number>; // YYYY-MM-DD -> view count
  starredUserIds: string[]; // users who favorited this set
  bookmarkedUserIds?: string[]; // users who bookmarked this set
  isFeatured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudySetWithDetails extends StudySet {
  cards: Card[];
  creator: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string;
    role?: string;
  };
  cardCount: number;
  isStarredByCurrentUser?: boolean;
  isBookmarked?: boolean;
  bookmarkCount?: number;
  isFeatured?: boolean;
}

export interface CreateStudySetInput {
  title: string;
  description?: string;
  privacy?: PrivacyLevel;
  password?: string;
  level?: StudyLevel;
  sourceLanguage?: string;
  targetLanguage?: string;
  tags?: string[];
  cards?: CreateCardInput[];
}

export interface UpdateCardItemInput {
  id?: string;
  term: string;
  definition: string;
  phonetic?: string;
  example?: string;
  hint?: string;
  imageUrl?: string;
  audioUrl?: string;
  orderIndex?: number;
}

export interface UpdateStudySetInput {
  title?: string;
  description?: string;
  privacy?: PrivacyLevel;
  password?: string;
  level?: StudyLevel;
  sourceLanguage?: string;
  targetLanguage?: string;
  tags?: string[];
  cards?: UpdateCardItemInput[];
}
