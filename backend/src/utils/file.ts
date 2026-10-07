import { mkdir, unlink } from 'node:fs/promises';
import { basename, isAbsolute, relative, resolve, sep } from 'node:path';
import { env } from '../config/env.js';

export const uploadRoot = resolve(process.cwd(), env.uploadDir);

export const ensureUploadDirectory = async (projectId: string): Promise<string> => {
  const directory = resolve(uploadRoot, 'projects', projectId);
  assertInsideUploadRoot(directory);
  await mkdir(directory, { recursive: true });
  return directory;
};

export const assertInsideUploadRoot = (target: string): void => {
  const resolvedTarget = resolve(target);
  const relativePath = relative(uploadRoot, resolvedTarget);
  if (relativePath.startsWith(`..${sep}`) || relativePath === '..' || isAbsolute(relativePath)) {
    throw new Error('Đường dẫn tệp nằm ngoài thư mục upload.');
  }
};

export const safeDeleteStoredFile = async (storagePath: string): Promise<void> => {
  const target = resolveStoredFile(storagePath);
  try {
    await unlink(target);
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
};

export const resolveStoredFile = (storagePath: string): string => {
  const target = resolve(uploadRoot, storagePath);
  assertInsideUploadRoot(target);
  return target;
};

export const safeOriginalName = (value: string): string =>
  [...basename(value)].filter((character) => {
    const code = character.charCodeAt(0);
    return code > 31 && code !== 127;
  }).join('').slice(0, 255) || 'media';
