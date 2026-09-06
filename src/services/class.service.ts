import { mockDb } from '../db/mockDb.js';
import {
  ClassGroup,
  ClassWithDetails,
  ClassMemberDetail,
  CreateClassInput,
  UpdateClassInput,
} from '../types/class.types.js';
import { ClassRole, UserRole, PrivacyLevel } from '../config/constants.js';
import { generateId } from '../utils/id.js';
import { ApiError } from '../utils/apiError.js';
import { StudySetService } from './studySet.service.js';
import { StudySetWithDetails } from '../types/studySet.types.js';
import { paginateArray, PaginatedResult } from '../utils/pagination.js';
import {
  isUserVip,
  countUserGroups,
  FREE_MAX_GROUPS_TOTAL,
  FREE_MAX_GROUPS_CREATED,
  VIP_GOLD_MAX_GROUPS_TOTAL,
  VIP_GOLD_MAX_GROUPS_CREATED,
} from '../utils/user.utils.js';

export class ClassService {
  static populateClassDetails(
    cl: ClassGroup,
    currentUserId?: string,
    forAdminList = false
  ): ClassWithDetails {
    const creator = mockDb.users.get(cl.creatorId);
    const userObj = currentUserId ? mockDb.users.get(currentUserId) : undefined;
    const isSystemAdmin = userObj?.role === UserRole.ADMIN || forAdminList;

    const isMember = currentUserId
      ? cl.members.some((m) => m.userId === currentUserId) ||
        cl.creatorId === currentUserId
      : false;

    const isAdmin = currentUserId
      ? cl.creatorId === currentUserId ||
        cl.members.some(
          (m) => m.userId === currentUserId && m.role === ClassRole.ADMIN
        )
      : false;

    // Can view all content if user is an actual member OR system admin
    const canViewContents = isMember || isSystemAdmin;

    const studySets: StudySetWithDetails[] = [];
    if (canViewContents) {
      for (const setId of cl.studySetIds) {
        const set = mockDb.studySets.get(setId);
        if (set) {
          studySets.push(
            StudySetService.populateSetDetails(set, currentUserId)
          );
        }
      }
    }

    const memberDetails: ClassMemberDetail[] = canViewContents
      ? cl.members.map((m) => {
          const u = mockDb.users.get(m.userId);
          return {
            userId: m.userId,
            role: m.role,
            joinedAt: m.joinedAt,
            name: u?.name || 'Anonymous Learner',
            username: u?.username || 'user',
            avatarUrl: u?.avatarUrl,
            userRole: u?.role || UserRole.USER,
            streakCount: u?.streakCount || 0,
          };
        })
      : [];

    // In detail view, only actual group members/creator see the plain join code.
    // In admin list (forAdminList), admin can see joinCode for all groups.
    const exposedJoinCode = isMember || forAdminList ? cl.joinCode : '';

    return {
      ...cl,
      joinCode: exposedJoinCode,
      studySets,
      memberDetails,
      memberCount: cl.members.length,
      setCount: cl.studySetIds.length,
      isCurrentUserMember: isMember,
      isCurrentUserAdmin: isAdmin || isSystemAdmin,
      creator: {
        id: creator?.id || cl.creatorId,
        name: creator?.name || 'Unknown User',
        username: creator?.username || 'unknown',
        avatarUrl: creator?.avatarUrl,
        role: creator?.role,
      },
    };
  }

