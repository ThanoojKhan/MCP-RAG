import { z } from 'zod';
import { embeddingService } from '../../ai/embedding.service.js';
import { ragService } from '../../ai/rag.service.js';
import { documentRepository } from '../../repositories/document.repository.js';
import { chatTools } from './chat.tools.js';
import type { EmbeddingProvider } from '../../types/index.js';

export const chatRequestSchema = z.object({
  question: z.string().trim().min(3).max(4000),
});

interface ChatServiceDependencies {
  embeddings: EmbeddingProvider;
  repository: typeof documentRepository;
  rag: typeof ragService;
}

export const createChatService = ({ embeddings, repository, rag }: ChatServiceDependencies) => ({
  async streamChat(question: string, response: import('express').Response) {
    const queryEmbedding = await embeddings.embedText(question);
    const chunks = await repository.findSimilarChunks(queryEmbedding, 5);
    await rag.streamAnswer(question, chunks, chatTools, response);
  },
});

export const chatService = createChatService({
  embeddings: embeddingService,
  repository: documentRepository,
  rag: ragService,
});
