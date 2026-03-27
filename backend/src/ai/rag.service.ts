import type { Response } from 'express';
import { env } from '../config/env.js';
import { geminiClient } from './gemini.client.js';
import type { RetrievedChunk, ToolRegistryRuntime } from '../types/index.js';

const systemPrompt = `You are AI Knowledge Assistant. Answer using retrieved context when it is relevant. If the answer is missing or ambiguous, say so clearly. Use tools when they can improve factual accuracy or help inspect uploaded documents. Keep answers concise and practical.`;

interface GeminiFunctionCall {
  name: string;
  args?: Record<string, unknown>;
}

const formatContext = (chunks: RetrievedChunk[]): string =>
  chunks
    .map(
      (chunk, index) =>
        `Context ${index + 1} | documentId=${chunk.documentId} | chunkId=${chunk.id} | score=${chunk.similarity.toFixed(3)}\n${chunk.content}`,
    )
    .join('\n\n');

const buildPrompt = (question: string, contextChunks: RetrievedChunk[], toolOutputs?: Array<{ tool: string; result: unknown }>): string => {
  const sections = [
    systemPrompt,
    `Retrieved context:\n${formatContext(contextChunks) || 'No context retrieved.'}`,
    `User question:\n${question}`,
  ];

  if (toolOutputs?.length) {
    sections.push(
      `Tool outputs:\n${toolOutputs.map((entry) => `${entry.tool}: ${JSON.stringify(entry.result)}`).join('\n\n')}`,
    );
  }

  return sections.join('\n\n');
};

const writeSseEvent = (response: Response, payload: Record<string, unknown>): void => {
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const toGeminiTools = (tools: ToolRegistryRuntime) => [
  {
    functionDeclarations: tools.definitions.map((definition) => ({
      name: definition.name,
      description: definition.description,
      parameters: definition.parameters,
    })),
  },
];

const extractFunctionCalls = (response: unknown): GeminiFunctionCall[] => {
  if (typeof response !== 'object' || response === null || !('functionCalls' in response)) {
    return [];
  }

  const functionCalls = (response as { functionCalls?: unknown }).functionCalls;

  if (!Array.isArray(functionCalls)) {
    return [];
  }

  return functionCalls.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null || !('name' in entry)) {
      return [];
    }

    const call = entry as { name?: unknown; args?: unknown };

    if (typeof call.name !== 'string') {
      return [];
    }

    return [
      {
        name: call.name,
        args: typeof call.args === 'object' && call.args !== null ? (call.args as Record<string, unknown>) : {},
      },
    ];
  });
};

const extractText = (response: unknown): string => {
  if (typeof response !== 'object' || response === null || !('text' in response)) {
    return '';
  }

  const text = (response as { text?: unknown }).text;
  return typeof text === 'string' ? text : '';
};

export const ragService = {
  async streamAnswer(question: string, contextChunks: RetrievedChunk[], tools: ToolRegistryRuntime, response: Response): Promise<void> {
    const prompt = buildPrompt(question, contextChunks);
    const toolSelection = await geminiClient.models.generateContent({
      model: env.GEMINI_CHAT_MODEL,
      contents: prompt,
      config: {
        temperature: 0.2,
        tools: toGeminiTools(tools),
      },
    });

    const functionCalls = extractFunctionCalls(toolSelection);
    const toolOutputs: Array<{ tool: string; result: unknown }> = [];

    for (const functionCall of functionCalls) {
      const execution = await tools.execute(functionCall.name, JSON.stringify(functionCall.args ?? {}));
      toolOutputs.push({
        tool: execution.toolName,
        result: execution.result,
      });
    }

    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders();

    const stream = await geminiClient.models.generateContentStream({
      model: env.GEMINI_CHAT_MODEL,
      contents: buildPrompt(question, contextChunks, toolOutputs),
      config: {
        temperature: 0.2,
      },
    });

    try {
      let hasContent = false;

      for await (const chunk of stream) {
        const content = extractText(chunk);

        if (content) {
          hasContent = true;
          writeSseEvent(response, { type: 'token', content });
        }
      }

      if (!hasContent) {
        const fallbackText = extractText(toolSelection);

        if (fallbackText) {
          writeSseEvent(response, { type: 'token', content: fallbackText });
        }
      }

      writeSseEvent(response, { type: 'done' });
      response.end();
    } catch (error) {
      writeSseEvent(response, { type: 'error', message: 'Streaming failed' });
      response.end();
      throw error;
    }
  },
};
