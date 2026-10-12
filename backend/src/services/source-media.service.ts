import { realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, sep } from 'node:path';
import { Media } from '../models/Media.js';
import { resolveStoredFile, uploadRoot } from '../utils/file.js';
import { AppError } from '../utils/app-error.js';

export const getSourceMediaFile = async (projectId: string) => {
  const media = await Media.findOne({ projectId });
  if (!media) throw new AppError(404, 'MEDIA_NOT_FOUND', 'Không tìm thấy phương tiện nguồn.');
  if (!['audio/mpeg', 'video/mp4'].includes(media.mimeType)) throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Định dạng phương tiện này chưa được hỗ trợ phát.');
  try {
    const path = await realpath(resolveStoredFile(media.storagePath));
    const root = await realpath(uploadRoot);
    const rel = relative(root, path);
    if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error('Outside storage');
    const info = await stat(path);
    if (!info.isFile() || info.size <= 0) throw new Error('Missing media');
    return { path, size: info.size, mimeType: media.mimeType };
  } catch { throw new AppError(404, 'MEDIA_FILE_MISSING', 'Không tìm thấy tệp phương tiện nguồn.'); }
};
