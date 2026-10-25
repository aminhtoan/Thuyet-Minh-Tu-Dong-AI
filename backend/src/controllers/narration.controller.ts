import { createReadStream } from 'node:fs';
import type { RequestHandler } from 'express';
import * as service from '../services/narration.service.js';
import { getSourceMediaFile } from '../services/source-media.service.js';
import { parseSourceRange } from './source-media.controller.js';
import { AppError } from '../utils/app-error.js';
import { successResponse } from '../utils/api-response.js';

export const start: RequestHandler = async (request, response) => {
  const body = request.body as { targetLanguage: string; voiceId?: string };
  response.json(successResponse(await service.generate(request.ownedProjectId ?? '', request.user?.id ?? '', body.targetLanguage, body.voiceId)));
};
export const list: RequestHandler = async (request, response) => response.json(successResponse({ narrations: await service.listNarrations(request.ownedProjectId ?? '') }));
export const get: RequestHandler = async (request, response) => response.json(successResponse({ narration: await service.getNarration(request.ownedProjectId ?? '', String(request.params.narrationId ?? '')) }));
export const audio: RequestHandler = async (request, response) => {
  const result = await service.getAudio(request.ownedProjectId ?? '', String(request.params.narrationId ?? ''));
  response.setHeader('Content-Type', result.mimeType); response.setHeader('Content-Length', String(result.audio.byteLength)); response.send(result.audio);
};
export const publicAudio: RequestHandler = async (request, response, next) => {
  const projectId = String(request.params.projectId ?? '');
  const narrationId = String(request.params.narrationId ?? '');

  if (narrationId === 'source') {
    try {
      const file = await getSourceMediaFile(projectId);
      response.set({
        'Content-Type': file.mimeType,
        'Accept-Ranges': 'bytes',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      });
      const range = request.method === 'HEAD' ? undefined : request.headers.range;
      const parsed = range ? parseSourceRange(range, file.size) : undefined;
      if (range && !parsed) {
        response.status(416).set({ 'Content-Range': `bytes */${file.size}`, 'Content-Length': '0' }).end();
        return;
      }
      response.setHeader('Content-Length', String(parsed ? parsed.end - parsed.start + 1 : file.size));
      if (parsed) response.status(206).setHeader('Content-Range', `bytes ${parsed.start}-${parsed.end}/${file.size}`);
      if (request.method === 'HEAD') { response.end(); return; }
      const stream = createReadStream(file.path, parsed ?? undefined);
      response.on('close', () => stream.destroy());
      stream.on('error', () => {
        if (!response.headersSent) next(new AppError(404, 'MEDIA_FILE_MISSING', 'Không thể đọc tệp phương tiện nguồn.'));
      });
      stream.pipe(response);
      return;
    } catch (error) {
      next(error);
      return;
    }
  }

  const result = await service.getAudio(projectId, narrationId);
  response.setHeader('Content-Type', result.mimeType);
  response.setHeader('Content-Length', String(result.audio.byteLength));
  response.setHeader('Accept-Ranges', 'bytes');
  response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  response.send(result.audio);
};
