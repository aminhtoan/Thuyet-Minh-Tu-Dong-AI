import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { successResponse } from '../utils/api-response.js';
import * as service from '../services/original-audio.service.js';

const id = z.string().regex(/^[a-f\d]{24}$/i);
export const originalRequestSchema = z.object({ params: z.object({ projectId: id }), body: z.object({
  confirmsPublicationRights: z.literal(true), declaration: z.string().trim().min(20).max(2000), reference: z.string().trim().min(10).max(2000),
}).strict() });
export const originalReviewSchema = z.object({ params: z.object({ id }), body: z.object({
  action: z.enum(['APPROVED', 'REJECTED', 'REVOKED']), reason: z.string().trim().min(10).max(2000), version: z.number().int().nonnegative(),
}).strict() });
export const originalAudioRouter = Router();
originalAudioRouter.get('/public', async (_req, res) => {
  res.set('Cache-Control', 'no-store').json(successResponse({ originals: await service.listPublicOriginalAudio() }));
});
originalAudioRouter.get('/:id/audio', validate(z.object({ params: z.object({ id }) })), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const data = await service.readPublicOriginalAudio(String(req.params.id));
  res.set({ 'Cache-Control': 'no-store', 'Content-Type': 'audio/mpeg', 'Content-Length': String(data.length) }).send(data);
});
originalAudioRouter.use(authenticate);
originalAudioRouter.post('/:id/prepare', authorize('ADMIN'), validate(z.object({ params: z.object({ id }), body: z.object({}).strict() })), async (req, res) => {
  res.json(successResponse({ publication: await service.triggerOriginalPreparation(String(req.params.id), req.user!) }));
});
const projectParams = z.object({ params: z.object({ projectId: id }) });
originalAudioRouter.get('/admin/projects/:projectId/publication', authorize('ADMIN'), validate(projectParams), async (req, res) => {
  res.set('Cache-Control', 'no-store').json(successResponse({ publication: await service.adminOriginalStatus(String(req.params.projectId)) }));
});
originalAudioRouter.patch('/admin/projects/:projectId/publication', authorize('ADMIN'), validate(z.object({ params: z.object({ projectId: id }), body: z.object({
  enabled: z.boolean(), sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/), version: z.number().int().nonnegative().nullable(),
}).strict() })), async (req, res) => {
  res.json(successResponse({ publication: await service.setAdminOriginalPublication(String(req.params.projectId), req.user!.id, req.body) }));
});
originalAudioRouter.get('/admin/projects/:projectId/requests', authorize('ADMIN'), validate(z.object({ params: z.object({ projectId: id }) })), async (req, res) => {
  res.json(successResponse({ publications: await service.listOriginalRequests(String(req.params.projectId)) }));
});
