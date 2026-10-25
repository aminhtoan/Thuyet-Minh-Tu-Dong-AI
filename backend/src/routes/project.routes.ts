import { Router } from 'express';
import * as mediaController from '../controllers/media.controller.js';
import { streamSourceMedia } from '../controllers/source-media.controller.js';
import * as projectController from '../controllers/project.controller.js';
import * as transcriptionController from '../controllers/transcription.controller.js';
import * as translationController from '../controllers/translation.controller.js';
import * as narrationController from '../controllers/narration.controller.js';
import * as resultController from '../controllers/result.controller.js';
import { authenticate } from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { requireProjectOwner } from '../middleware/project-owner.middleware.js';
import { uploadMedia } from '../middleware/upload.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createProjectSchema, listProjectsSchema, projectIdSchema, updateProjectSchema } from '../validators/project.validator.js';
import { startTranslationSchema, targetTranslationSchema, previewTranslationSchema, draftTranslationSchema, approveTranslationSchema } from '../validators/translation.validator.js';
import { narrationIdSchema, startNarrationSchema } from '../validators/narration.validator.js';
import { processMediaSchema, resultIdSchema } from '../validators/result.validator.js';
import { updateTranscriptSegmentSchema } from '../validators/transcription.validator.js';
import { readOnlyTranslationDiagnostic } from '../services/translation/read-only-diagnostic.js';
import { customerSimplePreflight } from '../services/translation/customer-simple-preflight.js';
import { AppError } from '../utils/app-error.js';
import { successResponse } from '../utils/api-response.js';

export function createProjectRouter(groups: Pick<typeof translationController, 'plan' | 'preview' | 'draft' | 'approve' | 'get'> = translationController) {
const projectRouter = Router();

// Public endpoints: allow museum visitors to discover and listen to published audio guides
projectRouter.get('/public-audio-guides', projectController.publicAudioGuides);
projectRouter.get('/public-audio/:projectId/:narrationId', narrationController.publicAudio);

projectRouter.use(authenticate, authorize('CUSTOMER', 'ADMIN'));
projectRouter.get('/:id/translations/simple-preflight', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (process.env.NODE_ENV !== 'development') return next(new AppError(404, 'DIAGNOSTIC_NOT_AVAILABLE', 'Không tìm thấy kiểm tra.'));
  next();
}, requireProjectOwner, async (req, res) => {
  res.json(successResponse(await customerSimplePreflight(req.ownedProjectId!, req.user!.id)));
});
projectRouter.get('/:id/translations/read-only-diagnostic', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (process.env.NODE_ENV !== 'development') return next(new AppError(404, 'DIAGNOSTIC_NOT_AVAILABLE', 'Không tìm thấy chẩn đoán.'));
  next();
}, requireProjectOwner, async (req, res) => {
  res.json(successResponse(await readOnlyTranslationDiagnostic(req.ownedProjectId!)));
});
projectRouter.post('/', validate(createProjectSchema), projectController.create);
projectRouter.get('/', validate(listProjectsSchema), projectController.list);
projectRouter.get('/:id', validate(projectIdSchema), projectController.get);
projectRouter.patch('/:id', validate(updateProjectSchema), projectController.update);
projectRouter.delete('/:id', validate(projectIdSchema), projectController.remove);
projectRouter.get('/:id/language-variants', validate(projectIdSchema), requireProjectOwner, projectController.languageVariants);
projectRouter.post('/:id/branch-language', validate(projectIdSchema), requireProjectOwner, projectController.branchLanguage);
projectRouter.post('/:id/media', requireProjectOwner, uploadMedia, mediaController.upload);
projectRouter.get('/:id/media', requireProjectOwner, mediaController.get);
projectRouter.get('/:id/media/file', requireProjectOwner, streamSourceMedia);
projectRouter.delete('/:id/media', requireProjectOwner, mediaController.remove);
projectRouter.post('/:id/transcription', requireProjectOwner, transcriptionController.start);
projectRouter.get('/:id/transcript', requireProjectOwner, transcriptionController.get);
projectRouter.patch('/:id/transcript/segments/:segmentId', validate(updateTranscriptSegmentSchema), requireProjectOwner, transcriptionController.updateSegment);
projectRouter.post('/:id/translations', validate(startTranslationSchema), requireProjectOwner, translationController.start);
projectRouter.get('/:id/translations', requireProjectOwner, translationController.list);
projectRouter.get('/:id/translations/customer-draft/en', requireProjectOwner, translationController.customerDraft);
projectRouter.get('/:id/translations/plan/:targetLanguage', validate(targetTranslationSchema), requireProjectOwner, groups.plan);
projectRouter.post('/:id/translations/preview', validate(previewTranslationSchema), requireProjectOwner, groups.preview);
projectRouter.get('/:id/translations/drafts/:draftId', validate(draftTranslationSchema), requireProjectOwner, groups.draft);
projectRouter.post('/:id/translations/drafts/:draftId/approve', validate(approveTranslationSchema), requireProjectOwner, groups.approve);
projectRouter.get('/:id/translations/:targetLanguage', validate(targetTranslationSchema), requireProjectOwner, groups.get);
projectRouter.post('/:id/narrations', validate(startNarrationSchema), requireProjectOwner, narrationController.start);
projectRouter.get('/:id/narrations', requireProjectOwner, narrationController.list);
projectRouter.get('/:id/narrations/:narrationId', validate(narrationIdSchema), requireProjectOwner, narrationController.get);
projectRouter.get('/:id/narrations/:narrationId/audio', validate(narrationIdSchema), requireProjectOwner, narrationController.audio);
projectRouter.post('/:id/process', validate(processMediaSchema), requireProjectOwner, resultController.process);
projectRouter.get('/:id/results', requireProjectOwner, resultController.list);
projectRouter.get('/:id/results/:resultId', validate(resultIdSchema), requireProjectOwner, resultController.get);
projectRouter.get('/:id/results/:resultId/file', validate(resultIdSchema), requireProjectOwner, resultController.file);
return projectRouter;
}
export const projectRouter = createProjectRouter();
