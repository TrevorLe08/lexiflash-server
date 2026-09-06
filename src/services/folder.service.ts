import { mockDb } from '../db/mockDb.js';
import {
  Folder,
  FolderWithDetails,
  CreateFolderInput,
  UpdateFolderInput,
} from '../types/folder.types.js';
import { generateId } from '../utils/id.js';
import { ApiError } from '../utils/apiError.js';
import { StudySetService } from './studySet.service.js';
import { StudySetWithDetails } from '../types/studySet.types.js';
import { paginateArray, PaginatedResult } from '../utils/pagination.js';
import { PrivacyLevel } from '../config/constants.js';

export class FolderService {
  static populateFolderDetails(
    folder: Folder,
    currentUserId?: string
  ): FolderWithDetails {
    const creator = mockDb.users.get(folder.creatorId);
    const studySets: StudySetWithDetails[] = [];

    for (const setId of folder.studySetIds) {
      const set = mockDb.studySets.get(setId);
      if (set) {
        studySets.push(StudySetService.populateSetDetails(set, currentUserId));
      }
    }

    return {
      ...folder,
      studySets,
      setCount: studySets.length,
      creator: {
        id: creator?.id || folder.creatorId,
        name: creator?.name || 'Unknown User',
        username: creator?.username || 'unknown',
        avatarUrl: creator?.avatarUrl,
      },
    };
  }

  static async getAll(
    params: { page?: number; limit?: number; search?: string } = {},
    currentUserId?: string
  ): Promise<PaginatedResult<FolderWithDetails>> {
    const folders: FolderWithDetails[] = [];
    for (const f of mockDb.folders.values()) {
      if (currentUserId && f.creatorId === currentUserId) {
        folders.push(this.populateFolderDetails(f, currentUserId));
      } else if (!currentUserId) {
        folders.push(this.populateFolderDetails(f));
      }
    }

    let filteredFolders = folders;
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredFolders = filteredFolders.filter(
        (folder) =>
          folder.title.toLowerCase().includes(searchLower) ||
          (folder.description &&
            folder.description.toLowerCase().includes(searchLower))
      );
    }

    return paginateArray(filteredFolders, params.page || 1, params.limit || 12);
  }

  static async getById(
    id: string,
    currentUserId?: string
  ): Promise<FolderWithDetails> {
    const folder = mockDb.folders.get(id);
    if (!folder) {
      throw ApiError.notFound('Folder not found');
    }
    return this.populateFolderDetails(folder, currentUserId);
  }

  static async create(
    input: CreateFolderInput,
    userId: string
  ): Promise<FolderWithDetails> {
    const now = new Date().toISOString();
    const folderId = generateId('fld');

    // Filter valid set IDs - only allow if set is PUBLIC or owned by user
    const validSetIds = (input.studySetIds || []).filter((sId) => {
      const targetSet = mockDb.studySets.get(sId);
      return (
        targetSet &&
        (targetSet.creatorId === userId ||
          targetSet.privacy === PrivacyLevel.PUBLIC)
      );
    });

    const newFolder: Folder = {
      id: folderId,
      title: input.title.trim(),
      description: input.description?.trim(),
      creatorId: userId,
      studySetIds: validSetIds,
      createdAt: now,
      updatedAt: now,
    };

    mockDb.folders.set(newFolder.id, newFolder);
    return this.populateFolderDetails(newFolder, userId);
  }

  static async update(
    id: string,
    input: UpdateFolderInput,
    userId: string
  ): Promise<FolderWithDetails> {
    const folder = mockDb.folders.get(id);
    if (!folder) {
      throw ApiError.notFound('Folder not found');
    }

    if (folder.creatorId !== userId) {
      throw ApiError.forbidden('You can only update your own folders');
    }

    if (input.title !== undefined) folder.title = input.title.trim();
    if (input.description !== undefined)
      folder.description = input.description.trim();
    folder.updatedAt = new Date().toISOString();

    mockDb.folders.set(folder.id, folder);
    return this.populateFolderDetails(folder, userId);
  }

  static async delete(id: string, userId: string): Promise<void> {
    const folder = mockDb.folders.get(id);
    if (!folder) {
      throw ApiError.notFound('Folder not found');
    }

    if (folder.creatorId !== userId) {
      throw ApiError.forbidden('You can only delete your own folders');
    }

    mockDb.folders.delete(id);
  }

  static async addSets(
    folderId: string,
    setIds: string[],
    userId: string
  ): Promise<FolderWithDetails> {
    const folder = mockDb.folders.get(folderId);
    if (!folder) {
      throw ApiError.notFound('Folder not found');
    }

    if (folder.creatorId !== userId) {
      throw ApiError.forbidden('You can only modify your own folders');
    }

    for (const setId of setIds) {
      const targetSet = mockDb.studySets.get(setId);
      if (targetSet) {
        if (
          targetSet.creatorId === userId ||
          targetSet.privacy === PrivacyLevel.PUBLIC
        ) {
          if (!folder.studySetIds.includes(setId)) {
            folder.studySetIds.push(setId);
          }
        } else {
          throw ApiError.forbidden(
            'Cannot add private or restricted study sets owned by other users'
          );
        }
      }
    }

    folder.updatedAt = new Date().toISOString();
    mockDb.folders.set(folder.id, folder);
    return this.populateFolderDetails(folder, userId);
  }

  static async removeSets(
    folderId: string,
    setIds: string[],
    userId: string
  ): Promise<FolderWithDetails> {
    const folder = mockDb.folders.get(folderId);
    if (!folder) {
      throw ApiError.notFound('Folder not found');
    }

    if (folder.creatorId !== userId) {
      throw ApiError.forbidden('You can only modify your own folders');
    }

    folder.studySetIds = folder.studySetIds.filter(
      (id) => !setIds.includes(id)
    );
    folder.updatedAt = new Date().toISOString();
    mockDb.folders.set(folder.id, folder);

    return this.populateFolderDetails(folder, userId);
  }
}
