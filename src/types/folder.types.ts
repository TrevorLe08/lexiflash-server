import { StudySetWithDetails } from './studySet.types.js';
import { PrivacyLevel } from '../config/constants.js';

export interface Folder {
  id: string;
  title: string;
  description?: string;
  creatorId: string;
  privacy?: PrivacyLevel;
  studySetIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FolderWithDetails extends Folder {
  studySets: StudySetWithDetails[];
  creator: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string;
  };
  setCount: number;
}

export interface CreateFolderInput {
  title: string;
  description?: string;
  privacy?: PrivacyLevel;
  studySetIds?: string[];
}

export interface UpdateFolderInput {
  title?: string;
  description?: string;
  privacy?: PrivacyLevel;
}
