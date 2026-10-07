import type { RequestHandler } from 'express';
import { User } from '../models/User.js';
import { serializeUser } from '../services/auth.service.js';
import { AppError } from '../utils/app-error.js';
import { jwt, verifyAccessToken } from '../utils/jwt.js';

export const authenticate: RequestHandler = async (request, _response, next) => {
  const authorization = request.header('authorization');
  if (!authorization) {
    next(new AppError(401, 'AUTH_REQUIRED', 'Yêu cầu xác thực.'));
    return;
  }
  const [scheme, token, extra] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token || extra) {
    next(new AppError(401, 'INVALID_TOKEN', 'Access token không hợp lệ.'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (!user) throw new AppError(401, 'INVALID_TOKEN', 'Access token không hợp lệ.');
    if (user.status === 'BLOCKED') throw new AppError(403, 'ACCOUNT_BLOCKED', 'Tài khoản đã bị khóa.');
    request.user = serializeUser(user);
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError(401, 'TOKEN_EXPIRED', 'Access token đã hết hạn.'));
      return;
    }
    next(new AppError(401, 'INVALID_TOKEN', 'Access token không hợp lệ.'));
  }
};
