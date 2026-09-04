import { Request, Response, NextFunction } from 'express';

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const color =
      statusCode >= 400
        ? '\x1b[31m'
        : statusCode >= 300
          ? '\x1b[33m'
          : '\x1b[32m';
    const reset = '\x1b[0m';
    console.log(
      `[HTTP] ${method} ${originalUrl} ${color}${statusCode}${reset} - ${duration}ms`
    );
  });

  next();
};
