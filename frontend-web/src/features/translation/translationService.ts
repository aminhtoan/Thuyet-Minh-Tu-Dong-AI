import { ApiError, api } from '../../lib/api';
import type { LanguageCode } from '../projects/types';
import { projectRepository } from '../projects/projectRepository';
import { transcriptService } from '../transcript/transcriptService';
import type { Transcript } from '../transcript/types';
import type { Translation } from './types';
import { confirmationMessages } from '../../localization/confirmationMessages.mjs';
import { requireConfirmation } from '../../utils/confirmationGuard.mjs';
import { mapTranslationSegments } from './translationPresentation.mjs';
import { groupTranslationService } from './groupTranslationService';
import type { SavedGroupTranslation } from './groupTypes';
export type SavedTranslation = Translation | SavedGroupTranslation;

type Options = { signal?: AbortSignal };
type TranslationDto = { id: string; projectId: string; sourceLanguage: string; targetLanguage: string; fullText: string; segments: Array<{ index: number; sourceSegmentId: string; text: string }>; createdAt: string; updatedAt: string };
type TranslationSummary = Omit<TranslationDto, 'segments'>;
async function map(projectId: string, dto: any, options: Options): Promise<Translation> {
  const transcript = await transcriptService.getTranscript(projectId, options);
  if (!transcript) throw new Error('Không tìm thấy bản ghi nguồn.');
  const segments = dto.groups
    ? dto.groups.map((g: any, i: number) => ({ index: i, sourceSegmentId: g.sourceSegmentIds?.[0] ?? transcript.segments[i]?.id ?? g.groupId, text: g.translatedText }))
    : (dto.segments ?? []);
  return { id: dto.id, projectId, sourceLanguage: dto.sourceLanguage, targetLanguage: dto.targetLanguage, status: 'SAVED', sourceRevision: transcript.updatedAt, createdAt: dto.createdAt, updatedAt: dto.updatedAt, segments: mapTranslationSegments(dto.id, segments, transcript.segments) };
}

export const translationService = {
  async getSavedTranslation(projectId: string, target?: LanguageCode, options: Options = {}): Promise<SavedTranslation | null> {
    if (target) {
      const dto = await groupTranslationService.saved(projectId, target, options.signal);
      if (!dto) return null;
      return dto.alignmentFormat === 'GROUPS_V1' ? { ...dto, status: 'SAVED' } : map(projectId, dto, options);
    }
    const response = await api<{ translations: TranslationSummary[] }>(`/projects/${projectId}/translations`, { signal: options.signal });
    const latest = [...response.translations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    return latest ? this.getSavedTranslation(projectId, latest.targetLanguage, options) : null;
  },
  async get(projectId: string, target: LanguageCode, options: Options = {}): Promise<Translation | null> {
    try { const response = await api<{ translation: TranslationDto }>(`/projects/${projectId}/translations/${encodeURIComponent(target)}?format=groups-v1`, { signal: options.signal }); return map(projectId, response.translation, options) }
    catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error }
  },

  async translate(projectId: string, _transcript: Transcript, target: LanguageCode, options: Options = {}): Promise<Translation> {
    requireConfirmation(window.confirm, confirmationMessages.translation(target));
    const response = await api<{ translation: TranslationDto }>(`/projects/${projectId}/translations`, { method: 'POST', signal: options.signal, body: JSON.stringify({ targetLanguage: target, format: 'DIRECT_GROUPS_V1' }) });
    await projectRepository.refresh(); return map(projectId, response.translation, options);

  },
  async save(_projectId: string, _draft: Translation, _options: Options = {}): Promise<Translation> { throw new Error('Máy chủ chưa hỗ trợ lưu chỉnh sửa bản dịch.'); },
};
