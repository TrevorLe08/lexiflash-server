import { HTTP_STATUS } from '../config/constants.js';

export class ApiError extends Error {
  public statusCode: number;
  public errors?: unknown[];
  public isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    errors?: unknown[],
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, errors?: unknown[]) {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, message, errors);
  }

  static unauthorized(message = 'Unauthorized access') {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, message);
  }

  static forbidden(message = 'Forbidden access') {
    return new ApiError(HTTP_STATUS.FORBIDDEN, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(HTTP_STATUS.NOT_FOUND, message);
  }

  static conflict(message: string) {
    return new ApiError(HTTP_STATUS.CONFLICT, message);
  }

  static unprocessable(message: string, errors?: unknown[]) {
    return new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, message, errors);
  }

  static tooManyRequests(message = 'Too many requests, please slow down') {
    return new ApiError(HTTP_STATUS.TOO_MANY_REQUESTS, message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      message,
      undefined,
      false
    );
  }
}
