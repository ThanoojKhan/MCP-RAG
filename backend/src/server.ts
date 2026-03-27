import { createApp } from './app.js';
import { bootstrapDatabaseSchema, databaseConnectionInfo, getDatabaseHealth, logger, verifyDatabaseHealth } from './config/database.js';
import { env } from './config/env.js';
import { documentsService } from './modules/documents/documents.service.js';
import { ApiError } from './utils/apiError.js';

const startServer = async () => {
  logger.info({ database: databaseConnectionInfo }, 'Connecting to PostgreSQL');
  await bootstrapDatabaseSchema();
  const health = await verifyDatabaseHealth();

  if (!health.schemaReady) {
    throw new ApiError(
      503,
      `Database schema is incomplete. Missing: ${health.missingItems.join(', ')}. The application attempted automatic initialization but could not finish setup.`,
      'DATABASE_SCHEMA_INCOMPLETE',
      health,
    );
  }

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, database: getDatabaseHealth() }, 'Backend server listening');
  });

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

void startServer().catch((error) => {
  logger.error({ error }, 'Failed to start server');
  process.exit(1);
});
