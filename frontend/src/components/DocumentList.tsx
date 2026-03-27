import { useEffect, useMemo, useState } from 'react';
import { useDocuments, useRetryDocument } from '../hooks/useDocuments';

const pageSize = 6;

interface DocumentListProps {
  onUploaded: (message: string) => void;
  onError: (message: string) => void;
  onWakeUpDetected: () => void;
}

export const DocumentList = ({ onUploaded, onError, onWakeUpDetected }: DocumentListProps) => {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isFetching } = useDocuments(page, pageSize);
  const retryMutation = useRetryDocument();

  const totalDocuments = data?.totalItems ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const documents = useMemo(() => data?.items ?? [], [data]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (!isLoading && !isFetching) {
      return;
    }

    const timer = window.setTimeout(() => onWakeUpDetected(), 3500);
    return () => window.clearTimeout(timer);
  }, [isFetching, isLoading, onWakeUpDetected]);

  const handleRetry = async (documentId: string) => {
    try {
      const result = await retryMutation.mutateAsync(documentId);
      onUploaded(result.warning ?? `${result.title} is now ${result.status === 'ready' ? 'ready for retrieval' : 'still pending embeddings'}.`);
    } catch (retryError) {
      onError(retryError instanceof Error ? retryError.message : 'Retry failed. Please try again.');
    }
  };

  return (
    <aside className="flex h-[720px] min-h-0 flex-col rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 text-white shadow-panel backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="font-display text-2xl text-[#fff8ef]">Indexed Library</p>
        <span className="rounded-full border border-[#64c4aa]/25 bg-[#64c4aa]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#9dd8ca]">
          {totalDocuments} indexed
        </span>
      </div>

      <p className="mt-2 text-sm leading-6 text-white/58">
        A live register of the source files available to retrieval and tool-based inspection.
      </p>

      <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-1">
        {isLoading && <p className="text-sm text-white/58">Loading documents...</p>}
        {isError && <p className="text-sm text-[#ffd0c2]">{error instanceof Error ? error.message : 'Could not load documents.'}</p>}
        {!isLoading && documents.length === 0 && <p className="text-sm text-white/58">No documents uploaded yet.</p>}
        {documents.map((document) => (
          <article key={document.id} className="rounded-[24px] border border-white/10 bg-black/10 px-4 py-4">
            <div className="flex items-start gap-3">
              <div
                className={
                  document.status === 'ready'
                    ? 'mt-1 h-2.5 w-2.5 rounded-full bg-[#64c4aa]'
                    : 'mt-1 h-2.5 w-2.5 rounded-full bg-[#f7c66b]'
                }
              />
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#fff8ef]">{document.title}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/40">
                  {new Date(document.createdAt).toLocaleString()}
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                    {document.status === 'ready' ? 'Ready for retrieval' : 'Pending embeddings'}
                  </p>
                  {document.status === 'pending_embeddings' && (
                    <button
                      type="button"
                      onClick={() => {
                        void handleRetry(document.id);
                      }}
                      disabled={retryMutation.isPending}
                      className="rounded-full border border-[#f7c66b]/20 bg-[#f7c66b]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f7c66b] transition hover:bg-[#f7c66b]/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {retryMutation.isPending ? 'Retrying' : 'Retry'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {totalDocuments > pageSize && (
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
          <p className="text-xs uppercase tracking-[0.18em] text-white/38">
            Page {page} of {totalPages}{isFetching ? ' . Refreshing' : ''}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/70 transition hover:border-white/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/70 transition hover:border-white/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
