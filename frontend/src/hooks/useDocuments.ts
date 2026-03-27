import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '../services/documents';

export const useDocuments = (page: number, pageSize: number) =>
  useQuery({
    queryKey: ['documents', page, pageSize],
    queryFn: () => documentsApi.listDocuments(page, pageSize),
    placeholderData: keepPreviousData,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

export const useUploadDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: documentsApi.uploadDocument,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};

export const useRetryDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: documentsApi.retryDocument,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};
