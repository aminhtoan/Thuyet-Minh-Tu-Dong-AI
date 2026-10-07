import type { RequestHandler } from 'express';
import * as mediaService from '../services/media.service.js';
import { successResponse } from '../utils/api-response.js';
import { AppError } from '../utils/app-error.js';

export const upload: RequestHandler = async (request, response) => {
  if (!request.file) throw new AppError(400, 'FILE_REQUIRED', 'Vui lòng chọn tệp media.');
  const media = await mediaService.upload(request.ownedProjectId ?? '', request.user?.id ?? '', request.file);
  response.status(201).json(successResponse({ media }));
};
export const get: RequestHandler = async (request, response) => response.json(successResponse({ media: await mediaService.get(request.ownedProjectId ?? '') }));
export const remove: RequestHandler = async (request, response) => { await mediaService.remove(request.ownedProjectId ?? '', request.user?.id ?? ''); response.json(successResponse({ message: 'Đã xóa media nguồn.' })); };
