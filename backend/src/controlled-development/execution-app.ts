import express, { type RequestHandler, type ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authenticate } from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { requireProjectOwner } from '../middleware/project-owner.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { targetTranslationSchema, previewTranslationSchema, draftTranslationSchema, approveTranslationSchema } from '../validators/translation.validator.js';
import { groupProfileControllers } from '../controllers/translation.controller.js';
import type { GroupTranslationService } from '../services/translation/group-translation.service.js';
import type { GroupAdmission } from '../services/translation/group-admission.js';
import type { OneUsePermitFence } from '../services/translation/one-use-permit.js';
import { withPermittedSource, assertControlledRequest } from '../services/translation/controlled-development.js';
import { AppError } from '../utils/app-error.js';
import { readExecutionStatus } from './execution-status.js';
import { groupResponseHandler } from '../services/translation/group-response.js';

export function executionApp(fence: OneUsePermitFence, service: GroupTranslationService, admission: GroupAdmission, origins: string[]) {
  const app = express(); app.disable('x-powered-by'); app.use(helmet());
  app.use(cors({ origin: origins }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', mode: 'PERMIT', ledger: admission.snapshot() }));
  app.use('/api/projects', authenticate, authorize('CUSTOMER'), express.json({ limit: '128kb' }));
  const controllers = groupProfileControllers(service, admission);
  const scoped = (handler: RequestHandler): RequestHandler => async (req, res, next) => {
    try {
      if (req.user!.id !== fence.permit.ownerId) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
      await withPermittedSource(fence, req.user!.id, async () => {
        assertControlledRequest(String(req.params.id), req.user!.id, req.params.targetLanguage ? String(req.params.targetLanguage) : 'en');
        if (req.method === 'POST' && req.path.endsWith('/preview') && (req.body.idempotencyKey !== fence.permit.id || req.body.sourceRevision !== fence.permit.sourceDigest || req.body.targetLanguage !== 'en')) throw new AppError(409, 'CONTROLLED_REQUEST_MISMATCH', 'Yêu cầu không khớp permit.');
        if (req.method === 'POST' && req.path.endsWith('/approve') && req.get('X-Controlled-Review') !== req.body.outputDigest) throw new AppError(409, 'TRANSLATION_REVIEW_REQUIRED', 'Cần xác nhận thủ công đúng nội dung đã duyệt.');
        await handler(req, res, next);
      });
    } catch (error) { next(error); }
  };
  const base = '/api/projects/:id/translations';
  app.get(`${base}/controlled-status`, (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); }, requireProjectOwner, groupResponseHandler(admission, async req => {
    if (req.user!.id !== fence.permit.ownerId || String(req.params.id) !== fence.permit.projectId) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
    return { success: true, data: await readExecutionStatus(fence, admission) };
  }));
  app.get(`${base}/plan/:targetLanguage`, validate(targetTranslationSchema), requireProjectOwner, scoped(controllers.plan));
  app.post(`${base}/preview`, validate(previewTranslationSchema), requireProjectOwner, scoped(controllers.preview));
  app.get(`${base}/drafts/:draftId`, validate(draftTranslationSchema), requireProjectOwner, scoped(controllers.draft));
  app.post(`${base}/drafts/:draftId/approve`, validate(approveTranslationSchema), requireProjectOwner, scoped(controllers.approve));
  app.get(`${base}/:targetLanguage`, validate(targetTranslationSchema), requireProjectOwner, scoped(controllers.get));
  app.use((_req, res) => res.status(503).json({ success: false, error: { code: 'CONTROLLED_ROUTE_DENIED' } }));
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    // Never log raw provider/database/auth errors or submitted source material.
    const known = error instanceof AppError;
    res.status(known ? error.statusCode : 503).json({ success: false, error: { code: known ? error.code : 'CONTROLLED_EXECUTION_STOPPED', message: known ? error.message : 'Thao tác đã dừng an toàn. Không tự động gọi lại AI.' } });
  };
  app.use(errors);
  return app;
}
