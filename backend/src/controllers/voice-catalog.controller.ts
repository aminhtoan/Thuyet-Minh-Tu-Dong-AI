import type { RequestHandler } from 'express';
import { listActiveVoices } from '../services/voice-catalog.service.js';
import { successResponse } from '../utils/api-response.js';

export const list: RequestHandler = async (request, response) => {
  const query = request.validated?.query as { language?: string };
  response.json(successResponse(await listActiveVoices(query.language)));
};
