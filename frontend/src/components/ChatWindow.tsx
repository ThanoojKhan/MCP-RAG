import { useEffect, useMemo, useRef, useState } from 'react';
import { chatApi } from '../services/chat';
import type { ChatMessage } from '../types';

const createMessage = (role: ChatMessage['role'], content: string): ChatMessage => ({
  id: crypto.randomUUID(),
  role,
  content,
});

interface ChatWindowProps {
  onError: (message: string) => void;
  onWakeUpDetected: () => void;
}

export const ChatWindow = ({ onError, onWakeUpDetected }: ChatWindowProps) => {
  const [question, setQuestion] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage('assistant', 'Ask about your uploaded documents and I will answer with retrieval-backed context.'),
  ]);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);

  const canSubmit = useMemo(() => question.trim().length >= 3 && !isStreaming, [question, isStreaming]);

  useEffect(() => {
    if (!messageContainerRef.current) {
      return;
    }

    messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!isStreaming) {
      return;
    }

    const lastMessage = messages[messages.length - 1];

    if (lastMessage?.role === 'assistant' && lastMessage.content.trim().length > 0) {
      return;
    }

    const timer = window.setTimeout(() => onWakeUpDetected(), 3500);
    return () => window.clearTimeout(timer);
  }, [isStreaming, messages, onWakeUpDetected]);

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
            entry.id === assistantMessageId
              ? { ...entry, content: `The assistant could not complete the answer.\n\nReason: ${message}` }
              : entry,
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
    <section className="flex h-[720px] min-h-0 flex-col overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,14,22,0.88),rgba(19,24,32,0.74))] p-5 text-white shadow-panel backdrop-blur">
      <div className="mb-5 flex items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#f7c66b]/70">Conversational Layer</p>
          <p className="mt-2 font-display text-4xl text-[#fff8ef]">Ask the system.</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
            Retrieval-augmented answers with document search and backend tool access.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#9dd8ca]">
          {isStreaming ? 'Thinking' : 'Ready'}
        </div>
      </div>

      <div ref={messageContainerRef} className="flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.map((message) => (
          <div
            key={message.id}
            className={message.role === 'user' ? 'ml-auto max-w-[80%]' : 'max-w-[85%]'}
          >
            <div
              className={
                message.role === 'user'
                  ? 'whitespace-pre-wrap rounded-[28px] rounded-br-md bg-[linear-gradient(135deg,#f7c66b,#ef8f52)] px-4 py-3 text-sm text-[#19140d] shadow-[0_14px_40px_rgba(239,143,82,0.22)]'
                  : 'whitespace-pre-wrap rounded-[28px] rounded-bl-md border border-white/10 bg-white/6 px-4 py-3 text-sm leading-6 text-[#f3efe6]'
              }
            >
              {message.content || (isStreaming && message.role === 'assistant' ? '...' : '')}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={3}
          placeholder="Ask a question about your uploaded knowledge..."
          className="min-h-[88px] flex-1 resize-none rounded-[28px] border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-[#f7c66b]"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-[28px] bg-[#64c4aa] px-5 py-3 text-sm font-semibold text-[#081411] transition hover:bg-[#78d4bc] disabled:cursor-not-allowed disabled:bg-[#64c4aa]/40 disabled:text-[#081411]/60"
        >
          {isStreaming ? 'Streaming...' : 'Send'}
        </button>
      </form>
    </section>
  );
};
