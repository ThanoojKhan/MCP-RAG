export interface DocumentRecord {
  id: string;
  title: string;
  createdAt: string;
}

export interface DocumentChunkRecord {
  id: string;
  documentId: string;
  content: string;
}

export interface ChunkInput {
  content: string;
  embedding: number[];
}

export interface RetrievedChunk extends DocumentChunkRecord {
  similarity: number;
}

export interface ToolDefinition<TInput> {
  description: string;
  parameters: Record<string, unknown>;
  inputSchema: import('zod').ZodType<TInput>;
  execute(input: TInput): Promise<unknown>;
}

export type ToolRegistry = Record<string, ToolDefinition<unknown>>;

export interface ToolExecutionResult {
  toolName: string;
  result: unknown;
}

export interface ToolRegistryRuntime {
  definitions: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>;
  execute: (name: string, rawArguments: string) => Promise<ToolExecutionResult>;
}

export interface ToolCallMessage {
  id: string;
  name: string;
  arguments: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCallMessage[];
}

export interface EmbeddingProvider {
  embedText: (input: string) => Promise<number[]>;
  embedBatch: (inputs: string[]) => Promise<number[][]>;
}

export interface TextChunker {
  split: (content: string) => string[];
}
