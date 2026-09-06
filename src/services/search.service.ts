import { mockDb, DEFAULT_FEATURED_TOPICS } from '../db/mockDb.js';
import { StudySetService } from './studySet.service.js';
import { FolderService } from './folder.service.js';
import { ClassService } from './class.service.js';
import { PrivacyLevel } from '../config/constants.js';
import {
  UnifiedSearchResult,
  ExploreRecommendationResult,
  SearchUserResult,
} from '../types/search.types.js';
import { StudySetWithDetails } from '../types/studySet.types.js';
import { FolderWithDetails } from '../types/folder.types.js';
import { ClassWithDetails } from '../types/class.types.js';

export class SearchService {
  /**
   * Universal search across StudySets, Users, Folders, and Classes
   */
  static async search(
    rawQuery: string,
    type: 'all' | 'sets' | 'users' | 'folders' | 'classes' = 'all',
    limit = 10,
    currentUserId?: string
  ): Promise<UnifiedSearchResult> {
    const q = (rawQuery || '').trim().toLowerCase();
    const queryWords = q.split(/\s+/).filter(Boolean);

    let studySets: StudySetWithDetails[] = [];
    let users: SearchUserResult[] = [];
    let folders: FolderWithDetails[] = [];
    let classes: ClassWithDetails[] = [];

    if (!q) {
      return {
        query: '',
        totalResults: 0,
        studySets: [],
        users: [],
        folders: [],
        classes: [],
      };
    }

    // 1. Search Study Sets
    if (type === 'all' || type === 'sets') {
      const matchedSetsWithScore: Array<{
        set: StudySetWithDetails;
        score: number;
      }> = [];

      for (const set of mockDb.studySets.values()) {
        // Privacy check: UNLISTED sets must never appear in global search results
        if (set.privacy === PrivacyLevel.UNLISTED) {
          continue;
        }
        if (
          set.privacy === PrivacyLevel.PRIVATE &&
          set.creatorId !== currentUserId
        ) {
          continue;
        }

        let score = 0;
        const titleLower = set.title.toLowerCase();
        const descLower = (set.description || '').toLowerCase();
        const tagsJoined = set.tags.join(' ').toLowerCase();

        // Exact match bonuses
        if (titleLower === q) score += 100;
        else if (titleLower.startsWith(q)) score += 60;
        else if (titleLower.includes(q)) score += 40;

        if (descLower.includes(q)) score += 20;

        // Tag matches
        for (const tag of set.tags) {
          if (tag.toLowerCase() === q) score += 50;
          else if (tag.toLowerCase().includes(q)) score += 25;
        }

        // Sub-card search (match card terms or definitions)
        let cardMatches = 0;
        for (const card of mockDb.cards.values()) {
          if (card.studySetId === set.id) {
            const termLower = card.term.toLowerCase();
            const defLower = card.definition.toLowerCase();
            if (termLower.includes(q) || defLower.includes(q)) {
              cardMatches += 1;
            }
          }
        }
        if (cardMatches > 0) {
          score += Math.min(cardMatches * 15, 60);
        }

        // Word-by-word matching
        for (const word of queryWords) {
          if (titleLower.includes(word)) score += 10;
          if (tagsJoined.includes(word)) score += 8;
        }

        if (score > 0) {
          const populated = StudySetService.populateSetDetails(
            set,
            currentUserId
          );
          matchedSetsWithScore.push({ set: populated, score });
        }
      }

      // Sort by score descending
      matchedSetsWithScore.sort((a, b) => b.score - a.score);
      studySets = matchedSetsWithScore.slice(0, limit).map((m) => m.set);
    }

    // 2. Search Users
    if (type === 'all' || type === 'users') {
      const matchedUsers: Array<{ user: SearchUserResult; score: number }> = [];

      for (const u of mockDb.users.values()) {
        let score = 0;
        const nameLower = u.name.toLowerCase();
        const userLower = u.username.toLowerCase();
        const bioLower = (u.bio || '').toLowerCase();

        if (userLower === q || nameLower === q) score += 100;
        else if (userLower.startsWith(q) || nameLower.startsWith(q))
          score += 50;
        else if (userLower.includes(q) || nameLower.includes(q)) score += 30;

        if (bioLower.includes(q)) score += 15;

        if (score > 0) {
          matchedUsers.push({
            user: {
              id: u.id,
              name: u.name,
              username: u.username,
              avatarUrl: u.avatarUrl,
              role: u.role,
              streakCount: u.streakCount,
              bio: u.bio,
            },
            score,
          });
        }
      }

      matchedUsers.sort((a, b) => b.score - a.score);
      users = matchedUsers.slice(0, limit).map((m) => m.user);
    }

    // 3. Search Folders
    if (type === 'all' || type === 'folders') {
      const matchedFolders: Array<{
        folder: FolderWithDetails;
        score: number;
      }> = [];

      for (const f of mockDb.folders.values()) {
        if (
          f.privacy !== PrivacyLevel.PUBLIC &&
          f.privacy !== PrivacyLevel.UNLISTED &&
          f.creatorId !== currentUserId
        ) {
          continue;
        }

        let score = 0;
        const titleLower = f.title.toLowerCase();
        const descLower = (f.description || '').toLowerCase();

        if (titleLower === q) score += 80;
        else if (titleLower.includes(q)) score += 40;
        if (descLower.includes(q)) score += 15;

        if (score > 0) {
          matchedFolders.push({
            folder: FolderService.populateFolderDetails(f, currentUserId),
            score,
          });
        }
      }

      matchedFolders.sort((a, b) => b.score - a.score);
      folders = matchedFolders.slice(0, limit).map((m) => m.folder);
    }

    // 4. Search Classes
    if (type === 'all' || type === 'classes') {
      const matchedClasses: Array<{
        cls: ClassWithDetails;
        score: number;
      }> = [];

      for (const c of mockDb.classes.values()) {
        let score = 0;
        const nameLower = c.name.toLowerCase();
        const descLower = (c.description || '').toLowerCase();
        const schoolLower = (c.schoolName || '').toLowerCase();
        const joinCodeLower = c.joinCode.toLowerCase();

        if (joinCodeLower === q) score += 120;
        if (nameLower === q) score += 80;
        else if (nameLower.includes(q)) score += 40;
        if (schoolLower.includes(q)) score += 25;
        if (descLower.includes(q)) score += 15;

        if (score > 0) {
          matchedClasses.push({
            cls: ClassService.populateClassDetails(c, currentUserId),
            score,
          });
        }
      }

      matchedClasses.sort((a, b) => b.score - a.score);
      classes = matchedClasses.slice(0, limit).map((m) => m.cls);
    }

    const totalResults =
      studySets.length + users.length + folders.length + classes.length;

    return {
      query: rawQuery,
      totalResults,
      studySets,
      users,
      folders,
      classes,
    };
  }

