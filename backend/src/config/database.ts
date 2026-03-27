import pino from 'pino';
import { Pool } from 'pg';
import { env } from './env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
});

export const database = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

database.on('error', (error) => {
  logger.error({ error }, 'Unexpected PostgreSQL pool error');
});
