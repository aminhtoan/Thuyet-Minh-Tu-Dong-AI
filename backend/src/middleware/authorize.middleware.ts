import type { RequestHandler } from 'express';
import type { UserRole } from '../constants/user.constants.js';
import { AppError } from '../utils/app-error.js';

export const authorize = (...roles: UserRole[]): RequestHandler => (request, _response, next) => {
  if (!request.user) {
    next(new AppError(401, 'AUTH_REQUIRED', 'Yêu cầu xác thực.'));
    return;
  }
  if (!roles.includes(request.user.role)) {
    next(new AppError(403, 'FORBIDDEN', 'Bạn không có quyền truy cập tài nguyên này.'));
    return;
  }
  next();
};
