import type { RequestHandler } from 'express';
import * as service from '../services/transcription.service.js';
import { successResponse } from '../utils/api-response.js';

export const start: RequestHandler = async (request, response) => response.json(successResponse(await service.transcribe(request.ownedProjectId ?? '', request.user?.id ?? '')));
export const get: RequestHandler = async (request, response) => response.json(successResponse({ transcript: await service.getTranscript(request.ownedProjectId ?? '') }));
