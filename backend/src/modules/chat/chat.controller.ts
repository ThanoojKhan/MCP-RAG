import type { Request, Response } from 'express';
import { chatRequestSchema } from './chat.service.js';
import { chatService } from './chat.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const chatController = {
  create: asyncHandler(async (request: Request, response: Response) => {
    const { question } = chatRequestSchema.parse(request.body);
    await chatService.streamChat(question, response);
  }),
};
