import { getRenderWakeupMessage } from './error';

interface ChatStreamHandlers {
  onToken: (token: string) => void;
  onError: (message: string) => void;
  onDone: () => void;
}

const parseErrorResponse = async (response: Response): Promise<string> => {
  if (response.status === 502 || response.status === 503 || response.status === 504) {
    return getRenderWakeupMessage();
  }

  try {
    const payload = (await response.json()) as {
      error?: {
        message?: string;
      };
    };

    return payload.error?.message ?? 'Unable to reach chat service.';
  } catch {
    return 'Unable to reach chat service.';
  }
};

export const chatApi = {
  async streamChat(question: string, handlers: ChatStreamHandlers): Promise<void> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 60000);
    let completed = false;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const message = await parseErrorResponse(response);
        handlers.onError(message);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          if (!completed) {
            handlers.onDone();
          }
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
            completed = true;
            handlers.onError(payload.message ?? 'Streaming failed');
          }

          if (payload.type === 'done') {
            completed = true;
            handlers.onDone();
          }
        }
      }
    } catch {
      handlers.onError(getRenderWakeupMessage());
    } finally {
      window.clearTimeout(timeout);
    }
  },
};
