import { useRef, useState } from 'react';
import { useUploadDocument } from '../hooks/useDocuments';

interface DocumentUploadProps {
  onUploaded: (message: string) => void;
  onError: (message: string) => void;
}

export const DocumentUpload = ({ onUploaded, onError }: DocumentUploadProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadMutation = useUploadDocument();
  const [fileName, setFileName] = useState<string>('');

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setFileName(file.name);

    try {
      const result = await uploadMutation.mutateAsync(file);
      onUploaded(`Indexed ${result.title} into ${result.chunkCount} chunks.`);
      event.target.value = '';
      setFileName('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      onError(message);
    }
  };

  return (
    <section className="rounded-[28px] border border-black/5 bg-white/70 p-5 shadow-panel backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-2xl text-ink">Knowledge Base</p>
          <p className="mt-2 max-w-sm text-sm text-ink/70">
            Upload plain text or markdown to enrich retrieval. Each file is chunked, embedded, and stored in PostgreSQL.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90"
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? 'Uploading...' : 'Upload File'}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,text/plain,text/markdown"
        className="hidden"
        onChange={(event) => {
          void handleChange(event);
        }}
      />

      <div className="mt-4 rounded-2xl border border-dashed border-ink/10 bg-sand/80 px-4 py-3 text-sm text-ink/60">
        {fileName || 'Accepted formats: .txt and .md'}
      </div>
    </section>
  );
};
