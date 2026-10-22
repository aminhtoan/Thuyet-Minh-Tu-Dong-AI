import type { RequestHandler } from 'express';
import * as service from '../services/translation-processing.service.js';
import { successResponse } from '../utils/api-response.js';
import { groupTranslationService } from '../services/translation/group-translation.service.js';
import type { GroupTranslationService } from '../services/translation/group-translation.service.js';
import type { GroupAdmission } from '../services/translation/group-admission.js';
import { groupResponseHandler } from '../services/translation/group-response.js';
import { AppError } from '../utils/app-error.js';
import { withCustomerTranslation } from '../services/translation/customer-scope.js';
const normalGroups = <T>(work: () => Promise<T>) => process.env.CUSTOMER_TRANSLATION_ENABLED === 'true' && !process.env.CONTROLLED_PROVIDER_MODE ? withCustomerTranslation(work) : work();

export const start: RequestHandler = async (request, response) => {
  const body = request.body as { targetLanguage: string; format?: string };
  if (body.format === 'GROUPS_V1' || (process.env.CUSTOMER_TRANSLATION_ENABLED === 'true' && !process.env.CONTROLLED_PROVIDER_MODE)) {
    if (body.targetLanguage !== 'en') throw new AppError(400, 'TRANSLATION_LANGUAGE_NOT_SUPPORTED', 'Luồng Customer hiện hỗ trợ dịch tiếng Anh.');
    response.json(successResponse({ draft: await groupTranslationService.customerGenerate(request.ownedProjectId!, request.user!.id) }));
    return;
  }
  response.json(successResponse(await service.translate(request.ownedProjectId ?? '', request.user?.id ?? '', body.targetLanguage)));
};
export const list: RequestHandler = async (request, response) => response.json(successResponse({ translations: await service.listTranslations(request.ownedProjectId ?? '') }));
export const get: RequestHandler = async (request, response) => response.json(successResponse({ translation: await service.getTranslation(request.ownedProjectId ?? '', String(request.params.targetLanguage ?? '').toLowerCase(), request.query.format === 'groups-v1') }));
export const plan: RequestHandler = async (req, res) => res.json(successResponse({ plan: await normalGroups(() => groupTranslationService.plan(req.ownedProjectId ?? '', req.user!.id, String(req.params.targetLanguage).toLowerCase())) }));
export const preview: RequestHandler = async (req, res) => {
  if (process.env.CUSTOMER_TRANSLATION_ENABLED === 'true' && !process.env.CONTROLLED_PROVIDER_MODE) throw new AppError(409, 'CUSTOMER_TRANSLATION_USE_STANDARD_API', 'Sử dụng API dịch Customer với kế hoạch do máy chủ tạo.');
  const draft = await normalGroups(() => groupTranslationService.preview(req.ownedProjectId ?? '', req.user!.id, req.body));
  res.json(successResponse({ draft }));
};
export const customerDraft: RequestHandler = async (req, res) => res.json(successResponse(await groupTranslationService.customerState(req.ownedProjectId!, req.user!.id)));
export const draft: RequestHandler = async (req, res) => res.json(successResponse({ draft: await normalGroups(async () => {
  if (process.env.CUSTOMER_TRANSLATION_ENABLED === 'true' && !process.env.CONTROLLED_PROVIDER_MODE) await groupTranslationService.customerDraft(req.ownedProjectId!, req.user!.id);
  return groupTranslationService.draft(req.ownedProjectId ?? '', req.user!.id, String(req.params.draftId));
}) }));
export const approve: RequestHandler = async (req, res) => res.json(successResponse(await normalGroups(async () => {
  if (process.env.CUSTOMER_TRANSLATION_ENABLED === 'true' && !process.env.CONTROLLED_PROVIDER_MODE) await groupTranslationService.customerDraft(req.ownedProjectId!, req.user!.id);
  return groupTranslationService.approve(req.ownedProjectId ?? '', req.user!.id, String(req.params.draftId), req.body);
})));

// Explicit isolated-test injection only. Default exports above remain unchanged.
// All callers must still pass the router's JWT/RBAC/ownership/validation layers.
export function groupProfileControllers(groups: GroupTranslationService, admission: GroupAdmission) {
  return {
    plan: groupResponseHandler(admission, async req => successResponse({ plan: await groups.plan(req.ownedProjectId!, req.user!.id, String(req.params.targetLanguage).toLowerCase()) })),
    preview: groupResponseHandler(admission, async req => successResponse({ draft: await groups.preview(req.ownedProjectId!, req.user!.id, req.body) })),
    draft: groupResponseHandler(admission, async req => successResponse({ draft: await groups.readDraft(req.ownedProjectId!, req.user!.id, String(req.params.draftId)) })),
    approve: groupResponseHandler(admission, async req => successResponse(await groups.approve(req.ownedProjectId!, req.user!.id, String(req.params.draftId), req.body))),
    get: groupResponseHandler(admission, async req => {
      if (req.query.format !== 'groups-v1') throw new AppError(409, 'TRANSLATION_FORMAT_UNSUPPORTED', 'Cần yêu cầu định dạng GROUPS_V1.');
      return successResponse({ translation: await groups.approved(req.ownedProjectId!, req.user!.id, String(req.params.targetLanguage).toLowerCase()) });
    }),
  };
}
