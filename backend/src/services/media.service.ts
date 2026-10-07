import type { Types } from 'mongoose';
import type { Express } from 'express';
import { ActivityLog } from '../models/ActivityLog.js';
import { Media, type MediaDocument } from '../models/Media.js';
import { Project } from '../models/Project.js';
import { AppError } from '../utils/app-error.js';
import { safeDeleteStoredFile, safeOriginalName } from '../utils/file.js';
import { getMediaType, toStoragePath } from '../middleware/upload.middleware.js';

const serialize = (media: MediaDocument & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date }) => ({
  id: media._id.toString(), projectId: media.projectId.toString(), originalName: media.originalName,
  mediaType: media.mediaType, mimeType: media.mimeType, fileSize: media.fileSize,
  duration: media.duration ?? null, createdAt: media.createdAt, updatedAt: media.updatedAt,
});

const log = async (userId: string, action: string, entityId: Types.ObjectId, description: string) => {
  try { await ActivityLog.create({ userId, action, entityType: 'Media', entityId, description }); } catch { /* best effort */ }
};

export const upload = async (projectId: string, userId: string, file: Express.Multer.File) => {
  const mediaType = getMediaType(file.mimetype);
  if (!mediaType) { await safeDeleteStoredFile(toStoragePath(file.path)); throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Định dạng tệp không được hỗ trợ.'); }
  const storagePath = toStoragePath(file.path);
  const old = await Media.findOne({ projectId });
  try {
    const media = await Media.findOneAndUpdate(
      { projectId },
      { $set: { originalName: safeOriginalName(file.originalname), fileName: file.filename, mediaType, mimeType: file.mimetype, fileSize: file.size, storagePath }, $unset: { duration: 1 } },
      { upsert: true, returnDocument: 'after', runValidators: true },
    );
    await Project.updateOne({ _id: projectId, userId }, { $set: { status: 'UPLOADED', progress: 0 } });
    if (old && old.storagePath !== storagePath) await safeDeleteStoredFile(old.storagePath);
    void log(userId, old ? 'MEDIA_REPLACED' : 'MEDIA_UPLOADED', media._id, old ? 'Media nguồn đã được thay thế.' : 'Media nguồn đã được tải lên.');
    return serialize(media);
  } catch (error) {
    await safeDeleteStoredFile(storagePath);
    throw error;
  }
};

export const get = async (projectId: string) => {
  const media = await Media.findOne({ projectId });
  if (!media) throw new AppError(404, 'MEDIA_NOT_FOUND', 'Không tìm thấy media nguồn.');
  return serialize(media);
};

export const remove = async (projectId: string, userId: string) => {
  const media = await Media.findOneAndDelete({ projectId });
  if (!media) throw new AppError(404, 'MEDIA_NOT_FOUND', 'Không tìm thấy media nguồn.');
  await Project.updateOne({ _id: projectId, userId }, { $set: { status: 'DRAFT', progress: 0 } });
  await safeDeleteStoredFile(media.storagePath);
  void log(userId, 'MEDIA_DELETED', media._id, 'Media nguồn đã được xóa.');
};
