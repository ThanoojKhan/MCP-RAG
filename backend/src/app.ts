import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { chatRouter } from './modules/chat/chat.routes.js';
import { documentsRouter } from './modules/documents/documents.routes.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { requestLoggerMiddleware } from './middleware/requestLogger.middleware.js';

export const createApp = () => {
  const app = express();

  app.use(requestLoggerMiddleware);
  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: false,
    }),
  );
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  app.get('/health', (_request, response) => {
    response.json({ success: true, data: { status: 'ok' } });
  });

  app.use('/api/documents', documentsRouter);
  app.use('/api/chat', chatRouter);

  app.use(errorMiddleware);

  return app;
};
