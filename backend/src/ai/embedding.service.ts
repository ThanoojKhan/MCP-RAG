import { env } from '../config/env.js';
import { geminiClient } from './gemini.client.js';

export const embeddingService = {
  async embedText(input: string): Promise<number[]> {
    const response = await geminiClient.models.embedContent({
      model: env.GEMINI_EMBEDDING_MODEL,
      contents: [input],
      config: {
        outputDimensionality: env.GEMINI_EMBEDDING_DIMENSION,
      },
    });

    return response.embeddings?.[0]?.values ?? [];
  },

  async embedBatch(inputs: string[]): Promise<number[][]> {
    if (inputs.length === 0) {
      return [];
    }

    const response = await geminiClient.models.embedContent({
      model: env.GEMINI_EMBEDDING_MODEL,
      contents: inputs,
      config: {
        outputDimensionality: env.GEMINI_EMBEDDING_DIMENSION,
      },
    });

    return response.embeddings?.map((item) => item.values ?? []) ?? [];
  },
};
