import type { RequestHandler } from 'express';
import * as authService from '../services/auth.service.js';
import { successResponse } from '../utils/api-response.js';
import { AppError } from '../utils/app-error.js';

export const register: RequestHandler = async (request, response) => {
  const result = await authService.register(request.body as { fullName: string; email: string; password: string });
  response.status(201).json(successResponse(result));
};

export const login: RequestHandler = async (request, response) => {
  const result = await authService.login(request.body as { email: string; password: string });
  response.json(successResponse(result));
};

export const refresh: RequestHandler = async (request, response) => {
  const result = await authService.refresh((request.body as { refreshToken: string }).refreshToken);
  response.json(successResponse(result));
};

export const logout: RequestHandler = async (request, response) => {
  await authService.logout((request.body as { refreshToken: string }).refreshToken);
  response.json(successResponse({ message: 'Đăng xuất thành công.' }));
};

export const me: RequestHandler = (request, response) => {
  if (!request.user) throw new AppError(401, 'AUTH_REQUIRED', 'Yêu cầu xác thực.');
  response.json(successResponse({ user: request.user }));
};
