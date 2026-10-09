import { Router } from 'express';
import { successResponse } from '../utils/api-response.js';
import { healthRouter } from './health.routes.js';
import { authRouter } from './auth.routes.js';
import { projectRouter } from './project.routes.js';
import { voiceRouter } from './voice.routes.js';
import { adminRouter } from './admin.routes.js';

export const apiRouter = Router();

apiRouter.get('/', (_request, response) => {
  response.json(successResponse({ name: 'Multilingual AI Narration API', version: '0.1.0' }));
});
apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/projects', projectRouter);
apiRouter.use('/voices', voiceRouter);
apiRouter.use('/admin', adminRouter);
