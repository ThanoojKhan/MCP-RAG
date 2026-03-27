import axios from 'axios';

export const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export const getBackendOrigin = (): string => apiBaseUrl.replace(/\/api\/?$/, '');

export const getBackendHealthUrl = (): string => `${getBackendOrigin()}/health`;

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});
