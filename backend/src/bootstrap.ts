import type { Express } from 'express';
import { createApp } from './app.js';
import { bootstrapDatabaseSchema, databaseConnectionInfo, getDatabaseHealth, isVercelEnvironment, logger, verifyDatabaseHealth } from './config/database.js';
import { env } from './config/env.js';
import { documentsService } from './modules/documents/documents.service.js';
import { ApiError } from './utils/apiError.js';

let backgroundRetryStarted = false;
let initializationPromise: Promise<Express> | null = null;

const startBackgroundRetryWorker = (): void => {
  if (backgroundRetryStarted || isVercelEnvironment) {
    return;
  }

  backgroundRetryStarted = true;

  setInterval(() => {
    void documentsService
      .retryPendingDocuments()
      .then(({ processed }) => {
        if (processed > 0) {
          logger.info({ processed }, 'Retried pending document embeddings');
        }
      })
      .catch((error) => {
        logger.error({ error }, 'Background embedding retry failed');
      });
  }, env.EMBEDDING_RETRY_INTERVAL_MS);
};

export const initializeApplication = async (): Promise<Express> => {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    logger.info({ database: databaseConnectionInfo }, 'Connecting to PostgreSQL');

    if (!isVercelEnvironment) {
      await bootstrapDatabaseSchema();
    }

    const health = await verifyDatabaseHealth();

    if (!health.schemaReady) {
      throw new ApiError(
        503,
        `Database schema is incomplete. Missing: ${health.missingItems.join(', ')}. The application attempted automatic initialization but could not finish setup.`,
        'DATABASE_SCHEMA_INCOMPLETE',
        health,
      );
    }

    if (!isVercelEnvironment) {
      startBackgroundRetryWorker();
    } else {
      logger.info('Running in Vercel environment: skipping startup schema bootstrap and background retry worker');
    }

    return createApp();
  })().catch((error) => {
    initializationPromise = null;
    throw error;
  });

  return initializationPromise;
};

export const getApplicationHealthSnapshot = () => getDatabaseHealth();
