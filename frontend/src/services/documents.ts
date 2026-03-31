import type { ApiSuccess, PaginatedDocuments, UploadedDocument } from '../types';
import { apiClient } from './api';
import { toUserFacingErrorMessage } from './error';

export const documentsApi = {
  async listDocuments(page: number, pageSize: number): Promise<PaginatedDocuments> {
    try {
      const response = await apiClient.get<ApiSuccess<PaginatedDocuments>>('/documents', {
        params: { page, pageSize },
        timeout: 45000,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(toUserFacingErrorMessage(error, 'Unable to load documents right now.'));
    }
  },

  async uploadDocument(file: File): Promise<UploadedDocument> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post<ApiSuccess<UploadedDocument>>('/documents/upload', formData, {
        timeout: 60000,
      });

      return response.data.data;
    } catch (error) {
      throw new Error(toUserFacingErrorMessage(error, 'Upload failed. Please try again.'));
    }
  },

  async retryDocument(documentId: string): Promise<UploadedDocument> {
    try {
      const response = await apiClient.post<ApiSuccess<UploadedDocument>>(`/documents/${documentId}/retry`, undefined, {
        timeout: 60000,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(toUserFacingErrorMessage(error, 'Retry failed. Please try again.'));
    }
  },
};
