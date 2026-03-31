import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { logger } from '../config/database.js';
import { ApiError } from '../utils/apiError.js';

interface PostgresError {
  code?: string;
  detail?: string;
}

interface AiProviderError {
  status?: number;
  code?: string | null;
  type?: string | null;
  error?: {
    message?: string;
    code?: string | null;
    type?: string | null;
  };
}

const isPostgresError = (error: unknown): error is PostgresError =>
  typeof error === 'object' && error !== null && 'code' in error;

const isAiProviderError = (error: unknown): error is AiProviderError =>
  typeof error === 'object' && error !== null && 'status' in error;

export const errorMiddleware = (error: unknown, _request: Request, response: Response, _next: NextFunction): void => {
  if (response.headersSent) {
    logger.error({ error }, 'Unhandled error after response headers were sent');
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      success: false,
      error: {
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: error.flatten(),
      },
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    response.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
      },
    });
    return;
  }

  if (isPostgresError(error) && error.code === '42P01') {
    logger.error({ error }, 'Database schema is missing');
    response.status(503).json({
      success: false,
      error: {
        message: 'Database tables are missing. Run the database initialization script and try again.',
        code: 'DATABASE_SCHEMA_MISSING',
      },
    });
    return;
  }

  if (isPostgresError(error) && error.code === '23505') {
    response.status(409).json({
      success: false,
      error: {
        message: 'A document with the same file name already exists',
        code: 'DUPLICATE_DOCUMENT',
      },
    });
    return;
  }

  if (isAiProviderError(error)) {
    const errorCode = error.error?.code ?? error.code ?? 'AI_PROVIDER_ERROR';
    const message =
      errorCode === 'insufficient_quota'
        ? 'AI provider quota has been exceeded. Please check billing or try again later.'
        : error.error?.message ?? 'The AI provider is currently unavailable.';

    response.status(error.status ?? 502).json({
      success: false,
      error: {
        message,
        code: errorCode,
      },
    });
    return;
  }

  if (error instanceof ApiError) {
    response.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        details: error.details,
      },
    });
    return;
  }

  logger.error({ error }, 'Unhandled application error');

  response.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    },
  });
};
