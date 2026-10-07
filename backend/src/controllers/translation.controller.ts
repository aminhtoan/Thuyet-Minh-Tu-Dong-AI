import type { RequestHandler } from 'express';
import * as service from '../services/translation-processing.service.js';
import { successResponse } from '../utils/api-response.js';

export const start: RequestHandler = async (request, response) => {
  const body = request.body as { targetLanguage: string };
  response.json(successResponse(await service.translate(request.ownedProjectId ?? '', request.user?.id ?? '', body.targetLanguage)));
};
export const list: RequestHandler = async (request, response) => response.json(successResponse({ translations: await service.listTranslations(request.ownedProjectId ?? '') }));
export const get: RequestHandler = async (request, response) => response.json(successResponse({ translation: await service.getTranslation(request.ownedProjectId ?? '', String(request.params.targetLanguage ?? '').toLowerCase()) }));
