interface ChatStreamHandlers {
  onToken: (token: string) => void;
  onError: (message: string) => void;
  onDone: () => void;
}

export const chatApi = {
  async streamChat(question: string, handlers: ChatStreamHandlers): Promise<void> {
    const response = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok || !response.body) {
      const message = 'Unable to reach chat service';
      handlers.onError(message);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        handlers.onDone();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const event of events) {
        const line = event
          .split('\n')
          .find((entry) => entry.startsWith('data:'))
          ?.replace(/^data:\s*/, '');

        if (!line) {
          continue;
        }

        const payload = JSON.parse(line) as { type: 'token' | 'done' | 'error'; content?: string; message?: string };

        if (payload.type === 'token' && payload.content) {
          handlers.onToken(payload.content);
        }

        if (payload.type === 'error') {
          handlers.onError(payload.message ?? 'Streaming failed');
        }

        if (payload.type === 'done') {
          handlers.onDone();
        }
      }
    }
  },
};
