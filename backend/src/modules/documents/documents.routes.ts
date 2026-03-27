import multer from 'multer';
import { Router } from 'express';
import { env } from '../../config/env.js';
import { documentsController } from './documents.controller.js';

export const documentsRouter = Router();
const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    files: 1,
  },
});

documentsRouter.get('/', documentsController.list);
documentsRouter.get('/:id', documentsController.getById);
documentsRouter.post('/upload', uploadMiddleware.single('file'), documentsController.upload);
