import { createReadStream } from 'node:fs';
import type { RequestHandler } from 'express';
import * as service from '../services/result.service.js';
import { successResponse } from '../utils/api-response.js';

export const process: RequestHandler = async (request, response) => response.json(successResponse(await service.process(request.ownedProjectId ?? '', request.user?.id ?? '', (request.body as { narrationId: string }).narrationId)));
export const list: RequestHandler = async (request, response) => response.json(successResponse({ results: await service.listResults(request.ownedProjectId ?? '') }));
export const get: RequestHandler = async (request, response) => response.json(successResponse({ result: await service.getResult(request.ownedProjectId ?? '', String(request.params.resultId ?? '')) }));
export const file: RequestHandler = async (request, response) => {
  const result = await service.getResultFile(request.ownedProjectId ?? '', String(request.params.resultId ?? '')); const range = request.headers.range;
  response.setHeader('Content-Type', result.mimeType); response.setHeader('Accept-Ranges', 'bytes');
  if (!range) { response.setHeader('Content-Length', String(result.size)); createReadStream(result.path).pipe(response); return; }
  const match = /^bytes=(\d*)-(\d*)$/.exec(range); const start = match?.[1] ? Number(match[1]) : 0; const end = match?.[2] ? Number(match[2]) : result.size - 1;
  if (!match || !Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end >= result.size) { response.status(416).setHeader('Content-Range', `bytes */${result.size}`).end(); return; }
  response.status(206); response.setHeader('Content-Range', `bytes ${start}-${end}/${result.size}`); response.setHeader('Content-Length', String(end - start + 1)); createReadStream(result.path, { start, end }).pipe(response);
};
