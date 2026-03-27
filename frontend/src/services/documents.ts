import type { ApiSuccess, DocumentItem, UploadedDocument } from '../types';
import { apiClient } from './api';

export const documentsApi = {
  async listDocuments(): Promise<DocumentItem[]> {
    const response = await apiClient.get<ApiSuccess<DocumentItem[]>>('/documents');
    return response.data.data;
  },

  async uploadDocument(file: File): Promise<UploadedDocument> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<ApiSuccess<UploadedDocument>>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  },
};
