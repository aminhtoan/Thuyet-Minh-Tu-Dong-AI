import { Router } from 'express';
import { successResponse } from '../utils/api-response.js';
import { healthRouter } from './health.routes.js';
import { authRouter } from './auth.routes.js';
import { projectRouter } from './project.routes.js';
import { voiceRouter } from './voice.routes.js';
import { adminRouter } from './admin.routes.js';
import { analyticsRouter } from './analytics.routes.js';
import { qrRouter } from './qr.routes.js';

export function createApiRouter(projects = projectRouter) {
if (projects !== projectRouter && process.env.NODE_ENV !== 'test') throw new Error('TEST_ROUTER_INJECTION_REQUIRES_TEST_ENV');
const apiRouter = Router();

apiRouter.get('/', (_request, response) => {
  response.json(successResponse({ name: 'Multilingual AI Narration API', version: '0.1.0' }));
});
apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/projects', projects);
apiRouter.use('/voices', voiceRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/analytics', analyticsRouter);
apiRouter.use('/qr', qrRouter);
return apiRouter;
}
export const apiRouter = createApiRouter();
