import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '../services/documents';

export const useDocuments = () =>
  useQuery({
    queryKey: ['documents'],
    queryFn: documentsApi.listDocuments,
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
