import type { Types } from 'mongoose';
import { ActivityLog } from '../models/ActivityLog.js';
import { Media } from '../models/Media.js';
import { Narration } from '../models/Narration.js';
import { Project, type ProjectDocument } from '../models/Project.js';
import type { ProjectStatus } from '../constants/project.constants.js';
import { AppError } from '../utils/app-error.js';
import { safeDeleteStoredFile } from '../utils/file.js';

interface ProjectInput { name: string; description?: string; sourceLanguage: string }
interface ListInput { search?: string; status?: ProjectStatus; page: number; limit: number }

const serialize = (project: ProjectDocument & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date }) => ({
  id: project._id.toString(), name: project.name, description: project.description,
  sourceLanguage: project.sourceLanguage, status: project.status, progress: project.progress,
  createdAt: project.createdAt, updatedAt: project.updatedAt,
});

const log = async (userId: string, action: string, entityId: Types.ObjectId, description: string) => {
  try { await ActivityLog.create({ userId, action, entityType: 'Project', entityId, description }); } catch { /* best effort */ }
};

const owned = async (id: string, userId: string) => {
  const project = await Project.findOne({ _id: id, userId });
  if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
  return project;
};

export const create = async (userId: string, input: ProjectInput) => {
  const project = await Project.create({ ...input, description: input.description ?? '', userId, status: 'DRAFT', progress: 0 });
  void log(userId, 'PROJECT_CREATED', project._id, 'Dự án đã được tạo.');
  return serialize(project);
};

export const list = async (userId: string, input: ListInput) => {
  const filter: Record<string, unknown> = { userId };
  if (input.status) filter.status = input.status;
  if (input.search) {
    const escaped = input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ name: { $regex: escaped, $options: 'i' } }, { description: { $regex: escaped, $options: 'i' } }];
  }
  const [projects, total] = await Promise.all([
    Project.find(filter).sort({ createdAt: -1 }).skip((input.page - 1) * input.limit).limit(input.limit),
    Project.countDocuments(filter),
  ]);
  return { projects: projects.map(serialize), pagination: { ...input, search: undefined, status: undefined, total, totalPages: Math.ceil(total / input.limit) } };
};

export const get = async (id: string, userId: string) => serialize(await owned(id, userId));

export const update = async (id: string, userId: string, input: Partial<ProjectInput>) => {
  const project = await Project.findOneAndUpdate({ _id: id, userId }, { $set: input }, { returnDocument: 'after', runValidators: true });
  if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
  void log(userId, 'PROJECT_UPDATED', project._id, 'Dự án đã được cập nhật.');
  return serialize(project);
};

export const remove = async (id: string, userId: string) => {
  const project = await owned(id, userId);
  const media = await Media.findOne({ projectId: project._id });
  const narrations = await Narration.find({ projectId: project._id }).select('audioPath');
  await Promise.all([Media.deleteMany({ projectId: project._id }), Narration.deleteMany({ projectId: project._id }), Project.deleteOne({ _id: project._id })]);
  if (media) await safeDeleteStoredFile(media.storagePath);
  await Promise.all(narrations.filter((item) => item.audioPath).map((item) => safeDeleteStoredFile(item.audioPath)));
  void log(userId, 'PROJECT_DELETED', project._id, 'Dự án đã được xóa.');
};
