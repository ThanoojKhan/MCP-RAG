import axios from 'axios';
import type { ApiErrorResponse } from '../types';

const defaultErrorMessage = 'Something went wrong. Please try again.';
const renderWakeupMessage =
  'The backend is waking up after inactivity. This can take a little while on Render, so please wait a moment and try again if needed.';

const isWakeUpStatus = (status?: number): boolean => status === 502 || status === 503 || status === 504;

export const getRenderWakeupMessage = (): string => renderWakeupMessage;

export const isLikelyServerWakeUp = (error: unknown): boolean => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    if (isWakeUpStatus(error.response?.status)) {
      return true;
    }

    return error.code === 'ECONNABORTED' || (!error.response && error.message.toLowerCase().includes('network'));
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('failed to fetch') || message.includes('network') || message.includes('timed out');
  }

  return false;
};

export const toUserFacingErrorMessage = (error: unknown, fallbackMessage = defaultErrorMessage): string => {
  if (isLikelyServerWakeUp(error)) {
    return renderWakeupMessage;
  }

  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.error.message ?? error.message ?? fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
};
