import { Router } from 'express';
import { successResponse } from '../utils/api-response.js';
import { healthRouter } from './health.routes.js';

export const apiRouter = Router();

apiRouter.get('/', (_request, response) => {
  response.json(successResponse({ name: 'Multilingual AI Narration API', version: '0.1.0' }));
});
apiRouter.use('/health', healthRouter);
