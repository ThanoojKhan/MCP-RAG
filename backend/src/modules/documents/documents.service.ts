import { z } from 'zod';
import path from 'node:path';
import { documentRepository } from '../../repositories/document.repository.js';
import { embeddingService } from '../../ai/embedding.service.js';
import { documentChunker } from './document-chunker.js';
import { logger } from '../../config/database.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/apiError.js';
import type { ChunkInput, EmbeddingProvider, TextChunker } from '../../types/index.js';

const allowedMimeTypes = new Set([
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'application/markdown',
  'application/x-markdown',
  'application/octet-stream',
]);
const allowedExtensions = new Set(['.txt', '.md', '.markdown']);

export const documentIdSchema = z.object({
  id: z.string().uuid(),
});

export const documentsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(20).default(6),
});

interface DocumentsServiceDependencies {
  repository: typeof documentRepository;
  embeddings: EmbeddingProvider;
  chunker: TextChunker;
}

const assertSupportedFile = (file: Express.Multer.File): void => {
  const extension = path.extname(file.originalname).toLowerCase();
  const hasSupportedExtension = allowedExtensions.has(extension);
  const hasSupportedMimeType = allowedMimeTypes.has(file.mimetype);

  if (!hasSupportedExtension && !hasSupportedMimeType) {
    throw new ApiError(400, 'Only text and markdown files are supported', 'INVALID_FILE_TYPE');
  }
};

const assertTextContent = (file: Express.Multer.File): void => {
  if (file.buffer.includes(0)) {
    throw new ApiError(400, 'Binary files are not supported', 'INVALID_FILE_CONTENT');
  }
};

const readFileContent = (file: Express.Multer.File): string => {
  assertTextContent(file);
  const content = file.buffer.toString('utf-8').trim();

  if (!content) {
    throw new ApiError(400, 'Uploaded file is empty', 'EMPTY_FILE');
  }

  return content;
};

const toChunkInputs = (chunks: string[], embeddings: number[][]): ChunkInput[] =>
  chunks.map((content, index) => ({
    content,
    embedding: embeddings[index] ?? [],
  }));

const assertEmbeddingBatchShape = (chunks: string[], embeddings: number[][], expectedDimension: number): void => {
  if (embeddings.length !== chunks.length) {
    throw new ApiError(502, 'Embedding provider returned an unexpected number of embeddings', 'INVALID_EMBEDDING_BATCH');
  }

  const invalidEmbedding = embeddings.find((embedding) => embedding.length !== expectedDimension);

  if (invalidEmbedding) {
    throw new ApiError(502, 'Embedding provider returned an embedding with an unexpected dimension', 'INVALID_EMBEDDING_DIMENSION', {
      expectedDimension,
      actualDimension: invalidEmbedding.length,
    });
  }
};

const isEmbeddingProviderUnavailable = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'status' in error &&
  typeof (error as { status?: number }).status === 'number';

const buildDocumentResponse = async (repository: typeof documentRepository, documentId: string) => {
  const document = await repository.getDocumentById(documentId);

  if (!document) {
    throw new ApiError(404, 'Document not found', 'DOCUMENT_NOT_FOUND');
  }

  const chunkCount = await repository.countDocumentChunks(documentId);

  return {
    ...document,
    chunkCount,
  };
};

export const createDocumentsService = ({ repository, embeddings, chunker }: DocumentsServiceDependencies) => ({
  async processDocumentEmbeddings(documentId: string, rawContent: string) {
    const chunks = chunker.split(rawContent);

    if (chunks.length === 0) {
      throw new ApiError(400, 'No valid content chunks found', 'EMPTY_CHUNKS');
    }

    const vectorEmbeddings = await embeddings.embedBatch(chunks);
    assertEmbeddingBatchShape(chunks, vectorEmbeddings, env.GEMINI_EMBEDDING_DIMENSION);

    await repository.withTransaction(async (client) => {
      await repository.createChunks(documentId, toChunkInputs(chunks, vectorEmbeddings), client);
      await repository.updateDocumentStatus(documentId, 'ready', client);
    });

    return buildDocumentResponse(repository, documentId);
  },

  async uploadDocument(file: Express.Multer.File) {
    assertSupportedFile(file);
    const content = readFileContent(file);
    const existingDocument = await repository.getDocumentByTitle(file.originalname);

    if (existingDocument && existingDocument.status === 'ready') {
      throw new ApiError(409, 'A document with the same file name already exists', 'DUPLICATE_DOCUMENT', {
        documentId: existingDocument.id,
        title: existingDocument.title,
        status: existingDocument.status,
      });
    }

    const document = existingDocument
      ? await repository.withTransaction(async (client) => {
          await repository.deleteChunksByDocumentId(existingDocument.id, client);
          await repository.replacePendingDocumentContent(existingDocument.id, content, client);
          const refreshedDocument = await repository.getDocumentById(existingDocument.id);

          if (!refreshedDocument) {
            throw new ApiError(404, 'Document not found', 'DOCUMENT_NOT_FOUND');
          }

          return refreshedDocument;
        })
      : await repository.createDocument(file.originalname, 'pending_embeddings', content);

    try {
      return await this.processDocumentEmbeddings(document.id, content);
    } catch (error) {
      if (!isEmbeddingProviderUnavailable(error)) {
        throw error;
      }

      return {
        ...document,
        chunkCount: 0,
        warning: 'Document uploaded, but embedding generation is pending because the AI provider is currently unavailable.',
      };
    }
  },

  async retryDocumentEmbeddings(documentId: string) {
    const document = await repository.getRetryableDocumentById(documentId);

    if (!document) {
      throw new ApiError(404, 'Document not found', 'DOCUMENT_NOT_FOUND');
    }

    if (!document.rawContent) {
      throw new ApiError(
        409,
        'This document was uploaded before raw content storage was enabled. Please re-upload it once to enable retries.',
        'DOCUMENT_REUPLOAD_REQUIRED',
      );
    }

    if (document.status === 'ready') {
      return buildDocumentResponse(repository, document.id);
    }

    return this.processDocumentEmbeddings(document.id, document.rawContent);
  },

  async retryPendingDocuments(limit = 5) {
    const documents = await repository.listPendingDocuments(limit);

    let processed = 0;

    for (const document of documents) {
      if (!document.rawContent) {
        continue;
      }

      try {
        await this.processDocumentEmbeddings(document.id, document.rawContent);
        processed += 1;
      } catch (error) {
        if (isEmbeddingProviderUnavailable(error)) {
          logger.warn({ documentId: document.id, title: document.title }, 'Embedding retry deferred because provider is unavailable');
          break;
        }

        logger.error({ error, documentId: document.id, title: document.title }, 'Failed to retry document embeddings');
      }
    }

    return { processed };
  },

  async listDocuments(page: number, pageSize: number) {
    return repository.listDocuments(page, pageSize);
  },

  async getDocumentById(documentId: string) {
    const document = await repository.getDocumentById(documentId);

    if (!document) {
      throw new ApiError(404, 'Document not found', 'DOCUMENT_NOT_FOUND');
    }

    return document;
  },
});

export const documentsService = createDocumentsService({
  repository: documentRepository,
  embeddings: embeddingService,
  chunker: documentChunker,
});
