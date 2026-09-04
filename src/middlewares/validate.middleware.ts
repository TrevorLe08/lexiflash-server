import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';
import { ApiError } from '../utils/apiError.js';

interface ParsedRequest {
  body?: unknown;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

export const validate = (schema: ZodSchema) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = (await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })) as ParsedRequest;

      // In Express 5, req.query and req.params are getters, so use Object.assign
      if (parsed.body) {
        req.body = parsed.body;
      }
      if (parsed.query && typeof parsed.query === 'object') {
        try {
          for (const key of Object.keys(parsed.query)) {
            (req.query as Record<string, unknown>)[key] = parsed.query[key];
          }
        } catch {
          // Fallback if property assignment is restricted
        }
      }
      if (parsed.params && typeof parsed.params === 'object') {
        try {
          for (const key of Object.keys(parsed.params)) {
            (req.params as Record<string, unknown>)[key] = parsed.params[key];
          }
        } catch {
          // Fallback if property assignment is restricted
        }
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((err: ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return next(ApiError.badRequest('Validation error', formattedErrors));
      }
      next(error);
    }
  };
};
