import pino from 'pino';
import { Pool } from 'pg';
import { env } from './env.js';

const databaseUrl = new URL(env.DATABASE_URL);
const sslMode = databaseUrl.searchParams.get('sslmode');
const isLocalDatabase = ['localhost', '127.0.0.1'].includes(databaseUrl.hostname);

const resolveSslConfig = (): boolean | { rejectUnauthorized: boolean } => {
  if (sslMode === 'disable') {
    return false;
  }

  if (sslMode === 'require') {
    return { rejectUnauthorized: false };
  }

  return isLocalDatabase ? false : { rejectUnauthorized: false };
};

export const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

export const database = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: resolveSslConfig(),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: true,
});

database.on('error', (error) => {
  logger.error({ error }, 'Unexpected PostgreSQL pool error');
});

export const databaseConnectionInfo = {
  host: databaseUrl.hostname,
  port: databaseUrl.port || '5432',
  database: databaseUrl.pathname.replace(/^\//, ''),
  sslMode: sslMode ?? (isLocalDatabase ? 'disable' : 'implicit-require'),
};

export interface DatabaseHealth {
  connected: boolean;
  schemaReady: boolean;
  missingItems: string[];
}

let databaseHealth: DatabaseHealth = {
  connected: false,
  schemaReady: false,
  missingItems: ['database_connection'],
};

export const getDatabaseHealth = (): DatabaseHealth => databaseHealth;

const bootstrapStatements = [
  'CREATE EXTENSION IF NOT EXISTS vector',
  `
    CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ready',
      raw_content TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `ALTER TABLE documents ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ready'`,
  `ALTER TABLE documents ADD COLUMN IF NOT EXISTS raw_content TEXT`,
  'CREATE UNIQUE INDEX IF NOT EXISTS documents_title_unique_idx ON documents (LOWER(title))',
  `
    CREATE TABLE IF NOT EXISTS document_chunks (
      id UUID PRIMARY KEY,
      document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      embedding VECTOR(1536) NOT NULL
    )
  `,
  'CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx ON document_chunks (document_id)',
  `
    CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
      ON document_chunks USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
  `,
];

export const bootstrapDatabaseSchema = async (): Promise<void> => {
  const client = await database.connect();

  try {
    for (const statement of bootstrapStatements) {
      await client.query(statement);
    }
  } finally {
    client.release();
  }
};

export const verifyDatabaseHealth = async (): Promise<DatabaseHealth> => {
  await database.query('SELECT 1');

  const schemaResult = await database.query<{
    documentsTable: string | null;
    documentChunksTable: string | null;
    vectorExtension: boolean;
  }>(`
    SELECT
      to_regclass('public.documents')::text AS "documentsTable",
      to_regclass('public.document_chunks')::text AS "documentChunksTable",
      EXISTS (
        SELECT 1
        FROM pg_extension
        WHERE extname = 'vector'
      ) AS "vectorExtension"
  `);

  const row = schemaResult.rows[0];
  const missingItems: string[] = [];

  if (!row?.documentsTable) {
    missingItems.push('documents table');
  }

  if (!row?.documentChunksTable) {
    missingItems.push('document_chunks table');
  }

  if (!row?.vectorExtension) {
    missingItems.push('vector extension');
  }

  databaseHealth = {
    connected: true,
    schemaReady: missingItems.length === 0,
    missingItems,
  };

  return databaseHealth;
};
