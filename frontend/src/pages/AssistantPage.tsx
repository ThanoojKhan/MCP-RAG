import { useState } from 'react';
import { ChatWindow } from '../components/ChatWindow';
import { DocumentList } from '../components/DocumentList';
import { DocumentUpload } from '../components/DocumentUpload';

export const AssistantPage = () => {
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <div className="space-y-6">
          <div className="rounded-[32px] bg-ink px-6 py-8 text-sand shadow-panel">
            <p className="text-xs uppercase tracking-[0.24em] text-sand/60">Production RAG Stack</p>
            <h1 className="mt-4 font-display text-4xl leading-tight">Ground your assistant in trusted internal knowledge.</h1>
            <p className="mt-4 text-sm text-sand/75">
              Upload source material, retrieve semantically relevant chunks, and answer with OpenAI plus backend tools.
            </p>
          </div>
          <DocumentUpload
            onUploaded={(message) => setToast({ type: 'success', message })}
            onError={(message) => setToast({ type: 'error', message })}
          />
          <DocumentList />
        </div>

        <div className="space-y-4">
          {toast && (
            <div
              className={
                toast.type === 'success'
                  ? 'rounded-2xl border border-pine/20 bg-pine/10 px-4 py-3 text-sm text-pine'
                  : 'rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'
              }
            >
              {toast.message}
            </div>
          )}
          <ChatWindow onError={(message) => setToast({ type: 'error', message })} />
        </div>
      </section>
    </main>
  );
};
