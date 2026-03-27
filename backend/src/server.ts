import { createApp } from './app.js';
import { database, logger } from './config/database.js';
import { env } from './config/env.js';

const startServer = async () => {
  await database.query('SELECT 1');

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'Backend server listening');
  });
};

void startServer().catch((error) => {
  logger.error({ error }, 'Failed to start server');
  process.exit(1);
});
