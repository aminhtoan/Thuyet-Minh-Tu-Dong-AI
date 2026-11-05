import { z } from 'zod';
import { CUSTOMER_TRANSLATION_TARGETS } from '../services/translation/customer-languages.js';

const languageCode = z.string().trim().toLowerCase().regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i, 'Ngôn ngữ đích không hợp lệ.').max(20);

export const startTranslationSchema = z.object({ body: z.object({ targetLanguage: languageCode, format: z.enum(['GROUPS_V1', 'DIRECT_GROUPS_V1']).optional() }).strict() });

export const targetTranslationSchema = z.object({ query: z.object({ format: z.literal('groups-v1').optional() }), params: z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'ID dự án không hợp lệ.'),
  targetLanguage: languageCode,
}) });
const projectParams = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) });
const draftParams = projectParams.extend({ draftId: z.string().uuid() });
export const previewTranslationSchema = z.object({ params: projectParams, body: z.object({
  targetLanguage: languageCode, sourceRevision: z.string().regex(/^[a-f0-9]{64}$/), groupingVersion: z.literal('phrase-candidates-v1'),
  groups: z.array(z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1).max(10_000)).min(1).max(1000), idempotencyKey: z.string().uuid(),
}).strict() });
const customerTargetQuery = z.object({ targetLanguage: z.enum(CUSTOMER_TRANSLATION_TARGETS).optional() });
// Generic GROUPS_V1/profile routes keep their existing catalog-language contract.
// Customer-only services enforce the four-language allowlist independently.
const draftTargetQuery = z.object({ targetLanguage: languageCode.optional() });
export const simplePreflightSchema = z.object({ query: customerTargetQuery });
export const customerDraftSchema = z.object({ params: projectParams.extend({ targetLanguage: z.enum(CUSTOMER_TRANSLATION_TARGETS) }) });
export const draftTranslationSchema = z.object({ params: draftParams, query: draftTargetQuery.optional() });
export const approveTranslationSchema = z.object({ params: draftParams, query: draftTargetQuery.optional(), body: z.object({ outputDigest: z.string().regex(/^[a-f0-9]{64}$/), reviewed: z.literal(true) }).strict() });
