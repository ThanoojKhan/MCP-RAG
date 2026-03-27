import { useEffect, useRef, useState } from 'react';
import { useUploadDocument } from '../hooks/useDocuments';

interface DocumentUploadProps {
  onUploaded: (message: string) => void;
  onError: (message: string) => void;
  onWakeUpDetected: () => void;
}

export const DocumentUpload = ({ onUploaded, onError, onWakeUpDetected }: DocumentUploadProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadMutation = useUploadDocument();
  const [fileName, setFileName] = useState<string>('');

  useEffect(() => {
    if (!uploadMutation.isPending) {
      return;
    }

    const timer = window.setTimeout(() => onWakeUpDetected(), 3500);
    return () => window.clearTimeout(timer);
  }, [onWakeUpDetected, uploadMutation.isPending]);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setFileName(file.name);

    try {
      const result = await uploadMutation.mutateAsync(file);
      onUploaded(result.warning ?? `Indexed ${result.title} into ${result.chunkCount} chunks.`);
      event.target.value = '';
      setFileName('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed. Please try again.';
      onError(message);
    }
  };

  return (
    <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 text-white shadow-panel backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-2xl text-[#fff8ef]">Ingestion Bay</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-white/68">
            Upload plain text or markdown to enrich retrieval. Each file is chunked, embedded, and stored in PostgreSQL.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-full bg-[#f7c66b] px-4 py-2 text-sm font-semibold text-[#17140f] transition hover:bg-[#ffd382]"
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

      <div className="mt-4 rounded-[22px] border border-dashed border-white/15 bg-black/10 px-4 py-3 text-sm text-white/62">
        {fileName || 'Accepted formats: .txt and .md'}
      </div>
    </section>
  );
};
