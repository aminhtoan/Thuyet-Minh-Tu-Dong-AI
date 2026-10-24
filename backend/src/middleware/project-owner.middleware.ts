import type { RequestHandler } from 'express';
import { Project } from '../models/Project.js';
import { AppError } from '../utils/app-error.js';

export const requireProjectOwner: RequestHandler = async (request, _response, next) => {
  const id = String(request.params.id ?? '');
  if (!id || !/^[a-f\d]{24}$/i.test(id)) {
    next(new AppError(400, 'VALIDATION_ERROR', 'ID dự án không hợp lệ.'));
    return;
  }
  const filter = request.user?.role === 'ADMIN' ? { _id: id } : { _id: id, userId: request.user?.id };
  const project = await Project.findOne(filter).select('_id');
  if (!project) {
    next(new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.'));
    return;
  }
  request.ownedProjectId = project._id.toString();
  next();
};
