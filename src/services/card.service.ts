import { mockDb } from '../db/mockDb.js';
import { Card, CreateCardInput, UpdateCardInput } from '../types/card.types.js';
import { generateId } from '../utils/id.js';
import { ApiError } from '../utils/apiError.js';
import { CardStudyStatus, PrivacyLevel } from '../config/constants.js';
import { UserCardProgress } from '../types/study.types.js';
import {
  isUserVip,
  countUserTotalCards,
  VIP_FREE_CARD_LIMIT,
} from '../utils/user.utils.js';

export class CardService {
  static async getCardsBySetId(
    studySetId: string,
    userId?: string,
    password?: string
  ): Promise<Card[]> {
    const set = mockDb.studySets.get(studySetId);
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

    const userStarredCardIds = new Set<string>();
    if (userId) {
      for (const p of mockDb.userCardProgress.values()) {
        if (p.userId === userId && p.isStarred) {
          userStarredCardIds.add(p.cardId);
        }
      }
    }

    const cards: Card[] = [];
    for (const c of mockDb.cards.values()) {
      if (c.studySetId === studySetId) {
        cards.push({
          ...c,
          isStarred: userStarredCardIds.has(c.id),
        });
      }
    }
    cards.sort((a, b) => a.orderIndex - b.orderIndex);
    return cards;
  }

  static async createCard(
    studySetId: string,
    input: CreateCardInput,
    userId: string
  ): Promise<Card> {
    const set = mockDb.studySets.get(studySetId);
    if (!set) {
      throw ApiError.notFound('Study set not found');
    }

    if (set.creatorId !== userId) {
      throw ApiError.forbidden(
        'You do not have permission to add cards to this set'
      );
    }

    const user = mockDb.users.get(userId);
    if (!isUserVip(user)) {
      const currentTotal = countUserTotalCards(userId);
      if (currentTotal + 1 > VIP_FREE_CARD_LIMIT) {
        throw ApiError.forbidden(
          `Tài khoản miễn phí chỉ được tạo tối đa ${VIP_FREE_CARD_LIMIT} từ vựng. Bạn hiện có ${currentTotal} từ. Vui lòng nâng cấp VIP!`
        );
      }
    }

    const existingCards = await this.getCardsBySetId(studySetId);
    const now = new Date().toISOString();
    const newCard: Card = {
      id: generateId('crd'),
      studySetId,
      term: input.term.trim(),
      definition: input.definition.trim(),
      phonetic: input.phonetic?.trim(),
      example: input.example?.trim(),
      hint: input.hint?.trim(),
      imageUrl: input.imageUrl,
      audioUrl: input.audioUrl,
      orderIndex:
        input.orderIndex !== undefined
          ? input.orderIndex
          : existingCards.length,
      createdAt: now,
      updatedAt: now,
    };

    mockDb.cards.set(newCard.id, newCard);
    set.updatedAt = now;
    mockDb.studySets.set(set.id, set);

    return newCard;
  }

  static async bulkCreateCards(
    studySetId: string,
    cardsInput: CreateCardInput[],
    userId: string
  ): Promise<Card[]> {
    const set = mockDb.studySets.get(studySetId);
    if (!set) {
      throw ApiError.notFound('Study set not found');
    }

    if (set.creatorId !== userId) {
      throw ApiError.forbidden(
        'You do not have permission to add cards to this set'
      );
    }

    const user = mockDb.users.get(userId);
    if (!isUserVip(user)) {
      const currentTotal = countUserTotalCards(userId);
      if (currentTotal + cardsInput.length > VIP_FREE_CARD_LIMIT) {
        throw ApiError.forbidden(
          `Tài khoản miễn phí chỉ được tạo tối đa ${VIP_FREE_CARD_LIMIT} từ vựng. Bạn hiện có ${currentTotal} từ, không thể thêm ${cardsInput.length} từ nữa. Vui lòng nâng cấp VIP!`
        );
      }
    }

    const existingCards = await this.getCardsBySetId(studySetId);
    let currentIndex = existingCards.length;
    const now = new Date().toISOString();
    const createdCards: Card[] = [];

    for (const input of cardsInput) {
      const newCard: Card = {
        id: generateId('crd'),
        studySetId,
        term: input.term.trim(),
        definition: input.definition.trim(),
        phonetic: input.phonetic?.trim(),
        example: input.example?.trim(),
        hint: input.hint?.trim(),
        imageUrl: input.imageUrl,
        audioUrl: input.audioUrl,
        orderIndex:
          input.orderIndex !== undefined ? input.orderIndex : currentIndex++,
        createdAt: now,
        updatedAt: now,
      };

      mockDb.cards.set(newCard.id, newCard);
      createdCards.push(newCard);
    }

    set.updatedAt = now;
    mockDb.studySets.set(set.id, set);

    return createdCards;
  }

