import { ApiError, api } from '../../lib/api';
import { confirmAction } from '../../lib/confirm';
import { confirmationMessages } from '../../localization/confirmationMessages.mjs';
import { projectRepository } from '../projects/projectRepository';
import type { LanguageCode } from '../projects/types';
import type { Transcript } from '../transcript/types';
import { transcriptRevision } from './translationUtils';
import type { Translation } from './types';
type Options = { signal?: AbortSignal };
type TranslationDto = { id: string; projectId: string; sourceLanguage: string; targetLanguage: string; createdAt: string; updatedAt: string; segments?: { id: string; transcriptSegmentId: string; index: number; translatedText: string }[]; groups?: { groupId: string; sourceSegmentIds: string[]; sequence: number; startTime: number; endTime: number; translatedText: string }[] };
const map = (value: TranslationDto, transcript: Transcript): Translation => {
  const segments = value.groups
    ? value.groups.map((g, index) => ({
        id: g.groupId,
        transcriptSegmentId: g.sourceSegmentIds?.[0] ?? transcript.segments[index]?.id ?? g.groupId,
        sequence: g.sequence ?? index + 1,
        startTime: g.startTime ?? 0,
        endTime: g.endTime ?? 0,
        translatedText: g.translatedText ?? '',
      }))
    : (value.segments ?? []).map((segment) => {
        const source = transcript.segments.find((item) => item.id === segment.transcriptSegmentId) ?? transcript.segments[segment.index];
        return {
          id: segment.id,
          transcriptSegmentId: segment.transcriptSegmentId,
          sequence: segment.index,
          startTime: source?.startTime ?? 0,
          endTime: source?.endTime ?? 0,
          translatedText: segment.translatedText ?? '',
        };
      });
  return {
    id: value.id,
    projectId: value.projectId,
    sourceLanguage: value.sourceLanguage,
    targetLanguage: value.targetLanguage,
    status: 'SAVED',
    sourceRevision: transcriptRevision(transcript),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    segments,
  };
};
export const translationService = {
  async getSavedTranslation(projectId: string, target?: LanguageCode, options: Options = {}) {
    if (target) return this.get(projectId, target, options);
    const response = await api<{ translations: Array<{ id: string; targetLanguage: string; updatedAt: string }> }>(`/projects/${projectId}/translations`, { signal: options.signal });
    const selected = [...response.translations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    return selected ? this.get(projectId, selected.targetLanguage as LanguageCode, options) : null;
  },
  async get(projectId: string, target: LanguageCode, options: Options = {}) {
    const transcript = await (await import('../transcript/transcriptService')).transcriptService.getTranscript(projectId, options);
    if (!transcript) return null;
    try {
      const response = await api<{ translation: TranslationDto }>(`/projects/${projectId}/translations/${encodeURIComponent(target)}?format=groups-v1`, { signal: options.signal });
      return map(response.translation, transcript);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },
  async translate(projectId: string, transcript: Transcript, target: LanguageCode, options: Options = {}) {
    if (!await confirmAction('Dịch bản ghi', confirmationMessages.translation(target))) throw new Error('Đã hủy thao tác.');
    const response = await api<{ translation: TranslationDto }>(`/projects/${projectId}/translations`, { method: 'POST', signal: options.signal, body: JSON.stringify({ targetLanguage: target, format: 'DIRECT_GROUPS_V1' }) });
    await projectRepository.refresh();

    return map(response.translation, transcript);
  },
  async save(_projectId?: string, _draft?: Translation, _options?: Options) { throw new Error('Máy chủ chưa hỗ trợ chỉnh sửa bản dịch.'); },
};

