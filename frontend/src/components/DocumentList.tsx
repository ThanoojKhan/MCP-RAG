import { useDocuments } from '../hooks/useDocuments';

export const DocumentList = () => {
  const { data, isLoading, isError } = useDocuments();

  return (
    <section className="rounded-[28px] border border-black/5 bg-white/60 p-5 shadow-panel backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="font-display text-2xl text-ink">Documents</p>
        <span className="rounded-full bg-ember/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-ember">
          {data?.length ?? 0} indexed
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-sm text-ink/60">Loading documents...</p>}
        {isError && <p className="text-sm text-red-700">Could not load documents.</p>}
        {!isLoading && !data?.length && <p className="text-sm text-ink/60">No documents uploaded yet.</p>}
        {data?.map((document) => (
          <article key={document.id} className="rounded-2xl border border-ink/10 bg-white px-4 py-3">
            <p className="font-semibold text-ink">{document.title}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink/45">
              {new Date(document.createdAt).toLocaleString()}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
};
