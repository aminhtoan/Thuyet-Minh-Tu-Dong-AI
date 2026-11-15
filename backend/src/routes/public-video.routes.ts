import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { successResponse } from '../utils/api-response.js';
import { createTrackedResource } from '../maintenance/runtime.js';
import { parseSourceRange } from '../controllers/source-media.controller.js';
import * as service from '../services/public-video.service.js';

const id = z.string().regex(/^[a-f\d]{24}$/i);
const params = z.object({ projectId: id, resultId: id });
export const publicVideoRouter = Router();
publicVideoRouter.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
publicVideoRouter.get('/public', async (_req, res) => {
  res.json(successResponse({ videos: await service.listPublicVideos() }));
});
publicVideoRouter.get('/public/projects/:projectId/results/:resultId/file', validate(z.object({ params })), async (req, res, next) => {
  const file = await service.openPublicVideo(String(req.params.projectId), String(req.params.resultId));
  if (res.destroyed) { await file.handle.close(); return; }
  const range = req.method === 'HEAD' ? undefined : req.headers.range;
  const parsed = range ? parseSourceRange(range, file.size) : undefined;
  if (range && !parsed) { await file.handle.close(); res.status(416).set('Content-Range', `bytes */${file.size}`).end(); return; }
  res.set({ 'Content-Type': 'video/mp4', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes',
    'Content-Length': String(parsed ? parsed.end - parsed.start + 1 : file.size) });
  if (parsed) res.status(206).set('Content-Range', `bytes ${parsed.start}-${parsed.end}/${file.size}`);
  if (req.method === 'HEAD') { await file.handle.close(); res.end(); return; }
  try {
    const stream = createTrackedResource(() => file.handle.createReadStream(parsed ?? { start: 0 }));
    res.once('close', () => stream.destroy());
    stream.once('error', (error) => { if (res.headersSent) res.destroy(); else { res.removeHeader('Content-Length'); res.removeHeader('Content-Range'); next(error); } });
    stream.pipe(res);
  } catch (error) { await file.handle.close(); throw error; }
});
publicVideoRouter.use(authenticate, authorize('ADMIN'));
publicVideoRouter.get('/admin/projects/:projectId/results/:resultId/publication', validate(z.object({ params })), async (req, res) => {
  res.json(successResponse({ publication: await service.videoPublicationStatus(String(req.params.projectId), String(req.params.resultId)) }));
});
publicVideoRouter.patch('/admin/projects/:projectId/results/:resultId/publication', validate(z.object({ params,
  body: z.object({ enabled: z.boolean(), version: z.number().int().nonnegative() }).strict(),
})), async (req, res) => {
  res.json(successResponse({ publication: await service.setVideoPublication(String(req.params.projectId), String(req.params.resultId), req.user!.id, req.body) }));
});
