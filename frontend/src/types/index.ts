export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
}

export type DocumentStatus = 'ready' | 'pending_embeddings';

export interface DocumentItem {
  id: string;
  title: string;
  createdAt: string;
  status: DocumentStatus;
}

export interface PaginatedDocuments {
  items: DocumentItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface UploadedDocument extends DocumentItem {
  chunkCount: number;
  warning?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}