  static async importFromText(
    studySetId: string,
    text: string,
    termSeparator = '\t',
    cardSeparator = '\n',
    userId: string
  ): Promise<Card[]> {
    const rawLines = text
      .split(cardSeparator)
      .map((l) => l.trim())
      .filter(Boolean);
    const parsedCards: CreateCardInput[] = [];

    for (const line of rawLines) {
      const parts = line.split(termSeparator);
      if (parts.length >= 2) {
        const term = parts[0]?.trim() || '';
        const definition = parts[1]?.trim() || '';
        const phonetic = parts[2]?.trim();
        const example = parts[3]?.trim();

        if (term && definition) {
          parsedCards.push({
            term,
            definition,
            phonetic,
            example,
          });
        }
      }
    }

    if (parsedCards.length === 0) {
      throw ApiError.badRequest(
        'Could not parse any cards. Please check your text and separators.'
      );
    }

    return this.bulkCreateCards(studySetId, parsedCards, userId);
  }

  static async updateCard(
    id: string,
    input: UpdateCardInput,
    userId: string
  ): Promise<Card> {
    const card = mockDb.cards.get(id);
    if (!card) {
      throw ApiError.notFound('Card not found');
    }

    const set = mockDb.studySets.get(card.studySetId);
    const user = mockDb.users.get(userId);
    const isSystemAdmin = user?.role === 'ADMIN';
    if (!set || (set.creatorId !== userId && !isSystemAdmin)) {
      throw ApiError.forbidden(
        'You do not have permission to modify this card'
      );
    }

    if (input.term !== undefined) card.term = input.term.trim();
    if (input.definition !== undefined)
      card.definition = input.definition.trim();
    if (input.phonetic !== undefined) card.phonetic = input.phonetic.trim();
    if (input.example !== undefined) card.example = input.example.trim();
    if (input.hint !== undefined) card.hint = input.hint.trim();
    if (input.imageUrl !== undefined) card.imageUrl = input.imageUrl;
    if (input.audioUrl !== undefined) card.audioUrl = input.audioUrl;
    if (input.orderIndex !== undefined) card.orderIndex = input.orderIndex;
    const now = new Date().toISOString();
    card.updatedAt = now;

    mockDb.cards.set(card.id, card);

    set.updatedAt = now;
    mockDb.studySets.set(set.id, set);

    return card;
  }

  static async deleteCard(id: string, userId: string): Promise<void> {
    const card = mockDb.cards.get(id);
    if (!card) {
      throw ApiError.notFound('Card not found');
    }

    const set = mockDb.studySets.get(card.studySetId);
    const user = mockDb.users.get(userId);
    const isSystemAdmin = user?.role === 'ADMIN';
    if (!set || (set.creatorId !== userId && !isSystemAdmin)) {
      throw ApiError.forbidden(
        'You do not have permission to delete this card'
      );
    }

    mockDb.cards.delete(id);

    // Also delete user card progress references
    for (const [progId, prog] of mockDb.userCardProgress.entries()) {
      if (prog.cardId === id) {
        mockDb.userCardProgress.delete(progId);
      }
    }

    set.updatedAt = new Date().toISOString();
    mockDb.studySets.set(set.id, set);
  }

  static async toggleStarCard(
    cardId: string,
    userId: string
  ): Promise<{ isStarred: boolean }> {
    const card = mockDb.cards.get(cardId);
    if (!card) {
      throw ApiError.notFound('Card not found');
    }

    let progress: UserCardProgress | undefined;
    for (const p of mockDb.userCardProgress.values()) {
      if (p.userId === userId && p.cardId === cardId) {
        progress = p;
        break;
      }
    }

    const now = new Date().toISOString();
    if (!progress) {
      progress = {
        id: generateId('prog'),
        userId,
        cardId,
        studySetId: card.studySetId,
        status: CardStudyStatus.NOT_STUDIED,
        repetitionNumber: 0,
        easeFactor: 2.5,
        intervalDays: 0,
        nextReviewDate: now,
        lapses: 0,
        isStarred: true,
        lastStudiedAt: now,
        createdAt: now,
        updatedAt: now,
      };
    } else {
      progress.isStarred = !progress.isStarred;
      progress.updatedAt = now;
    }

    mockDb.userCardProgress.set(progress.id, progress);
    return { isStarred: progress.isStarred };
  }
}
