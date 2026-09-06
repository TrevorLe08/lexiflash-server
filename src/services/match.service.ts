import { mockDb } from '../db/mockDb.js';
import {
  MatchGameCard,
  MatchLeaderboardEntry,
  MatchTilesResponse,
} from '../types/match.types.js';
import { Card } from '../types/card.types.js';
import { StudyMode, PrivacyLevel } from '../config/constants.js';
import { generateId } from '../utils/id.js';
import { ApiError } from '../utils/apiError.js';
import { SrsService } from './srs.service.js';

interface ActiveMatchSession {
  sessionId: string;
  setId: string;
  userId?: string;
  startedAt: number;
  pairCount: number;
}

const activeMatchSessions = new Map<string, ActiveMatchSession>();

export class MatchService {
  static shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = temp;
    }
    return arr;
  }

  static async getMatchTiles(
    setId: string,
    pairCount = 6,
    userId?: string,
    password?: string
  ): Promise<MatchTilesResponse> {
    const set = mockDb.studySets.get(setId);
    if (!set) {
      throw ApiError.notFound('Study set not found');
    }

    const isOwner = userId && set.creatorId === userId;
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

    const cards: Card[] = [];
    for (const c of mockDb.cards.values()) {
      if (c.studySetId === setId) {
        cards.push(c);
      }
    }

    if (cards.length < 2) {
      throw ApiError.badRequest(
        'Set needs at least 2 cards to play match game'
      );
    }

    const selectedCards = this.shuffle(cards).slice(
      0,
      Math.min(pairCount, cards.length)
    );
    const tiles: MatchGameCard[] = [];

    selectedCards.forEach((card) => {
      tiles.push({
        id: generateId('tile_t'),
        cardId: card.id,
        type: 'term',
        content: card.term,
      });
      tiles.push({
        id: generateId('tile_d'),
        cardId: card.id,
        type: 'definition',
        content: card.definition,
      });
    });

    const sessionToken = generateId('m_sess');
    activeMatchSessions.set(sessionToken, {
      sessionId: sessionToken,
      setId,
      userId,
      startedAt: Date.now(),
      pairCount: selectedCards.length,
    });

    return {
      tiles: this.shuffle(tiles),
      totalPairs: selectedCards.length,
      sessionToken,
    };
  }

  static async submitScore(
    setId: string,
    timeRecordMs: number,
    matchedPairs: number,
    userId: string,
    sessionToken?: string
  ): Promise<{ entry: MatchLeaderboardEntry; isNewPersonalBest: boolean }> {
    if (!sessionToken) {
      throw ApiError.badRequest('Valid match session token is required');
    }

    const session = activeMatchSessions.get(sessionToken);
    if (!session) {
      throw ApiError.badRequest(
        'Invalid or expired match session. Please restart match game.'
      );
    }

    if (session.setId !== setId) {
      throw ApiError.badRequest('Session does not match requested study set');
    }

    // Invalidate session immediately to prevent replay attacks
    activeMatchSessions.delete(sessionToken);

    // Minimum plausible human threshold: at least 250ms per pair, minimum 1000ms
    const minPlausibleMs = Math.max(1000, matchedPairs * 250);
    if (timeRecordMs < minPlausibleMs) {
      throw ApiError.badRequest(
        'Score rejected: completion time is below human physiological limits'
      );
    }

    // Verify wall-clock duration on server (skip in test environment)
    const isTestEnv = process.env.NODE_ENV === 'test';
    if (!isTestEnv) {
      const serverElapsedMs = Date.now() - session.startedAt;
      if (serverElapsedMs < minPlausibleMs) {
        throw ApiError.badRequest(
          'Score rejected: elapsed server time too short'
        );
      }
      if (timeRecordMs > serverElapsedMs + 5000) {
        throw ApiError.badRequest(
          'Score rejected: reported time inconsistent with session duration'
        );
      }
    }

    const set = mockDb.studySets.get(setId);
    if (!set) {
      throw ApiError.notFound('Study set not found');
    }

    const user = mockDb.users.get(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Check if existing score for this user on this set
    let existingEntry: MatchLeaderboardEntry | undefined;
    for (const e of mockDb.matchLeaderboards.values()) {
      if (e.studySetId === setId && e.userId === userId) {
        existingEntry = e;
        break;
      }
    }

    let isNewPersonalBest = false;
    const now = new Date().toISOString();
    let finalEntry: MatchLeaderboardEntry;

    if (!existingEntry) {
      isNewPersonalBest = true;
      finalEntry = {
        id: generateId('lead'),
        studySetId: setId,
        userId,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          avatarUrl: user.avatarUrl,
        },
        timeRecordMs,
        matchedPairs,
        createdAt: now,
      };
      mockDb.matchLeaderboards.set(finalEntry.id, finalEntry);
    } else {
      if (timeRecordMs < existingEntry.timeRecordMs) {
        isNewPersonalBest = true;
        existingEntry.timeRecordMs = timeRecordMs;
        existingEntry.matchedPairs = matchedPairs;
        existingEntry.createdAt = now;
        mockDb.matchLeaderboards.set(existingEntry.id, existingEntry);
      }
      finalEntry = existingEntry;
    }

    // Record study session
    await SrsService.recordSession(userId, {
      studySetId: setId,
      mode: StudyMode.MATCH,
      cardsTotal: matchedPairs,
      cardsCorrect: matchedPairs,
      cardsIncorrect: 0,
      timeSpentSeconds: Math.round(timeRecordMs / 1000),
    });

    return {
      entry: finalEntry,
      isNewPersonalBest,
    };
  }

  static async getLeaderboard(
    setId: string,
    userId?: string
  ): Promise<MatchLeaderboardEntry[]> {
    const set = mockDb.studySets.get(setId);
    if (!set) {
      throw ApiError.notFound('Study set not found');
    }
    const isOwner = userId && set.creatorId === userId;
    if (!isOwner && set.privacy === PrivacyLevel.PRIVATE) {
      throw ApiError.forbidden('This study set is private');
    }

    const entries: MatchLeaderboardEntry[] = [];
    for (const e of mockDb.matchLeaderboards.values()) {
      if (e.studySetId === setId) {
        entries.push(e);
      }
    }

    // Sort by fastest time first
    entries.sort((a, b) => a.timeRecordMs - b.timeRecordMs);
    return entries.slice(0, 20);
  }
}
