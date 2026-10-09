import { ApiError, api } from '../../lib/api';
import type { LanguageCode } from '../projects/types';
import { projectRepository } from '../projects/projectRepository';
import { transcriptService } from '../transcript/transcriptService';
import type { Transcript } from '../transcript/types';
import type { Translation } from './types';

type Options = { signal?: AbortSignal };
type TranslationDto = { id: string; projectId: string; sourceLanguage: string; targetLanguage: string; fullText: string; segments: Array<{ index: number; sourceSegmentId: string; text: string }>; createdAt: string; updatedAt: string };
type TranslationSummary = Omit<TranslationDto, 'segments'>;
async function map(projectId: string, dto: TranslationDto, options: Options): Promise<Translation> { const transcript = await transcriptService.getTranscript(projectId, options); if (!transcript) throw new Error('Không tìm thấy bản ghi nguồn.'); return { id: dto.id, projectId, sourceLanguage: dto.sourceLanguage, targetLanguage: dto.targetLanguage, status: 'SAVED', sourceRevision: transcript.updatedAt, createdAt: dto.createdAt, updatedAt: dto.updatedAt, segments: dto.segments.map((segment) => { const source = transcript.segments[segment.index]; return { id: `${dto.id}-${segment.index}`, transcriptSegmentId: source?.id ?? segment.sourceSegmentId, sequence: segment.index + 1, startTime: source?.startTime ?? 0, endTime: source?.endTime ?? 0, translatedText: segment.text }; }) }; }

export const translationService = {
  async getSavedTranslation(projectId: string, target?: LanguageCode, options: Options = {}): Promise<Translation | null> {
    if (target) return this.get(projectId, target, options);
    const response = await api<{ translations: TranslationSummary[] }>(`/projects/${projectId}/translations`, { signal: options.signal });
    const latest = [...response.translations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    return latest ? this.get(projectId, latest.targetLanguage, options) : null;
  },
  async get(projectId: string, target: LanguageCode, options: Options = {}): Promise<Translation | null> {
    try { const response = await api<{ translation: TranslationDto }>(`/projects/${projectId}/translations/${encodeURIComponent(target)}`, { signal: options.signal }); return map(projectId, response.translation, options) }
    catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error }
  },
  async translate(projectId: string, _transcript: Transcript, target: LanguageCode, options: Options = {}): Promise<Translation> {
    if (!window.confirm(`Bắt đầu dịch sang ${target.toUpperCase()}? Thao tác này có thể sử dụng dịch vụ AI tính phí.`)) throw new DOMException('Đã hủy', 'AbortError');
    const response = await api<{ translation: TranslationDto }>(`/projects/${projectId}/translations`, { method: 'POST', signal: options.signal, body: JSON.stringify({ targetLanguage: target }) });
    await projectRepository.refresh(); return map(projectId, response.translation, options);
  },
  async save(_projectId: string, _draft: Translation, _options: Options = {}): Promise<Translation> { throw new Error('Backend chưa hỗ trợ lưu chỉnh sửa bản dịch.'); },
};
