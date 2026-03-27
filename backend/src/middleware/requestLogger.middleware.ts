import type { NextFunction, Request, Response } from 'express';
import { logger } from '../config/database.js';

export const requestLoggerMiddleware = (request: Request, response: Response, next: NextFunction): void => {
  const start = Date.now();

  response.on('finish', () => {
    logger.info(
      {
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
        durationMs: Date.now() - start,
      },
      'Incoming request completed',
    );
  });

  next();
};
