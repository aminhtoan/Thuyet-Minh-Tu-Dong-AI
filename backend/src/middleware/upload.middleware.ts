import { randomUUID } from 'node:crypto';
import { relative } from 'node:path';
import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';
import { ensureUploadDirectory, uploadRoot } from '../utils/file.js';

const mimeExtensions: Record<string, { extension: string; mediaType: 'VIDEO' | 'AUDIO' }> = {
  'video/mp4': { extension: '.mp4', mediaType: 'VIDEO' },
  'video/webm': { extension: '.webm', mediaType: 'VIDEO' },
  'video/quicktime': { extension: '.mov', mediaType: 'VIDEO' },
  'audio/mpeg': { extension: '.mp3', mediaType: 'AUDIO' },
  'audio/wav': { extension: '.wav', mediaType: 'AUDIO' },
  'audio/x-wav': { extension: '.wav', mediaType: 'AUDIO' },
  'audio/mp4': { extension: '.m4a', mediaType: 'AUDIO' },
  'audio/m4a': { extension: '.m4a', mediaType: 'AUDIO' },
  'audio/webm': { extension: '.webm', mediaType: 'AUDIO' },
};

export const getMediaType = (mimeType: string): 'VIDEO' | 'AUDIO' | undefined => mimeExtensions[mimeType]?.mediaType;

const storage = multer.diskStorage({
  destination(request, _file, callback) {
    void ensureUploadDirectory(request.ownedProjectId ?? '')
      .then((directory) => { callback(null, directory); })
      .catch((error: Error) => { callback(error, ''); });
  },
  filename(_request, file, callback) {
    const media = mimeExtensions[file.mimetype];
    if (!media) return callback(new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Định dạng tệp không được hỗ trợ.'), '');
    callback(null, `${randomUUID()}${media.extension}`);
  },
});

export const uploadMedia = multer({
  // Web/native clients send UTF-8 filename bytes in multipart headers.
  // Decode once at the parser boundary; never reinterpret an existing Unicode name.
  defParamCharset: 'utf8',
  storage,
  limits: { fileSize: Math.floor(env.maxUploadSizeMb * 1024 * 1024), files: 1 },
  fileFilter(_request, file, callback) {
    if (!mimeExtensions[file.mimetype]) {
      callback(new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Định dạng tệp không được hỗ trợ.'));
      return;
    }
    callback(null, true);
  },
}).single('file');

export const toStoragePath = (absolutePath: string): string => relative(uploadRoot, absolutePath).replaceAll('\\', '/');
