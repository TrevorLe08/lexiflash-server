import { mockDb } from '../db/mockDb.js';
import { MatchGameCard, MatchLeaderboardEntry } from '../types/match.types.js';
import { Card } from '../types/card.types.js';
import { StudyMode } from '../config/constants.js';
import { generateId } from '../utils/id.js';
import { ApiError } from '../utils/apiError.js';
import { SrsService } from './srs.service.js';

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
    pairCount = 6
  ): Promise<{ tiles: MatchGameCard[]; totalPairs: number }> {
    const set = mockDb.studySets.get(setId);
    if (!set) {
      throw ApiError.notFound('Study set not found');
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

    return {
      tiles: this.shuffle(tiles),
      totalPairs: selectedCards.length,
    };
  }

  static async submitScore(
    setId: string,
    timeRecordMs: number,
    matchedPairs: number,
    userId: string
  ): Promise<{ entry: MatchLeaderboardEntry; isNewPersonalBest: boolean }> {
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

  static async getLeaderboard(setId: string): Promise<MatchLeaderboardEntry[]> {
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
