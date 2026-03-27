import type { Request, Response } from 'express';
import { documentsService, documentIdSchema } from './documents.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/apiError.js';

export const documentsController = {
  upload: asyncHandler(async (request: Request, response: Response) => {
    if (!request.file) {
      throw new ApiError(400, 'File is required', 'FILE_REQUIRED');
    }

    const document = await documentsService.uploadDocument(request.file);
    response.status(201).json({ success: true, data: document });
  }),

  list: asyncHandler(async (_request: Request, response: Response) => {
    const documents = await documentsService.listDocuments();
    response.json({ success: true, data: documents });
  }),

  getById: asyncHandler(async (request: Request, response: Response) => {
    const { id } = documentIdSchema.parse(request.params);
    const document = await documentsService.getDocumentById(id);
    response.json({ success: true, data: document });
  }),
};
