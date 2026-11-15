import { createHash } from 'node:crypto';
import { trackedReadStream } from '../maintenance/resources.js';
import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, sep } from 'node:path';
import { resolveStoredFile, uploadRoot } from '../utils/file.js';

// The adapter must create an audio-only, independent MP3, never the uploaded file.
export interface OriginalAudioPreparer {
  prepare(sourcePath: string, destinationPath: string, signal?: AbortSignal): Promise<{ duration: number; mimeType: 'audio/mpeg' }>;
}

export async function checkedStoredPath(storagePath: string) {
  const [root, path] = await Promise.all([realpath(uploadRoot), realpath(resolveStoredFile(storagePath))]);
  const rel = relative(root, path);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw Error('INVALID_STORAGE_PATH');
  const info = await stat(path);
  if (!info.isFile() || info.size <= 0) throw Error('INVALID_MEDIA_FILE');
  return path;
}

export async function fileDigest(storagePath: string) {
  const data = await readFile(await checkedStoredPath(storagePath));
  return { digest: createHash('sha256').update(data).digest('hex'), size: data.byteLength, data };
}

export async function sourceDigest(storagePath: string) {
  const hash = createHash('sha256');
  const stream = trackedReadStream(await checkedStoredPath(storagePath));
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest('hex');
}

export function sourceFingerprint(media: { _id: unknown; updatedAt: Date; storagePath: string }, digest: string) {
  // Content hash plus upload incarnation: replacing even identical bytes invalidates review.
  return createHash('sha256').update(JSON.stringify([String(media._id), media.updatedAt.toISOString(), media.storagePath, digest])).digest('hex');
}
