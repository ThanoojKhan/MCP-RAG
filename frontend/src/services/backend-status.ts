import { getBackendHealthUrl } from './api';

const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
};

export const backendStatusApi = {
  getHealthUrl(): string {
    return getBackendHealthUrl();
  },

  async isAwake(): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(getBackendHealthUrl(), 10000);
      return response.ok;
    } catch {
      return false;
    }
  },
};
