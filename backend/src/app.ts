import cors from 'cors';
import express from 'express';
import helmetModule from 'helmet';
import rateLimitModule from 'express-rate-limit';
import { getDatabaseHealth } from './config/database.js';
import { env } from './config/env.js';
import { chatRouter } from './modules/chat/chat.routes.js';
import { documentsRouter } from './modules/documents/documents.routes.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { requestLoggerMiddleware } from './middleware/requestLogger.middleware.js';

const helmet = ('default' in helmetModule ? helmetModule.default : helmetModule) as typeof import('helmet').default;
const rateLimit = ('default' in rateLimitModule
  ? rateLimitModule.default
  : rateLimitModule) as typeof import('express-rate-limit').default;

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
    const database = getDatabaseHealth();
    const status = database.connected && database.schemaReady ? 'ok' : 'degraded';

    response.status(status === 'ok' ? 200 : 503).json({
      success: true,
      data: {
        status,
        database,
      },
    });
  });

  app.use('/api/documents', documentsRouter);
  app.use('/api/chat', chatRouter);

  app.use(errorMiddleware);

  return app;
};
