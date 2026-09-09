import { mockDb } from '../db/mockDb.js';
import {
  StudySet,
  StudySetWithDetails,
  CreateStudySetInput,
  UpdateStudySetInput,
  StudyLevel,
} from '../types/studySet.types.js';
import { Card } from '../types/card.types.js';
import { PrivacyLevel } from '../config/constants.js';
import { generateId } from '../utils/id.js';
import { ApiError } from '../utils/apiError.js';
import { paginateArray, PaginatedResult } from '../utils/pagination.js';
import {
  isUserVip,
  countUserTotalCards,
  VIP_FREE_CARD_LIMIT,
} from '../utils/user.utils.js';

export class StudySetService {
  static populateSetDetails(
    set: StudySet,
    currentUserId?: string,
    maxCards?: number
  ): StudySetWithDetails {
    const creator = mockDb.users.get(set.creatorId);

    // Get starred card IDs for current user if logged in
    const userStarredCardIds = new Set<string>();
    if (currentUserId) {
      for (const p of mockDb.userCardProgress.values()) {
        if (p.userId === currentUserId && p.isStarred) {
          userStarredCardIds.add(p.cardId);
        }
      }
    }

    // Get all cards for this set, ordered by orderIndex
    const allCards: Card[] = [];
    for (const c of mockDb.cards.values()) {
      if (c.studySetId === set.id) {
        allCards.push({
          ...c,
          isStarred: userStarredCardIds.has(c.id),
        });
      }
    }
    allCards.sort((a, b) => a.orderIndex - b.orderIndex);

    const cards =
      typeof maxCards === 'number' && maxCards > 0
        ? allCards.slice(0, maxCards)
        : allCards;

    const user = currentUserId ? mockDb.users.get(currentUserId) : undefined;
    const isBookmarked = currentUserId
      ? (set.bookmarkedUserIds &&
          set.bookmarkedUserIds.includes(currentUserId)) ||
        (user?.bookmarkedSetIds && user.bookmarkedSetIds.includes(set.id))
      : false;

    const starredList = set.starredUserIds || [];
    const bookmarkedList = set.bookmarkedUserIds || [];

    const { password: _password, ...cleanSet } = set;

    return {
      ...cleanSet,
      hasPassword: Boolean(_password),
      cards,
      cardCount: allCards.length,
      level: set.level || 'INTERMEDIATE',
      tags: set.tags || [],
      starredUserIds: starredList,
      bookmarkedUserIds: bookmarkedList,
      creator: {
        id: creator?.id || set.creatorId,
        name: creator?.name || 'Unknown User',
        username: creator?.username || 'unknown',
        avatarUrl: creator?.avatarUrl,
        role: creator?.role,
      },
      isStarredByCurrentUser: currentUserId
        ? starredList.includes(currentUserId)
        : false,
      isBookmarked: Boolean(isBookmarked),
      bookmarkCount: bookmarkedList.length,
    };
  }

