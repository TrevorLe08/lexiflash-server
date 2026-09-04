import { Response } from 'express';
import { HTTP_STATUS } from '../config/constants.js';

export interface ApiResponseOptions<T> {
  statusCode?: number;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
}

export class ApiResponse {
  static success<T>(
    res: Response,
    data?: T,
    message = 'Success',
    statusCode: number = HTTP_STATUS.OK,
    meta?: Record<string, unknown>
  ) {
    return res.status(statusCode).json({
      success: true,
      statusCode,
      message,
      data,
      meta,
    });
  }

  static created<T>(
    res: Response,
    data: T,
    message = 'Resource created successfully',
    meta?: Record<string, unknown>
  ) {
    return this.success(res, data, message, HTTP_STATUS.CREATED, meta);
  }

  static noContent(res: Response) {
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  }

  static paginated<T>(
    res: Response,
    items: T[],
    pagination: Record<string, unknown>,
    message = 'Success',
    statusCode: number = HTTP_STATUS.OK
  ) {
    return res.status(statusCode).json({
      success: true,
      statusCode,
      message,
      data: {
        items,
        pagination,
      },
      meta: pagination,
    });
  }
}
