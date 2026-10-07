import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../utils/app-error.js';

export const validate = (schema: ZodType): RequestHandler => (request, _response, next) => {
  const result = schema.safeParse({ body: request.body, params: request.params, query: request.query });
  if (!result.success) {
    next(new AppError(400, 'VALIDATION_ERROR', result.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ.'));
    return;
  }
  const parsed = result.data as { body?: unknown; params?: unknown; query?: unknown };
  request.validated = parsed;
  if (parsed.body !== undefined) request.body = parsed.body;
  next();
};
