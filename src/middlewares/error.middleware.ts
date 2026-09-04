import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError.js';
import { HTTP_STATUS } from '../config/constants.js';
import { ENV } from '../config/env.js';

export const errorHandler = (
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  void _next;
  let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = 'Internal Server Error';
  let errors: unknown[] | undefined = undefined;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err.name === 'SyntaxError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Malformed JSON in request payload';
  } else {
    message = err.message || message;
  }

  const responsePayload: Record<string, unknown> = {
    success: false,
    statusCode,
    message,
    errors,
  };

  if (ENV.NODE_ENV === 'development') {
    responsePayload['stack'] = err.stack;
  }

  res.status(statusCode).json(responsePayload);
};
