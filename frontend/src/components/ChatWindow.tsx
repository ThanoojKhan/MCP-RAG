import { useMemo, useState } from 'react';
import { chatApi } from '../services/chat';
import type { ChatMessage } from '../types';

const createMessage = (role: ChatMessage['role'], content: string): ChatMessage => ({
  id: crypto.randomUUID(),
  role,
  content,
});

interface ChatWindowProps {
  onError: (message: string) => void;
}

export const ChatWindow = ({ onError }: ChatWindowProps) => {
  const [question, setQuestion] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage('assistant', 'Ask about your uploaded documents and I will answer with retrieval-backed context.'),
  ]);

  const canSubmit = useMemo(() => question.trim().length >= 3 && !isStreaming, [question, isStreaming]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || isStreaming) {
      return;
    }

    const userMessage = createMessage('user', trimmedQuestion);
    const assistantMessageId = crypto.randomUUID();

    setMessages((current) => [...current, userMessage, { id: assistantMessageId, role: 'assistant', content: '' }]);
    setQuestion('');
    setIsStreaming(true);

    await chatApi.streamChat(trimmedQuestion, {
      onToken: (token) => {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMessageId ? { ...message, content: `${message.content}${token}` } : message,
          ),
        );
      },
      onError: (message) => {
        onError(message);
        setMessages((current) =>
          current.map((entry) =>
            entry.id === assistantMessageId ? { ...entry, content: 'The assistant could not complete the answer.' } : entry,
          ),
        );
        setIsStreaming(false);
      },
      onDone: () => {
        setIsStreaming(false);
      },
    });
  };

  return (
    <section className="flex min-h-[640px] flex-col rounded-[32px] border border-black/5 bg-[#fffaf4]/80 p-5 shadow-panel backdrop-blur">
      <div className="mb-4 flex items-end justify-between gap-4 border-b border-ink/10 pb-4">
        <div>
          <p className="font-display text-3xl text-ink">AI Knowledge Assistant</p>
          <p className="mt-2 max-w-xl text-sm text-ink/70">
            Retrieval-augmented answers with document search and backend tool access.
          </p>
        </div>
        <div className="rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-pine">
          {isStreaming ? 'Thinking' : 'Ready'}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.map((message) => (
          <div
            key={message.id}
            className={message.role === 'user' ? 'ml-auto max-w-[80%]' : 'max-w-[85%]'}
          >
            <div
              className={
                message.role === 'user'
                  ? 'rounded-[24px] rounded-br-md bg-pine px-4 py-3 text-sm text-white'
                  : 'rounded-[24px] rounded-bl-md border border-ink/10 bg-white px-4 py-3 text-sm text-ink'
              }
            >
              {message.content || (isStreaming && message.role === 'assistant' ? '...' : '')}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 flex flex-col gap-3 border-t border-ink/10 pt-4 sm:flex-row">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={3}
          placeholder="Ask a question about your uploaded knowledge..."
          className="min-h-[88px] flex-1 resize-none rounded-[24px] border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-ember"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-[24px] bg-ember px-5 py-3 text-sm font-semibold text-white transition hover:bg-ember/90 disabled:cursor-not-allowed disabled:bg-ember/40"
        >
          {isStreaming ? 'Streaming...' : 'Send'}
        </button>
      </form>
    </section>
  );
};
