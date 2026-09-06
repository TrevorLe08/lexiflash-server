import { Request, Response, NextFunction } from 'express';
import { CardService } from '../services/card.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { getParam } from '../utils/params.js';

export class CardController {
  static async getCardsBySetId(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const setId = getParam(req.params['setId']);
      const userId = req.user?.userId;
      const password = req.query['password'] as string | undefined;
      const cards = await CardService.getCardsBySetId(setId, userId, password);
      return ApiResponse.success(res, cards, 'Cards retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async createCard(req: Request, res: Response, next: NextFunction) {
    try {
      const setId = getParam(req.params['setId']);
      const userId = req.user!.userId;
      const card = await CardService.createCard(setId, req.body, userId);
      return ApiResponse.created(res, card, 'Card created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async bulkCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const setId = getParam(req.params['setId']);
      const userId = req.user!.userId;
      const cards = await CardService.bulkCreateCards(
        setId,
        req.body.cards,
        userId
      );
      return ApiResponse.created(
        res,
        cards,
        `${cards.length} cards created successfully`
      );
    } catch (error) {
      next(error);
    }
  }

  static async importFromText(req: Request, res: Response, next: NextFunction) {
    try {
      const setId = getParam(req.params['setId']);
      const userId = req.user!.userId;
      const { text, termSeparator, cardSeparator } = req.body;
      const cards = await CardService.importFromText(
        setId,
        text,
        termSeparator,
        cardSeparator,
        userId
      );
      return ApiResponse.created(
        res,
        cards,
        `Imported ${cards.length} cards successfully`
      );
    } catch (error) {
      next(error);
    }
  }

  static async updateCard(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params['id']);
      const userId = req.user!.userId;
      const updated = await CardService.updateCard(id, req.body, userId);
      return ApiResponse.success(res, updated, 'Card updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteCard(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params['id']);
      const userId = req.user!.userId;
      await CardService.deleteCard(id, userId);
      return ApiResponse.success(res, null, 'Card deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async toggleStar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req.params['id']);
      const userId = req.user!.userId;
      const result = await CardService.toggleStarCard(id, userId);
      return ApiResponse.success(
        res,
        result,
        result.isStarred ? 'Card starred for review' : 'Card unstarred'
      );
    } catch (error) {
      next(error);
    }
  }
}
