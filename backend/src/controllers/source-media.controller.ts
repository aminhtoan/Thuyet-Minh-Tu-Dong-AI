import { createReadStream } from 'node:fs';
import type { RequestHandler } from 'express';
import { getSourceMediaFile } from '../services/source-media.service.js';
import { AppError } from '../utils/app-error.js';

export const parseSourceRange = (header: string, size: number): { start: number; end: number } | null => {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return null;
  let start: number; let end: number;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix); end = size - 1;
  } else {
    start = Number(match[1]); end = match[2] ? Number(match[2]) : size - 1;
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) return null;
  return { start, end: Math.min(end, size - 1) };
};

export const streamSourceMedia: RequestHandler = async (request, response, next) => {
  const file = await getSourceMediaFile(request.ownedProjectId ?? '');
  response.set({ 'Content-Type': file.mimeType, 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
  // HEAD describes the full representation; Range applies to GET only.
  const range = request.method === 'HEAD' ? undefined : request.headers.range;
  const parsed = range ? parseSourceRange(range, file.size) : undefined;
  if (range && !parsed) { response.status(416).set({ 'Content-Range': `bytes */${file.size}`, 'Content-Length': '0' }).end(); return; }
  response.setHeader('Content-Length', String(parsed ? parsed.end - parsed.start + 1 : file.size));
  if (parsed) response.status(206).setHeader('Content-Range', `bytes ${parsed.start}-${parsed.end}/${file.size}`);
  if (request.method === 'HEAD') { response.end(); return; }
  const stream = createReadStream(file.path, parsed ?? undefined);
  response.on('close', () => stream.destroy());
  stream.on('error', () => { if (response.headersSent) response.destroy(); else { response.removeHeader('Content-Length'); response.removeHeader('Content-Range'); next(new AppError(404, 'MEDIA_FILE_MISSING', 'Không thể đọc tệp phương tiện nguồn.')); } });
  stream.pipe(response);
};
