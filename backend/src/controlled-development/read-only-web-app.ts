import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authenticate } from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { requireProjectOwner } from '../middleware/project-owner.middleware.js';
import { AppError } from '../utils/app-error.js';

// No provider, translation service, permit or mutation controller imports.
// Only authentication's User.findOne and ownership's Project.findOne execute.
export function readOnlyWebApp(origins: readonly string[]) {
  const app = express(); app.disable('x-powered-by'); app.use(helmet());
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (req.get('Origin') && !origins.includes(req.get('Origin')!)) return next(new AppError(403, 'READINESS_ORIGIN_DENIED', 'Origin không được phép.'));
    next();
  });
  app.use(cors({ origin: [...origins], methods: ['GET'], allowedHeaders: ['Authorization'], credentials: false, maxAge: 0 }));
  app.use((req, res, next) => {
    if (req.method !== 'GET') { res.set('Allow', 'GET, OPTIONS'); res.status(405).json({ success: false, error: { code: 'READINESS_GET_ONLY' } }); return; }
    next();
  });
  app.get('/api/health', (_req, res) => res.json({ success: true, data: { status: 'ok', mode: 'READ_ONLY_WEB_READINESS', executionAllowed: false } }));
  app.get('/api/projects/:id/translations/execution-readiness', authenticate, authorize('CUSTOMER'), requireProjectOwner, (req, res) => {
    res.json({ success: true, data: { state: 'LOCKED', executionAllowed: false, reasonCode: 'READ_ONLY_WEB_READINESS',
      authentication: 'CUSTOMER_VERIFIED', ownership: 'VERIFIED', projectId: req.ownedProjectId,
      sourceVerification: 'NOT_PERFORMED', permitState: 'NOT_INSPECTED', otherProcessDrafts: 'UNKNOWN' } });
  });
  app.use((_req, res) => res.status(404).json({ success: false, error: { code: 'READINESS_ROUTE_UNAVAILABLE' } }));
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    res.status(error instanceof AppError ? error.statusCode : 503).json({ success: false,
      error: { code: error instanceof AppError ? error.code : 'READINESS_UNAVAILABLE', message: 'Không thể xác minh readiness. Không thực thi dịch.' } });
  };
  app.use(errors);
  return app;
}
