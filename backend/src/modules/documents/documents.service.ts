import { z } from 'zod';
import { documentRepository } from '../../repositories/document.repository.js';
import { embeddingService } from '../../ai/embedding.service.js';
import { documentChunker } from './document-chunker.js';
import { ApiError } from '../../utils/apiError.js';
import type { ChunkInput, EmbeddingProvider, TextChunker } from '../../types/index.js';

const allowedMimeTypes = new Set(['text/plain', 'text/markdown', 'text/x-markdown']);

export const documentIdSchema = z.object({
  id: z.string().uuid(),
});

interface DocumentsServiceDependencies {
  repository: typeof documentRepository;
  embeddings: EmbeddingProvider;
  chunker: TextChunker;
}

const assertSupportedFile = (file: Express.Multer.File): void => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    throw new ApiError(400, 'Only text and markdown files are supported', 'INVALID_FILE_TYPE');
  }
};

const readFileContent = (file: Express.Multer.File): string => {
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

export const createDocumentsService = ({ repository, embeddings, chunker }: DocumentsServiceDependencies) => ({
  async uploadDocument(file: Express.Multer.File) {
    assertSupportedFile(file);
    const content = readFileContent(file);
    const chunks = chunker.split(content);

    if (chunks.length === 0) {
      throw new ApiError(400, 'No valid content chunks found', 'EMPTY_CHUNKS');
    }

    const vectorEmbeddings = await embeddings.embedBatch(chunks);

    const document = await repository.withTransaction(async (client) => {
      const created = await repository.createDocument(file.originalname, client);
      await repository.createChunks(created.id, toChunkInputs(chunks, vectorEmbeddings), client);
      return created;
    });

    const chunkCount = await repository.countDocumentChunks(document.id);

    return {
      ...document,
      chunkCount,
    };
  },

  async listDocuments() {
    return repository.listDocuments();
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
