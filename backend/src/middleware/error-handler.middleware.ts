import type { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';
import { errorResponse } from '../utils/api-response.js';

export const errorHandlerMiddleware: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === 'LIMIT_FILE_SIZE';
    response.status(tooLarge ? 413 : 400).json(
      errorResponse(tooLarge ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR', tooLarge ? 'Tệp tải lên vượt quá dung lượng cho phép.' : 'Tệp tải lên không hợp lệ.'),
    );
    return;
  }
  if (error instanceof AppError) {
    response.status(error.statusCode).json(errorResponse(error.code, error.message));
    return;
  }

  if (env.nodeEnv !== 'test') {
    console.error('Lỗi máy chủ không mong đợi:', error);
  }
  response.status(500).json(errorResponse('INTERNAL_SERVER_ERROR', 'Đã xảy ra lỗi máy chủ.'));
};
