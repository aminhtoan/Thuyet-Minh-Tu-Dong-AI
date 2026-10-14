import type { RequestHandler } from 'express';
import * as service from '../services/translation-processing.service.js';
import { successResponse } from '../utils/api-response.js';
import { groupTranslationService } from '../services/translation/group-translation.service.js';

export const start: RequestHandler = async (request, response) => {
  const body = request.body as { targetLanguage: string };
  response.json(successResponse(await service.translate(request.ownedProjectId ?? '', request.user?.id ?? '', body.targetLanguage)));
};
export const list: RequestHandler = async (request, response) => response.json(successResponse({ translations: await service.listTranslations(request.ownedProjectId ?? '') }));
export const get: RequestHandler = async (request, response) => response.json(successResponse({ translation: await service.getTranslation(request.ownedProjectId ?? '', String(request.params.targetLanguage ?? '').toLowerCase(), request.query.format === 'groups-v1') }));
export const plan: RequestHandler = async (req, res) => res.json(successResponse({ plan: await groupTranslationService.plan(req.ownedProjectId ?? '', req.user!.id, String(req.params.targetLanguage).toLowerCase()) }));
export const preview: RequestHandler = async (req, res) => {
  const draft = await groupTranslationService.preview(req.ownedProjectId ?? '', req.user!.id, req.body);
  res.json(successResponse({ draft }));
};
export const draft: RequestHandler = async (req, res) => res.json(successResponse({ draft: groupTranslationService.draft(req.ownedProjectId ?? '', req.user!.id, String(req.params.draftId)) }));
export const approve: RequestHandler = async (req, res) => res.json(successResponse(await groupTranslationService.approve(req.ownedProjectId ?? '', req.user!.id, String(req.params.draftId), req.body)));
