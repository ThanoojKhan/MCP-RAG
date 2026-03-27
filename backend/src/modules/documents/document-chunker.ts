import type { TextChunker } from '../../types/index.js';

interface TextChunkerOptions {
  chunkSize: number;
  chunkOverlap: number;
}

export const createTextChunker = ({ chunkSize, chunkOverlap }: TextChunkerOptions): TextChunker => ({
  split(content: string): string[] {
    const normalized = content.replace(/\r\n/g, '\n').trim();

    if (!normalized) {
      return [];
    }

    const chunks: string[] = [];
    let cursor = 0;

    while (cursor < normalized.length) {
      const end = Math.min(cursor + chunkSize, normalized.length);
      const chunk = normalized.slice(cursor, end).trim();

      if (chunk) {
        chunks.push(chunk);
      }

      if (end === normalized.length) {
        break;
      }

      cursor = Math.max(end - chunkOverlap, cursor + 1);
    }

    return chunks;
  },
});

export const documentChunker = createTextChunker({
  chunkSize: 900,
  chunkOverlap: 150,
});