  /**
   * Get Explore recommendations and highlights for home discovery
   */
  static async getExploreRecommendations(
    currentUserId?: string
  ): Promise<ExploreRecommendationResult> {
    const allPublicSets: StudySetWithDetails[] = [];

    for (const set of mockDb.studySets.values()) {
      if (set.privacy === PrivacyLevel.PUBLIC) {
        allPublicSets.push(
          StudySetService.populateSetDetails(set, currentUserId, 6)
        );
      }
    }

    // 1. Trending Sets: based on view gain in the past 7 days (Top 3)
    const today = new Date();
    const last7Days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      last7Days.push(d.toISOString().split('T')[0]!);
    }

    const setsWithWeeklyGain = allPublicSets.map((s) => {
      let weeklyViews = 0;
      if (s.dailyViews) {
        for (const dateStr of last7Days) {
          weeklyViews += s.dailyViews[dateStr] || 0;
        }
      }
      return { set: s, weeklyViews };
    });

    const hasWeeklyActivity = setsWithWeeklyGain.some((x) => x.weeklyViews > 0);

    let trendingSets: StudySetWithDetails[] = [];
    if (hasWeeklyActivity) {
      trendingSets = setsWithWeeklyGain
        .sort((a, b) => {
          if (b.weeklyViews !== a.weeklyViews) {
            return b.weeklyViews - a.weeklyViews;
          }
          const scoreA =
            a.set.viewCount +
            (a.set.bookmarkCount || 0) * 50 +
            a.set.starredUserIds.length * 30;
          const scoreB =
            b.set.viewCount +
            (b.set.bookmarkCount || 0) * 50 +
            b.set.starredUserIds.length * 30;
          return scoreB - scoreA;
        })
        .map((x) => x.set);
    } else {
      // Fallback if no view gain this week: maintain top 3 sets by overall score
      trendingSets = [...allPublicSets].sort((a, b) => {
        const scoreA =
          a.viewCount +
          (a.bookmarkCount || 0) * 50 +
          a.starredUserIds.length * 30;
        const scoreB =
          b.viewCount +
          (b.bookmarkCount || 0) * 50 +
          b.starredUserIds.length * 30;
        return scoreB - scoreA;
      });
    }

    // 2. Recent sets
    const recentSets = [...allPublicSets].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 3. Featured sets: specifically marked as isFeatured by Admin
    const featuredSets = allPublicSets.filter((s) => Boolean(s.isFeatured));

    // 4. Featured topic tags curated by Admin (or defaults)
    const popularTags =
      mockDb.featuredTopics && mockDb.featuredTopics.length > 0
        ? [...mockDb.featuredTopics]
        : [...DEFAULT_FEATURED_TOPICS];

    // 5. Featured folders specifically marked as isFeatured by Admin
    const allPublicFolders = Array.from(mockDb.folders.values()).filter(
      (f) => f.privacy === PrivacyLevel.PUBLIC || !f.privacy
    );
    const featuredFolders = allPublicFolders
      .filter((f) => Boolean(f.isFeatured))
      .map((f) => FolderService.populateFolderDetails(f));

    return {
      trendingSets: trendingSets.slice(0, 6),
      featuredSets: featuredSets.slice(0, 6),
      recentSets: recentSets.slice(0, 6),
      popularTags,
      featuredFolders: featuredFolders.slice(0, 6),
    };
  }
}
