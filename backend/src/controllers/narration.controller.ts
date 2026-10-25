import type { RequestHandler } from 'express';
import * as service from '../services/narration.service.js';
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
export const publicAudio: RequestHandler = async (request, response) => {
  const projectId = String(request.params.projectId ?? '');
  const narrationId = String(request.params.narrationId ?? '');
  const result = await service.getAudio(projectId, narrationId);
  response.setHeader('Content-Type', result.mimeType);
  response.setHeader('Content-Length', String(result.audio.byteLength));
  response.send(result.audio);
};
