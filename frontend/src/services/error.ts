import axios from 'axios';
import type { ApiErrorResponse } from '../types';

const defaultErrorMessage = 'Something went wrong. Please try again.';

export const toUserFacingErrorMessage = (error: unknown, fallbackMessage = defaultErrorMessage): string => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.error.message ?? error.message ?? fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
};
