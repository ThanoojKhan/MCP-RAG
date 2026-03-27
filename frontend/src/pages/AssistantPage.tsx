import { useState } from 'react';
import { BackendWakeupModal } from '../components/BackendWakeupModal';
import { ChatWindow } from '../components/ChatWindow';
import { DocumentList } from '../components/DocumentList';
import { DocumentUpload } from '../components/DocumentUpload';

export const AssistantPage = () => {
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isWakeupModalOpen, setIsWakeupModalOpen] = useState(false);

  return (
    <main className="relative mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <BackendWakeupModal
        isOpen={isWakeupModalOpen}
        onReady={() => {
          setIsWakeupModalOpen(false);
          setToast({ type: 'success', message: 'Backend is awake and ready again.' });
        }}
      />

      <section className="mb-6 grid gap-4 lg:grid-cols-[1.4fr,0.9fr]">
        <div className="overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,rgba(10,16,24,0.96),rgba(20,25,34,0.84)),radial-gradient(circle_at_top_left,rgba(255,196,107,0.18),transparent_30%)] p-6 shadow-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-[#f7c66b]/70">Knowledge Flight Deck</p>
              <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight text-[#fff8ef] sm:text-5xl">
                Ask sharper questions against your own indexed knowledge.
              </h1>
            </div>
            <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#9dd8ca] sm:block">
              RAG + Tools
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-sm leading-6 text-[#d8d4cb] sm:text-base">
            Bring internal notes, markdown playbooks, and technical references into one retrieval layer. The assistant
            grounds responses in vector search and can inspect backend tools when a plain completion is not enough.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-[#f7c66b]/20 bg-[#f7c66b]/8 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[#f7c66b]/70">Retrieval</p>
              <p className="mt-3 text-2xl font-semibold text-[#fff3dc]">Top 5</p>
              <p className="mt-1 text-sm text-[#d1c8b4]">semantic chunks per query</p>
            </div>
            <div className="rounded-[24px] border border-[#64c4aa]/20 bg-[#64c4aa]/8 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[#64c4aa]/70">Grounding</p>
              <p className="mt-3 text-2xl font-semibold text-[#eafaf5]">pgvector</p>
              <p className="mt-1 text-sm text-[#c1dcd5]">cosine similarity in PostgreSQL</p>
            </div>
            <div className="rounded-[24px] border border-[#f27d52]/20 bg-[#f27d52]/8 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[#f27d52]/70">Orchestration</p>
              <p className="mt-3 text-2xl font-semibold text-[#fff0e9]">Tools</p>
              <p className="mt-1 text-sm text-[#e7c4b7]">document search and metadata lookup</p>
            </div>
          </div>
        </div>

        <div className="rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 backdrop-blur">
          {toast && (
            <div
              className={
                toast.type === 'success'
                  ? 'rounded-[24px] border border-[#64c4aa]/20 bg-[#64c4aa]/10 px-4 py-3 text-sm text-[#b9f0e1]'
                  : 'rounded-[24px] border border-[#f27d52]/25 bg-[#f27d52]/10 px-4 py-3 text-sm text-[#ffd0c2]'
              }
            >
              {toast.message}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[28px] border border-white/8 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/45">Mode</p>
              <p className="mt-2 text-lg text-white">Operator Workspace</p>
            </div>
            <div className="rounded-[28px] border border-white/8 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/45">Inputs</p>
              <p className="mt-2 text-lg text-white">Text and Markdown</p>
            </div>
          </div>

          <div className="mt-4">
            <DocumentUpload
              onUploaded={(message) => setToast({ type: 'success', message })}
              onError={(message) => setToast({ type: 'error', message })}
              onWakeUpDetected={() => setIsWakeupModalOpen((current) => current || true)}
            />
          </div>
        </div>
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr),340px]">
        <ChatWindow
          onError={(message) => setToast({ type: 'error', message })}
          onWakeUpDetected={() => setIsWakeupModalOpen((current) => current || true)}
        />
        <DocumentList
          onUploaded={(message) => setToast({ type: 'success', message })}
          onError={(message) => setToast({ type: 'error', message })}
          onWakeUpDetected={() => setIsWakeupModalOpen((current) => current || true)}
        />
      </section>

      <footer className="mt-6 border-t border-white/6 pt-3 text-center text-[11px] tracking-[0.16em] text-white/24">
        Built by Thanooj 2026
      </footer>
    </main>
  );
};
