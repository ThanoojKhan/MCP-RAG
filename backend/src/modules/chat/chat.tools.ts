import { z } from 'zod';
import { embeddingService } from '../../ai/embedding.service.js';
import { createToolRegistry } from '../../ai/tool.registry.js';
import { documentRepository } from '../../repositories/document.repository.js';
import { documentsService } from '../documents/documents.service.js';

const searchDocumentsInputSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(10).default(5),
});

const getDocumentByIdInputSchema = z.object({
  documentId: z.string().uuid(),
});

export const chatTools = createToolRegistry({
  search_documents: {
    description: 'Search uploaded document chunks by semantic similarity for a natural language query.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The semantic search query.' },
        limit: { type: 'number', minimum: 1, maximum: 10 },
      },
      required: ['query'],
      additionalProperties: false,
    },
    inputSchema: searchDocumentsInputSchema,
    execute: async (input: z.infer<typeof searchDocumentsInputSchema>) => {
      const { query, limit } = input;
      const embedding = await embeddingService.embedText(query);
      return documentRepository.findSimilarChunks(embedding, limit);
    },
  },
  get_document_by_id: {
    description: 'Fetch a single uploaded document by its id.',
    parameters: {
      type: 'object',
      properties: {
        documentId: { type: 'string', description: 'UUID of the document.' },
      },
      required: ['documentId'],
      additionalProperties: false,
    },
    inputSchema: getDocumentByIdInputSchema,
    execute: async (input: z.infer<typeof getDocumentByIdInputSchema>) => documentsService.getDocumentById(input.documentId),
  },
  list_documents: {
    description: 'List all uploaded documents.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    inputSchema: z.object({}),
    execute: async () => documentsService.listDocuments(),
  },
});
