import type { RequestHandler } from 'express';
import { getAdminJobAudio } from '../services/admin-job-audio.service.js';

export const adminJobAudio: RequestHandler = async (request, response) => {
  const file = await getAdminJobAudio(String(request.params.id ?? ''));
  response.set('Cache-Control', 'private, no-store').type(file.mimeType).send(file.audio);
};
