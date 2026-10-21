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
import { webExecutionReadiness } from './web-execution.js';
import { digest } from '../services/translation/group-plan.js';

export function executionApp(fence: OneUsePermitFence, service: GroupTranslationService, admission: GroupAdmission, origins: string[], web: { enabled: boolean; verify?: Parameters<typeof webExecutionReadiness>[3] } = { enabled: false }) {
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
  let webSubmitted = false; // Additional process latch; durable fence remains final authority across restarts.
  const webScope: RequestHandler = (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (req.user!.id !== fence.permit.ownerId || String(req.params.id) !== fence.permit.projectId) return next(new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.'));
    next();
  };
  app.get(`${base}/execution-readiness`, requireProjectOwner, webScope, groupResponseHandler(admission, async () => ({ success: true,
    data: webSubmitted ? { state: 'CONSUMED', executionAllowed: false } : await webExecutionReadiness(fence, admission, web.enabled, web.verify) })));
  app.post(`${base}/controlled-preview`, requireProjectOwner, webScope, groupResponseHandler(admission, async req => {
    if (!origins.includes(req.get('Origin') ?? '') || req.body?.confirmation !== 'EXECUTE_ONCE' || Object.keys(req.body).some(key => !['confirmation', 'authorizationId'].includes(key))) throw new AppError(403, 'CONTROLLED_WEB_CONFIRMATION_REQUIRED', 'Cần xác nhận thủ công từ giao diện được phép.');
    const ready = await webExecutionReadiness(fence, admission, web.enabled, web.verify);
    if (webSubmitted || ready.state !== 'READY' || !('authorizationId' in ready) || req.body.authorizationId !== ready.authorizationId) throw new AppError(409, 'CONTROLLED_WEB_NOT_READY', 'Chưa đủ điều kiện hoặc yêu cầu đã được sử dụng. Không tự thử lại.');
    webSubmitted = true; // Before any async plan/provider work. Never reset after failure/disconnect.
    const draft = await withPermittedSource(fence, req.user!.id, async () => {
      const p = fence.permit;
      const plan = await service.plan(p.projectId, req.user!.id, 'en');
      if (plan.transcriptRevision !== p.revision || plan.sourceRevision !== p.sourceDigest || digest(plan.groups.map(g => g.groupId)) !== p.planDigest) throw new AppError(409, 'SOURCE_REVISION_MISMATCH', 'Nguồn đã thay đổi.');
      return service.preview(p.projectId, req.user!.id, { targetLanguage: 'en', sourceRevision: p.sourceDigest,
        groupingVersion: plan.groupingVersion, groups: plan.groups.map(g => g.sourceSegmentIds), idempotencyKey: p.id });
    });
    return { success: true, data: { draft } };
  }));
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