  static async getAll(
    params: {
      page?: number;
      limit?: number;
      search?: string;
      tag?: string;
      level?: StudyLevel | '';
      creatorId?: string;
      onlyMine?: boolean;
      onlyStarred?: boolean;
      onlyBookmarked?: boolean;
      sortBy?: 'createdAt' | 'viewCount' | 'title';
      sortOrder?: 'asc' | 'desc';
    } = {},
    currentUserId?: string
  ): Promise<PaginatedResult<StudySetWithDetails>> {
    let sets = Array.from(mockDb.studySets.values());

    // Filter by visibility / privacy
    sets = sets.filter((set) => {
      if (
        params.onlyMine ||
        (params.creatorId && params.creatorId === currentUserId)
      ) {
        return set.creatorId === currentUserId;
      }
      if (params.onlyStarred || params.onlyBookmarked) {
        if (set.creatorId === currentUserId) return true;
        return (
          set.privacy === PrivacyLevel.PUBLIC ||
          set.privacy === PrivacyLevel.UNLISTED
        );
      }
      if (params.creatorId) {
        return (
          set.creatorId === params.creatorId &&
          set.privacy === PrivacyLevel.PUBLIC
        );
      }
      // General public feed / explore / browsing: only PUBLIC sets
      return set.privacy === PrivacyLevel.PUBLIC;
    });

    // Filter by creator
    if (params.creatorId) {
      sets = sets.filter((s) => s.creatorId === params.creatorId);
    }

    // Filter by onlyMine
    if (params.onlyMine && currentUserId) {
      sets = sets.filter((s) => s.creatorId === currentUserId);
    }

    // Filter by onlyStarred
    if (params.onlyStarred && currentUserId) {
      sets = sets.filter(
        (s) => s.starredUserIds && s.starredUserIds.includes(currentUserId)
      );
    }

    // Filter by onlyBookmarked
    if (params.onlyBookmarked && currentUserId) {
      const user = mockDb.users.get(currentUserId);
      const bookmarkedIds = new Set([
        ...(user?.bookmarkedSetIds || []),
        ...sets
          .filter((s) => s.bookmarkedUserIds?.includes(currentUserId))
          .map((s) => s.id),
      ]);
      sets = sets.filter((s) => bookmarkedIds.has(s.id));
    }

    // Filter by Level
    if (params.level && params.level !== 'ALL') {
      sets = sets.filter((s) => (s.level || 'INTERMEDIATE') === params.level);
    }

    // Filter by Tag
    if (params.tag && params.tag.trim() !== '') {
      const tagLower = params.tag.trim().toLowerCase();
      sets = sets.filter(
        (s) =>
          s.tags &&
          s.tags.some((t) => (t || '').toLowerCase().includes(tagLower))
      );
    }

    // Search query
    if (params.search && params.search.trim() !== '') {
      const q = params.search.trim().toLowerCase();
      sets = sets.filter(
        (s) =>
          (s.title || '').toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q)) ||
          (s.tags && s.tags.some((t) => (t || '').toLowerCase().includes(q)))
      );
    }

    // Sort
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';

    sets.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'createdAt') {
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'viewCount') {
        comparison = (a.viewCount || 0) - (b.viewCount || 0);
      } else if (sortBy === 'title') {
        comparison = (a.title || '').localeCompare(b.title || '');
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const detailedSets = sets.map((s) =>
      this.populateSetDetails(s, currentUserId, 6)
    );
    return paginateArray(detailedSets, params.page, params.limit || 6);
  }

  private static recentViews = new Map<string, number>();

  static async getById(
    id: string,
    currentUserId?: string,
    password?: string,
    viewerKey?: string
  ): Promise<StudySetWithDetails> {
    const set = mockDb.studySets.get(id);
    if (!set) {
      throw ApiError.notFound('Study set not found');
    }

    // Privacy check
    const isOwner = currentUserId && set.creatorId === currentUserId;
    if (!isOwner) {
      if (set.privacy === PrivacyLevel.PRIVATE) {
        throw ApiError.forbidden('This study set is private');
      }
      if (set.privacy === PrivacyLevel.PASSWORD) {
        if (!password || password !== set.password) {
          throw ApiError.forbidden(
            'Invalid password for this protected study set'
          );
        }
      }
    }

    // Deduplicate view count: only increment if not viewed TODAY by same client/user (anti-buff)
    const today = new Date().toISOString().split('T')[0]!;
    const viewDateKey = `${viewerKey || currentUserId || 'guest'}_${id}_${today}`;
    if (!this.recentViews.has(viewDateKey)) {
      set.viewCount = (set.viewCount || 0) + 1;
      if (!set.dailyViews) {
        set.dailyViews = {};
      }
      set.dailyViews[today] = (set.dailyViews[today] || 0) + 1;

      // Database Optimization: Rolling window - keep only the last 30 days of dailyViews
      const dateKeys = Object.keys(set.dailyViews);
      if (dateKeys.length > 30) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffDateStr = thirtyDaysAgo.toISOString().split('T')[0]!;

        const trimmed: Record<string, number> = {};
        for (const k of dateKeys) {
          if (k >= cutoffDateStr) {
            trimmed[k] = set.dailyViews[k]!;
          }
        }
        set.dailyViews = trimmed;
      }

      this.recentViews.set(viewDateKey, Date.now());
      mockDb.studySets.set(set.id, set);
    }

    return this.populateSetDetails(set, currentUserId);
  }

  static async create(
    input: CreateStudySetInput,
    userId: string
  ): Promise<StudySetWithDetails> {
    const user = mockDb.users.get(userId);
    const cardsToCreate = input.cards?.length || 0;
    if (!isUserVip(user) && cardsToCreate > 0) {
      const currentTotal = countUserTotalCards(userId);
      if (currentTotal + cardsToCreate > VIP_FREE_CARD_LIMIT) {
        throw ApiError.forbidden(
          `Tài khoản miễn phí chỉ được tạo tối đa ${VIP_FREE_CARD_LIMIT} từ vựng. Bạn hiện có ${currentTotal} từ, không thể thêm ${cardsToCreate} từ nữa. Vui lòng nâng cấp VIP!`
        );
      }
    }

    const now = new Date().toISOString();
    const setId = generateId('set');

    const newSet: StudySet = {
      id: setId,
      title: input.title,
      description: input.description,
      privacy: input.privacy || PrivacyLevel.PUBLIC,
      password: input.password,
      level: input.level || 'INTERMEDIATE',
      sourceLanguage: input.sourceLanguage || 'en',
      targetLanguage: input.targetLanguage || 'vi',
      creatorId: userId,
      tags: input.tags || [],
      viewCount: 0,
      starredUserIds: [],
      bookmarkedUserIds: [],
      createdAt: now,
      updatedAt: now,
    };

    mockDb.studySets.set(newSet.id, newSet);

    // Create cards if provided
    if (input.cards && input.cards.length > 0) {
      input.cards.forEach((cardInput, idx) => {
        const cardId = generateId('crd');
        const newCard: Card = {
          id: cardId,
          studySetId: setId,
          term: cardInput.term,
          definition: cardInput.definition,
          phonetic: cardInput.phonetic,
          example: cardInput.example,
          hint: cardInput.hint,
          imageUrl: cardInput.imageUrl,
          audioUrl: cardInput.audioUrl,
          orderIndex:
            cardInput.orderIndex !== undefined ? cardInput.orderIndex : idx,
          createdAt: now,
          updatedAt: now,
        };
        mockDb.cards.set(newCard.id, newCard);
      });
    }

    return this.populateSetDetails(newSet, userId);
  }

  static async update(
    id: string,
    input: UpdateStudySetInput,
    userId: string
  ): Promise<StudySetWithDetails> {
    const set = mockDb.studySets.get(id);
    if (!set) {
      throw ApiError.notFound('Study set not found');
    }

    const user = mockDb.users.get(userId);
    const isSystemAdmin = user?.role === 'ADMIN';

    if (set.creatorId !== userId && !isSystemAdmin) {
      throw ApiError.forbidden('You can only edit your own study sets');
    }

    if (input.title !== undefined) set.title = input.title;
    if (input.description !== undefined) set.description = input.description;
    if (input.privacy !== undefined) set.privacy = input.privacy;
    if (input.password !== undefined) set.password = input.password;
    if (input.level !== undefined) set.level = input.level;
    if (input.sourceLanguage !== undefined)
      set.sourceLanguage = input.sourceLanguage;
    if (input.targetLanguage !== undefined)
      set.targetLanguage = input.targetLanguage;
    if (input.tags !== undefined) set.tags = input.tags;

    // Handle cards sync (add, update, delete)
    if (input.cards !== undefined) {
      const creator = mockDb.users.get(set.creatorId);
      if (!isUserVip(creator) && !isSystemAdmin) {
        let otherCardsCount = 0;
        for (const c of mockDb.cards.values()) {
          const s = mockDb.studySets.get(c.studySetId);
          if (s && s.creatorId === set.creatorId && s.id !== id) {
            otherCardsCount++;
          }
        }
        if (otherCardsCount + input.cards.length > VIP_FREE_CARD_LIMIT) {
          throw ApiError.forbidden(
            `Tài khoản miễn phí chỉ được tạo tối đa ${VIP_FREE_CARD_LIMIT} từ vựng. Bạn hiện có ${otherCardsCount} từ ở các học phần khác, không thể lưu ${input.cards.length} từ vào học phần này. Vui lòng nâng cấp VIP!`
          );
        }
      }

      const incomingCardIds = new Set(
        input.cards.filter((c) => c.id).map((c) => c.id as string)
      );

      // 1. Delete cards from DB that are not in incoming cards
      for (const [cardId, existingCard] of mockDb.cards.entries()) {
        if (existingCard.studySetId === id && !incomingCardIds.has(cardId)) {
          mockDb.cards.delete(cardId);
          for (const [progId, prog] of mockDb.userCardProgress.entries()) {
            if (prog.cardId === cardId) {
              mockDb.userCardProgress.delete(progId);
            }
          }
        }
      }

      // 2. Update existing cards or create new ones
      const now = new Date().toISOString();
      input.cards.forEach((cardInput, idx) => {
        if (cardInput.id && mockDb.cards.has(cardInput.id)) {
          const existing = mockDb.cards.get(cardInput.id)!;
          existing.term = cardInput.term.trim();
          existing.definition = cardInput.definition.trim();
          if (cardInput.phonetic !== undefined)
            existing.phonetic = cardInput.phonetic.trim();
          if (cardInput.example !== undefined)
            existing.example = cardInput.example.trim();
          if (cardInput.hint !== undefined)
            existing.hint = cardInput.hint.trim();
          if (cardInput.imageUrl !== undefined)
            existing.imageUrl = cardInput.imageUrl;
          if (cardInput.audioUrl !== undefined)
            existing.audioUrl = cardInput.audioUrl;
          existing.orderIndex =
            cardInput.orderIndex !== undefined ? cardInput.orderIndex : idx;
          existing.updatedAt = now;
          mockDb.cards.set(existing.id, existing);
        } else {
          const newCard: Card = {
            id: generateId('crd'),
            studySetId: id,
            term: cardInput.term.trim(),
            definition: cardInput.definition.trim(),
            phonetic: cardInput.phonetic?.trim(),
            example: cardInput.example?.trim(),
            hint: cardInput.hint?.trim(),
            imageUrl: cardInput.imageUrl,
            audioUrl: cardInput.audioUrl,
            orderIndex:
              cardInput.orderIndex !== undefined ? cardInput.orderIndex : idx,
            createdAt: now,
            updatedAt: now,
          };
          mockDb.cards.set(newCard.id, newCard);
        }
      });
    }

    set.updatedAt = new Date().toISOString();

    mockDb.studySets.set(set.id, set);
    return this.populateSetDetails(set, userId);
  }

  static async delete(id: string, userId: string): Promise<void> {
    const set = mockDb.studySets.get(id);
    if (!set) {
      throw ApiError.notFound('Study set not found');
    }

    const user = mockDb.users.get(userId);
    const isSystemAdmin = user?.role === 'ADMIN';

    if (set.creatorId !== userId && !isSystemAdmin) {
      throw ApiError.forbidden('You can only delete your own study sets');
    }

    // 1. Delete study set
    mockDb.studySets.delete(id);

    // 2. Cascade delete associated cards
    for (const [cardId, card] of mockDb.cards.entries()) {
      if (card.studySetId === id) {
        mockDb.cards.delete(cardId);
      }
    }

    // 3. Cascade delete user card progress
    for (const [progId, prog] of mockDb.userCardProgress.entries()) {
      if (prog.studySetId === id) {
        mockDb.userCardProgress.delete(progId);
      }
    }

    // 4. Cascade delete test histories
    for (const [hisId, his] of mockDb.testHistories.entries()) {
      if (his.studySetId === id) {
        mockDb.testHistories.delete(hisId);
      }
    }

    // 5. Cascade delete study sessions
    for (const [sessId, sess] of mockDb.studySessions.entries()) {
      if (sess.studySetId === id) {
        mockDb.studySessions.delete(sessId);
      }
    }

    // 6. Cascade delete match leaderboards
    for (const [mId, mEntry] of mockDb.matchLeaderboards.entries()) {
      if (mEntry.studySetId === id) {
        mockDb.matchLeaderboards.delete(mId);
      }
    }

    // 7. Remove from folders
    for (const folder of mockDb.folders.values()) {
      if (folder.studySetIds && folder.studySetIds.includes(id)) {
        folder.studySetIds = folder.studySetIds.filter((sId) => sId !== id);
        mockDb.folders.set(folder.id, folder);
      }
    }

    // 8. Remove from classes
    for (const cl of mockDb.classes.values()) {
      if (cl.studySetIds && cl.studySetIds.includes(id)) {
        cl.studySetIds = cl.studySetIds.filter((sId) => sId !== id);
        mockDb.classes.set(cl.id, cl);
      }
    }

    // 9. Remove from bookmarked study sets of users
    for (const u of mockDb.users.values()) {
      if (u.bookmarkedSetIds && u.bookmarkedSetIds.includes(id)) {
        u.bookmarkedSetIds = u.bookmarkedSetIds.filter((sId) => sId !== id);
        mockDb.users.set(u.id, u);
      }
    }
  }

  static async clone(id: string, userId: string): Promise<StudySetWithDetails> {
    const sourceSet = await this.getById(id, userId);
    const now = new Date().toISOString();
    const newSetId = generateId('set');

    const clonedSet: StudySet = {
      id: newSetId,
      title: `${sourceSet.title} (Copy)`,
      description: sourceSet.description,
      privacy: PrivacyLevel.PUBLIC,
      level: sourceSet.level || 'INTERMEDIATE',
      sourceLanguage: sourceSet.sourceLanguage,
      targetLanguage: sourceSet.targetLanguage,
      creatorId: userId,
      tags: [...sourceSet.tags],
      viewCount: 0,
      starredUserIds: [],
      bookmarkedUserIds: [],
      createdAt: now,
      updatedAt: now,
    };

    mockDb.studySets.set(clonedSet.id, clonedSet);

    // Clone all cards
    sourceSet.cards.forEach((card, idx) => {
      const newCardId = generateId('crd');
      const clonedCard: Card = {
        ...card,
        id: newCardId,
        studySetId: newSetId,
        orderIndex: idx,
        createdAt: now,
        updatedAt: now,
      };
      mockDb.cards.set(clonedCard.id, clonedCard);
    });

    return this.populateSetDetails(clonedSet, userId);
  }

  static async toggleStar(
    id: string,
    userId: string
  ): Promise<{ isStarred: boolean; starCount: number }> {
    const set = mockDb.studySets.get(id);
    if (!set) {
      throw ApiError.notFound('Study set not found');
    }

    if (!set.starredUserIds) {
      set.starredUserIds = [];
    }

    const index = set.starredUserIds.indexOf(userId);
    let isStarred = false;

    if (index === -1) {
      set.starredUserIds.push(userId);
      isStarred = true;
    } else {
      set.starredUserIds.splice(index, 1);
      isStarred = false;
    }

    set.updatedAt = new Date().toISOString();
    mockDb.studySets.set(set.id, set);

    return { isStarred, starCount: set.starredUserIds.length };
  }

  static async toggleBookmark(
    id: string,
    userId: string
  ): Promise<{ isBookmarked: boolean; bookmarkCount: number }> {
    const set = mockDb.studySets.get(id);
    if (!set) {
      throw ApiError.notFound('Study set not found');
    }

    if (!set.bookmarkedUserIds) {
      set.bookmarkedUserIds = [];
    }

    const user = mockDb.users.get(userId);
    if (user && !user.bookmarkedSetIds) {
      user.bookmarkedSetIds = [];
    }

    const setIndex = set.bookmarkedUserIds.indexOf(userId);
    let isBookmarked = false;

    if (setIndex === -1) {
      set.bookmarkedUserIds.push(userId);
      if (user && !user.bookmarkedSetIds?.includes(id)) {
        user.bookmarkedSetIds?.push(id);
      }
      isBookmarked = true;
    } else {
      set.bookmarkedUserIds.splice(setIndex, 1);
      if (user && user.bookmarkedSetIds) {
        const uIdx = user.bookmarkedSetIds.indexOf(id);
        if (uIdx !== -1) user.bookmarkedSetIds.splice(uIdx, 1);
      }
      isBookmarked = false;
    }

    set.updatedAt = new Date().toISOString();
    mockDb.studySets.set(set.id, set);
    if (user) mockDb.users.set(user.id, user);

    return { isBookmarked, bookmarkCount: set.bookmarkedUserIds.length };
  }

  static async getBookmarkedSets(
    userId: string
  ): Promise<StudySetWithDetails[]> {
    const user = mockDb.users.get(userId);
    const userBookmarkedIds = new Set(user?.bookmarkedSetIds || []);

    const sets = Array.from(mockDb.studySets.values()).filter(
      (s) =>
        userBookmarkedIds.has(s.id) ||
        (s.bookmarkedUserIds && s.bookmarkedUserIds.includes(userId))
    );

    return sets.map((s) => this.populateSetDetails(s, userId));
  }
}
