import { Request, Response, NextFunction } from 'express';
import { TestService } from '../services/test.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { getParam } from '../utils/params.js';

export class TestController {
  static async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const setId = getParam(req.params['setId']);
      const userId = req.user?.userId;
      const test = await TestService.generateTest(setId, req.body, userId);
      return ApiResponse.success(res, test, 'Test generated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const testId = getParam(req.params['testId']);
      const userId = req.user!.userId;
      const { answers, timeSpentSeconds } = req.body;
      const result = await TestService.submitTest(
        testId,
        answers,
        timeSpentSeconds,
        userId
      );
      return ApiResponse.success(res, result, 'Test submitted and graded');
    } catch (error) {
      next(error);
    }
  }

  static async getHistories(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const setId = req.query['setId'] as string | undefined;
      const histories = await TestService.getTestHistories(userId, setId);
      return ApiResponse.success(res, histories, 'Test histories retrieved');
    } catch (error) {
      next(error);
    }
  }
}
