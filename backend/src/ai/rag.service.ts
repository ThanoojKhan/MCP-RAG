import type { Response } from 'express';
import type OpenAI from 'openai';
import { env } from '../config/env.js';
import { openAiClient } from './openai.client.js';
import type { ChatMessage, RetrievedChunk, ToolRegistryRuntime } from '../types/index.js';

const systemPrompt = `You are AI Knowledge Assistant. Answer using retrieved context when it is relevant. If the answer is missing or ambiguous, say so clearly. Use tools when they can improve factual accuracy or help inspect uploaded documents. Keep answers concise and practical.`;

const formatContext = (chunks: RetrievedChunk[]): string =>
  chunks
    .map(
      (chunk, index) =>
        `Context ${index + 1} | documentId=${chunk.documentId} | chunkId=${chunk.id} | score=${chunk.similarity.toFixed(3)}\n${chunk.content}`,
    )
    .join('\n\n');

const toOpenAiMessages = (messages: ChatMessage[]): OpenAI.Chat.Completions.ChatCompletionMessageParam[] =>
  messages.map((message) => {
    switch (message.role) {
      case 'system':
        return {
          role: 'system',
          content: message.content,
        };
      case 'user':
        return {
          role: 'user',
          content: message.content,
        };
      case 'assistant':
        return {
          role: 'assistant',
          content: message.content,
          ...(message.toolCalls
            ? {
                tool_calls: message.toolCalls.map((toolCall) => ({
                  id: toolCall.id,
                  type: 'function' as const,
                  function: {
                    name: toolCall.name,
                    arguments: toolCall.arguments,
                  },
                })),
              }
            : {}),
        };
      case 'tool':
        return {
          role: 'tool',
          content: message.content,
          tool_call_id: message.toolCallId ?? '',
        };
    }
  });

const buildSystemMessage = (contextChunks: RetrievedChunk[]): ChatMessage => ({
  role: 'system',
  content: `${systemPrompt}\n\nRetrieved context:\n${formatContext(contextChunks) || 'No context retrieved.'}`,
});

const buildInitialMessages = (question: string, contextChunks: RetrievedChunk[]): ChatMessage[] => [
  buildSystemMessage(contextChunks),
  {
    role: 'user',
    content: question,
  },
];

const executeToolCalls = async (
  toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[],
  tools: ToolRegistryRuntime,
): Promise<ChatMessage[]> => {
  const messages: ChatMessage[] = [];

  for (const toolCall of toolCalls) {
    const execution = await tools.execute(toolCall.function.name, toolCall.function.arguments);
    messages.push({
      role: 'tool',
      name: execution.toolName,
      toolCallId: toolCall.id,
      content: JSON.stringify(execution.result),
    });
  }

  return messages;
};

const writeSseEvent = (response: Response, payload: Record<string, unknown>): void => {
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
};

export const ragService = {
  async runToolSelection(question: string, contextChunks: RetrievedChunk[], tools: ToolRegistryRuntime): Promise<ChatMessage[]> {
    const messages = buildInitialMessages(question, contextChunks);
    const response = await openAiClient.chat.completions.create({
      model: env.OPENAI_CHAT_MODEL,
      messages: toOpenAiMessages(messages),
      tools: tools.definitions,
      tool_choice: 'auto',
      temperature: 0.2,
    });
    const choice = response.choices[0]?.message;

    if (!choice) {
      return messages;
    }

    messages.push({
      role: 'assistant',
      content: choice.content ?? '',
      toolCalls: choice.tool_calls?.map((toolCall) => ({
        id: toolCall.id,
        name: toolCall.function.name,
        arguments: toolCall.function.arguments,
      })),
    });

    if (!choice.tool_calls?.length) {
      return messages;
    }

    const toolMessages = await executeToolCalls(choice.tool_calls, tools);
    return [...messages, ...toolMessages];
  },

  async streamAnswer(question: string, contextChunks: RetrievedChunk[], tools: ToolRegistryRuntime, response: Response): Promise<void> {
    const messages = await this.runToolSelection(question, contextChunks, tools);

    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders();

    const stream = await openAiClient.chat.completions.create({
      model: env.OPENAI_CHAT_MODEL,
      stream: true,
      temperature: 0.2,
      messages: toOpenAiMessages([
        buildSystemMessage(contextChunks),
        ...messages.filter((message) => message.role !== 'system'),
      ]),
    });

    try {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;

        if (content) {
          writeSseEvent(response, { type: 'token', content });
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
