import type { ApiErrorBody, ApiSuccess } from '../types/api.types.js';

export const successResponse = <T>(data: T): ApiSuccess<T> => ({
  success: true,
  data,
});

export const errorResponse = (code: string, message: string): ApiErrorBody => ({
  success: false,
  error: { code, message },
});
