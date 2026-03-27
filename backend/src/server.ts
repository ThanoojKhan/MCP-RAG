import { initializeApplication, getApplicationHealthSnapshot } from './bootstrap.js';
import { logger } from './config/database.js';
import { env } from './config/env.js';

const startServer = async () => {
  const app = await initializeApplication();

  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, database: getApplicationHealthSnapshot() }, 'Backend server listening');
  });
};

void startServer().catch((error) => {
  logger.error({ error }, 'Failed to start server');
  process.exit(1);
});
