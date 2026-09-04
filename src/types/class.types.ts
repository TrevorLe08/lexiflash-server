import { ClassRole, UserRole } from '../config/constants.js';
import { StudySetWithDetails } from './studySet.types.js';

export interface ClassMember {
  userId: string;
  role: ClassRole;
  joinedAt: string;
}

export interface ClassMemberDetail extends ClassMember {
  name: string;
  username: string;
  avatarUrl?: string;
  userRole: UserRole;
  streakCount: number;
}

export interface ClassGroup {
  id: string;
  name: string;
  description?: string;
  schoolName?: string;
  creatorId: string;
  joinCode: string;
  allowMemberAddSets: boolean;
  allowMemberInvite: boolean;
  members: ClassMember[];
  studySetIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ClassWithDetails extends ClassGroup {
  studySets: StudySetWithDetails[];
  creator: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string;
    role?: UserRole;
  };
  memberDetails: ClassMemberDetail[];
  memberCount: number;
  setCount: number;
  isCurrentUserMember?: boolean;
  isCurrentUserAdmin?: boolean;
}

export interface CreateClassInput {
  name: string;
  description?: string;
  schoolName?: string;
  allowMemberAddSets?: boolean;
  allowMemberInvite?: boolean;
}

export interface UpdateClassInput {
  name?: string;
  description?: string;
  schoolName?: string;
  allowMemberAddSets?: boolean;
  allowMemberInvite?: boolean;
}
