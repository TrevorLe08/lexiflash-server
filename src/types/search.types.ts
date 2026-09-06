import { StudySetWithDetails } from './studySet.types.js';
import { FolderWithDetails } from './folder.types.js';
import { ClassWithDetails } from './class.types.js';
import { UserRole } from '../config/constants.js';

export interface SearchUserResult {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  role: UserRole;
  streakCount: number;
  bio?: string;
}

export interface UnifiedSearchResult {
  query: string;
  totalResults: number;
  studySets: StudySetWithDetails[];
  users: SearchUserResult[];
  folders: FolderWithDetails[];
  classes: ClassWithDetails[];
}

export interface ExploreRecommendationResult {
  trendingSets: StudySetWithDetails[];
  featuredSets: StudySetWithDetails[];
  recentSets: StudySetWithDetails[];
  popularTags: string[];
  featuredFolders: FolderWithDetails[];
}
