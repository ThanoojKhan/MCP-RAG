import { env } from '../config/env.js';
import { openAiClient } from './openai.client.js';

export const embeddingService = {
  async embedText(input: string): Promise<number[]> {
    const response = await openAiClient.embeddings.create({
      model: env.OPENAI_EMBEDDING_MODEL,
      input,
    });

    return response.data[0]?.embedding ?? [];
  },

  async embedBatch(inputs: string[]): Promise<number[][]> {
    if (inputs.length === 0) {
      return [];
    }

    const response = await openAiClient.embeddings.create({
      model: env.OPENAI_EMBEDDING_MODEL,
      input: inputs,
    });

    return response.data.map((item) => item.embedding);
  },
};
