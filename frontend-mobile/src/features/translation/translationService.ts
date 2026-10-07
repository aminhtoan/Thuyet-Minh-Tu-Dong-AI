import { isLanguageCode } from '../projects/languages';
import type { LanguageCode } from '../projects/types';
import { transcriptService } from '../transcript/transcriptService';
import type { Transcript } from '../transcript/types';
import { getMockTranslatedText } from './mockTranslationData';
import { copyTranslation, isTranslationAligned, transcriptRevision, validateTranslation } from './translationUtils';
import type { Translation } from './types';

type MockOptions = { signal?: AbortSignal; fail?: boolean };
const savedTranslations = new Map<string, Translation>();
const storageKey = (projectId: string, target: LanguageCode) => projectId + ':' + target;

function waitForMock(ms: number, { signal, fail }: MockOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error('Đã hủy thao tác.')); return; }
    const onAbort = () => { clearTimeout(timer); reject(new Error('Đã hủy thao tác.')); };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      if (fail) reject(new Error('Không thể hoàn tất thao tác dịch. Vui lòng thử lại.'));
      else resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function requireTarget(transcript: Transcript, target: LanguageCode) {
  if (!isLanguageCode(target) || target === transcript.languageCode) {
    throw new Error('Hãy chọn ngôn ngữ đích khác ngôn ngữ nguồn.');
  }
}

async function requireSavedTranscript(projectId: string, options: MockOptions): Promise<Transcript> {
  const transcript = await transcriptService.getTranscript(projectId, { signal: options.signal });
  if (!transcript || transcript.status !== 'SAVED' || !transcript.segments.length ||
      transcript.segments.some((segment) => !segment.text.trim())) {
    throw new Error('Hãy lưu bản ghi hợp lệ trước khi dịch.');
  }
  return transcript;
}

export const translationService = {
  async getSavedTranslation(projectId: string, target?: LanguageCode, options: MockOptions = {}): Promise<Translation | null> {
    await waitForMock(200, options);
    const transcript = await transcriptService.getTranscript(projectId, { signal: options.signal });
    if (!transcript || transcript.status !== 'SAVED') return null;
    const candidates = [...savedTranslations.values()].filter((translation) =>
      translation.projectId === projectId && (!target || translation.targetLanguage === target) &&
      isTranslationAligned(translation, transcript));
    const latest = candidates.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    return latest ? copyTranslation(latest) : null;
  },
  async get(projectId: string, target: LanguageCode, options: MockOptions = {}): Promise<Translation | null> {
    await waitForMock(250, options);
    const transcript = await requireSavedTranscript(projectId, options);
    requireTarget(transcript, target);
    const saved = savedTranslations.get(storageKey(projectId, target));
    // A reviewed transcript may have changed since the translation was saved.
    return saved && isTranslationAligned(saved, transcript) ? copyTranslation(saved) : null;
  },
  async translate(projectId: string, transcript: Transcript, target: LanguageCode, options: MockOptions = {}): Promise<Translation> {
    await waitForMock(900, options);
    const source = await requireSavedTranscript(projectId, options);
    requireTarget(source, target);
    if (transcript.projectId !== projectId || transcriptRevision(transcript) !== transcriptRevision(source)) {
      throw new Error('Bản ghi đã thay đổi. Hãy quay lại Bản ghi rồi mở lại Bản dịch.');
    }
    const now = new Date().toISOString();
    return {
      id: projectId + '-translation-' + target, projectId,
      sourceLanguage: source.languageCode, targetLanguage: target, sourceRevision: transcriptRevision(source),
      status: 'READY', createdAt: now, updatedAt: now,
      segments: source.segments.map((segment) => ({
        id: segment.id + '-' + target, transcriptSegmentId: segment.id,
        sequence: segment.sequence, startTime: segment.startTime, endTime: segment.endTime,
        translatedText: getMockTranslatedText(source.languageCode, target, segment.text, segment.sequence),
      })),
    };
  },
  async save(projectId: string, draft: Translation, options: MockOptions = {}): Promise<Translation> {
    await waitForMock(400, options);
    const transcript = await requireSavedTranscript(projectId, options);
    requireTarget(transcript, draft.targetLanguage);
    if (!isTranslationAligned(draft, transcript)) {
      throw new Error('Bản ghi nguồn đã thay đổi. Hãy quay lại Bản ghi rồi mở lại Bản dịch.');
    }
    if (!draft.segments.length || Object.keys(validateTranslation(draft)).length) {
      throw new Error('Hãy bổ sung các bản dịch còn trống trước khi lưu.');
    }
    const saved: Translation = {
      ...draft, status: 'SAVED', updatedAt: new Date().toISOString(),
      segments: draft.segments.map((segment) => ({ ...segment, translatedText: segment.translatedText.trim() })),
    };
    savedTranslations.set(storageKey(projectId, saved.targetLanguage), copyTranslation(saved));
    return copyTranslation(saved);
  },
};
