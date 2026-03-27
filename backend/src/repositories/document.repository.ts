import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { database } from '../config/database.js';
import type { DocumentRecord, DocumentChunkRecord, RetrievedChunk } from '../types/index.js';

const embeddingLiteral = (embedding: number[]): string => `[${embedding.join(',')}]`;

export const documentRepository = {
  async createDocument(title: string, client?: PoolClient): Promise<DocumentRecord> {
    const executor = client ?? database;
    const result = await executor.query<DocumentRecord>(
      `INSERT INTO documents (id, title) VALUES ($1, $2) RETURNING id, title, created_at AS "createdAt"`,
      [randomUUID(), title],
    );

    return result.rows[0] as DocumentRecord;
  },

  async createChunks(documentId: string, chunks: Array<{ content: string; embedding: number[] }>, client?: PoolClient): Promise<void> {
    if (chunks.length === 0) {
      return;
    }

    const executor = client ?? database;
    const values: string[] = [];
    const params: Array<string> = [];

    chunks.forEach((chunk, index) => {
      const offset = index * 4;
      values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}::vector)`);
      params.push(randomUUID(), documentId, chunk.content, embeddingLiteral(chunk.embedding));
    });

    await executor.query(
      `INSERT INTO document_chunks (id, document_id, content, embedding) VALUES ${values.join(', ')}`,
      params,
    );
  },

  async listDocuments(): Promise<DocumentRecord[]> {
    const result = await database.query<DocumentRecord>(
      `SELECT id, title, created_at AS "createdAt" FROM documents ORDER BY created_at DESC`,
    );

    return result.rows;
  },

  async getDocumentById(documentId: string): Promise<DocumentRecord | null> {
    const result = await database.query<DocumentRecord>(
      `SELECT id, title, created_at AS "createdAt" FROM documents WHERE id = $1 LIMIT 1`,
      [documentId],
    );

    return result.rows[0] ?? null;
  },

  async findSimilarChunks(embedding: number[], limit: number): Promise<RetrievedChunk[]> {
    const result = await database.query<RetrievedChunk>(
      `
        SELECT
          dc.id,
          dc.document_id AS "documentId",
          dc.content,
          1 - (dc.embedding <=> $1::vector) AS similarity
        FROM document_chunks dc
        ORDER BY dc.embedding <=> $1::vector
        LIMIT $2
      `,
      [embeddingLiteral(embedding), limit],
    );

    return result.rows;
  },

  async countDocumentChunks(documentId: string): Promise<number> {
    const result = await database.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM document_chunks WHERE document_id = $1`,
      [documentId],
    );

    return Number(result.rows[0]?.count ?? '0');
  },

  async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};
