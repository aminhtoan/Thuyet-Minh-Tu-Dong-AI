import { api, ApiError } from '../../lib/api';
import type { TranslationGroup, GroupPlan, GroupDraft, GroupTranslation } from './groupTypes';
import type { CustomerAttempt } from './customerAttemptPresentation.mjs';
export type LegacyTranslationDto = { id: string; projectId: string; sourceLanguage: string; targetLanguage: string; fullText: string; alignmentFormat?: 'SEGMENTS_V1'; segments: { index: number; sourceSegmentId: string; text: string }[]; createdAt: string; updatedAt: string };
export const groupTranslationService = {
  async customerGenerate(projectId: string) {
    return (await api<{ draft: GroupDraft }>(`/projects/${projectId}/translations`, { method: 'POST', body: JSON.stringify({ targetLanguage: 'en', format: 'GROUPS_V1' }), signal: AbortSignal.timeout(150000) }, false)).draft;
  },
  async customerDraft(projectId: string, signal?: AbortSignal) {
    return (await api<{ draft: GroupDraft | null }>(`/projects/${projectId}/translations/customer-draft/en`, { signal }, false)).draft;
  },
  async customerState(projectId: string, signal?: AbortSignal) {
    return api<{ draft: GroupDraft | null; attempt: CustomerAttempt | null }>(`/projects/${projectId}/translations/customer-draft/en`, { signal }, false);
  },
  async saved(projectId: string, target: string, signal?: AbortSignal): Promise<GroupTranslation | LegacyTranslationDto | null> {
    try { return (await api<{ translation: GroupTranslation | LegacyTranslationDto }>(`/projects/${projectId}/translations/${encodeURIComponent(target)}?format=groups-v1`, { signal })).translation; }
    catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
  },
  async plan(projectId: string, target: string, signal?: AbortSignal) { return (await api<{ plan: GroupPlan }>(`/projects/${projectId}/translations/plan/${encodeURIComponent(target)}`, { signal })).plan; },
  async preview(projectId: string, plan: GroupPlan, groups: TranslationGroup[], idempotencyKey: string) {
    return (await api<{ draft: GroupDraft }>(`/projects/${projectId}/translations/preview`, { method: 'POST', body: JSON.stringify({ targetLanguage: plan.targetLanguage, sourceRevision: plan.sourceRevision, groupingVersion: plan.groupingVersion, groups: groups.map(g => g.sourceSegmentIds), idempotencyKey }) }, false)).draft;
  },
  async draft(projectId: string, draftId: string, signal?: AbortSignal) { return (await api<{ draft: GroupDraft }>(`/projects/${projectId}/translations/drafts/${encodeURIComponent(draftId)}`, { signal })).draft; },
  async approve(projectId: string, draft: GroupDraft) { return (await api<{ translation: GroupTranslation }>(`/projects/${projectId}/translations/drafts/${draft.draftId}/approve`, { method: 'POST', body: JSON.stringify({ outputDigest: draft.outputDigest, reviewed: true }) })).translation; },
};