  static async getAll(
    params: { page?: number; limit?: number; search?: string } = {},
    userId: string
  ): Promise<PaginatedResult<ClassWithDetails>> {
    const classes: ClassWithDetails[] = [];
    for (const cl of mockDb.classes.values()) {
      const isMember = cl.members.some((m) => m.userId === userId);
      if (isMember || cl.creatorId === userId) {
        classes.push(this.populateClassDetails(cl, userId));
      }
    }

    let filteredClasses = classes;
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredClasses = filteredClasses.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          (c.description && c.description.toLowerCase().includes(searchLower))
      );
    }

    return paginateArray(filteredClasses, params.page || 1, params.limit || 12);
  }

  static async getById(id: string, userId?: string): Promise<ClassWithDetails> {
    const cl = mockDb.classes.get(id);
    if (!cl) {
      throw ApiError.notFound('Class not found');
    }
    return this.populateClassDetails(cl, userId);
  }

  static async create(
    input: CreateClassInput,
    userId: string
  ): Promise<ClassWithDetails> {
    // Enforce group creation limits based on tier
    const user = mockDb.users.get(userId);
    const isVip = isUserVip(user);
    const isDiamondOrAdmin =
      user?.role === UserRole.ADMIN || (isVip && user?.vipPlan === '1_YEAR');

    if (!isDiamondOrAdmin) {
      const { totalGroups, createdGroups } = countUserGroups(userId);
      if (!isVip) {
        if (createdGroups >= FREE_MAX_GROUPS_CREATED) {
          throw ApiError.forbidden(
            `Tài khoản miễn phí chỉ được tạo tối đa ${FREE_MAX_GROUPS_CREATED} nhóm học tập. Vui lòng nâng cấp VIP!`
          );
        }
        if (totalGroups >= FREE_MAX_GROUPS_TOTAL) {
          throw ApiError.forbidden(
            `Tài khoản miễn phí chỉ được tham gia tối đa ${FREE_MAX_GROUPS_TOTAL} nhóm. Vui lòng nâng cấp VIP!`
          );
        }
      } else {
        // VIP Gold limits
        if (createdGroups >= VIP_GOLD_MAX_GROUPS_CREATED) {
          throw ApiError.forbidden(
            `Gói VIP Gold chỉ được tạo tối đa ${VIP_GOLD_MAX_GROUPS_CREATED} nhóm học tập. Hãy nâng cấp VIP Diamond để tạo không giới hạn!`
          );
        }
        if (totalGroups >= VIP_GOLD_MAX_GROUPS_TOTAL) {
          throw ApiError.forbidden(
            `Gói VIP Gold chỉ được tham gia tối đa ${VIP_GOLD_MAX_GROUPS_TOTAL} nhóm. Hãy nâng cấp VIP Diamond để tham gia không giới hạn!`
          );
        }
      }
    }

    const now = new Date().toISOString();
    const classId = generateId('cls');
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newClass: ClassGroup = {
      id: classId,
      name: input.name.trim(),
      description: input.description?.trim(),
      schoolName: input.schoolName?.trim(),
      creatorId: userId,
      joinCode,
      allowMemberAddSets: input.allowMemberAddSets ?? true,
      allowMemberInvite: input.allowMemberInvite ?? true,
      members: [
        {
          userId,
          role: ClassRole.ADMIN,
          joinedAt: now,
        },
      ],
      studySetIds: [],
      createdAt: now,
      updatedAt: now,
    };

    mockDb.classes.set(newClass.id, newClass);
    return this.populateClassDetails(newClass, userId);
  }

  static async joinByCode(
    joinCode: string,
    userId: string
  ): Promise<ClassWithDetails> {
    const upperCode = joinCode.trim().toUpperCase();
    let foundClass: ClassGroup | undefined;

    for (const cl of mockDb.classes.values()) {
      if (cl.joinCode === upperCode) {
        foundClass = cl;
        break;
      }
    }

    if (!foundClass) {
      throw ApiError.notFound('No class found matching this join code');
    }

    const alreadyJoined = foundClass.members.some((m) => m.userId === userId);
    if (alreadyJoined) {
      throw ApiError.conflict('You are already a member of this class');
    }

    // Free tier: enforce total group participation limit
    const user = mockDb.users.get(userId);
    if (!isUserVip(user)) {
      const { totalGroups } = countUserGroups(userId);
      if (totalGroups >= FREE_MAX_GROUPS_TOTAL) {
        throw ApiError.forbidden(
          `Tài khoản miễn phí chỉ được tham gia tối đa ${FREE_MAX_GROUPS_TOTAL} nhóm. Vui lòng nâng cấp VIP!`
        );
      }
    }

    foundClass.members.push({
      userId,
      role: ClassRole.MEMBER,
      joinedAt: new Date().toISOString(),
    });

    foundClass.updatedAt = new Date().toISOString();
    mockDb.classes.set(foundClass.id, foundClass);

    return this.populateClassDetails(foundClass, userId);
  }

  static async update(
    id: string,
    input: UpdateClassInput,
    userId: string
  ): Promise<ClassWithDetails> {
    const cl = mockDb.classes.get(id);
    if (!cl) {
      throw ApiError.notFound('Class not found');
    }

    const member = cl.members.find((m) => m.userId === userId);
    const isAdmin = cl.creatorId === userId || member?.role === ClassRole.ADMIN;

    if (!isAdmin) {
      throw ApiError.forbidden('Only class admins can update class details');
    }

    if (input.name !== undefined) cl.name = input.name.trim();
    if (input.description !== undefined)
      cl.description = input.description.trim();
    if (input.schoolName !== undefined) cl.schoolName = input.schoolName.trim();
    if (input.allowMemberAddSets !== undefined)
      cl.allowMemberAddSets = input.allowMemberAddSets;
    if (input.allowMemberInvite !== undefined)
      cl.allowMemberInvite = input.allowMemberInvite;

    cl.updatedAt = new Date().toISOString();
    mockDb.classes.set(cl.id, cl);

    return this.populateClassDetails(cl, userId);
  }

  static async delete(id: string, userId: string): Promise<void> {
    const cl = mockDb.classes.get(id);
    if (!cl) {
      throw ApiError.notFound('Class not found');
    }

    if (cl.creatorId !== userId) {
      throw ApiError.forbidden('Only the class creator can delete the class');
    }

    mockDb.classes.delete(id);
  }

  static async addSets(
    id: string,
    studySetIds: string[],
    userId: string
  ): Promise<ClassWithDetails> {
    const cl = mockDb.classes.get(id);
    if (!cl) {
      throw ApiError.notFound('Class not found');
    }

    const member = cl.members.find((m) => m.userId === userId);
    const isMember = cl.creatorId === userId || !!member;

    if (!isMember) {
      throw ApiError.forbidden('You are not a member of this class');
    }

    const isAdmin = cl.creatorId === userId || member?.role === ClassRole.ADMIN;
    if (!isAdmin && !cl.allowMemberAddSets) {
      throw ApiError.forbidden('Members are not allowed to add study sets');
    }

    // Add unique set IDs - only allow if set is PUBLIC or owned by current user
    const existingSetIds = new Set(cl.studySetIds);
    for (const sId of studySetIds) {
      const targetSet = mockDb.studySets.get(sId);
      if (targetSet) {
        if (
          targetSet.creatorId === userId ||
          targetSet.privacy === PrivacyLevel.PUBLIC
        ) {
          existingSetIds.add(sId);
        } else {
          throw ApiError.forbidden(
            'Cannot add private or restricted study sets owned by other users'
          );
        }
      }
    }

    cl.studySetIds = Array.from(existingSetIds);
    cl.updatedAt = new Date().toISOString();
    mockDb.classes.set(cl.id, cl);

    return this.populateClassDetails(cl, userId);
  }

  static async removeSets(
    id: string,
    studySetIds: string[],
    userId: string
  ): Promise<ClassWithDetails> {
    const cl = mockDb.classes.get(id);
    if (!cl) {
      throw ApiError.notFound('Class not found');
    }

    const member = cl.members.find((m) => m.userId === userId);
    const isAdmin = cl.creatorId === userId || member?.role === ClassRole.ADMIN;

    if (!isAdmin) {
      throw ApiError.forbidden(
        'Only class admins can remove sets from this class'
      );
    }

    const removeSet = new Set(studySetIds);
    cl.studySetIds = cl.studySetIds.filter((sId) => !removeSet.has(sId));
    cl.updatedAt = new Date().toISOString();
    mockDb.classes.set(cl.id, cl);

    return this.populateClassDetails(cl, userId);
  }
}
