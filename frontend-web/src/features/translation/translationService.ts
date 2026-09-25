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
    if (signal?.aborted) { reject(new Error('Operation cancelled.')); return; }
    const onAbort = () => { clearTimeout(timer); reject(new Error('Operation cancelled.')); };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      if (fail) reject(new Error('Unable to complete this translation operation. Please retry.'));
      else resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function requireTarget(transcript: Transcript, target: LanguageCode) {
  if (!isLanguageCode(target) || target === transcript.languageCode) {
    throw new Error('Choose a target language different from the source language.');
  }
}

async function requireSavedTranscript(projectId: string, options: MockOptions): Promise<Transcript> {
  const transcript = await transcriptService.getTranscript(projectId, { signal: options.signal });
  if (!transcript || transcript.status !== 'SAVED' || !transcript.segments.length ||
      transcript.segments.some((segment) => !segment.text.trim())) {
    throw new Error('Save a valid transcript before translating.');
  }
  return transcript;
}

export const translationService = {
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
      throw new Error('The transcript changed. Return to Transcript and reopen Translation.');
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
      throw new Error('The source transcript changed. Return to Transcript and reopen Translation.');
    }
    if (!draft.segments.length || Object.keys(validateTranslation(draft)).length) {
      throw new Error('Correct empty translations before saving.');
    }
    const saved: Translation = {
      ...draft, status: 'SAVED', updatedAt: new Date().toISOString(),
      segments: draft.segments.map((segment) => ({ ...segment, translatedText: segment.translatedText.trim() })),
    };
    savedTranslations.set(storageKey(projectId, saved.targetLanguage), copyTranslation(saved));
    return copyTranslation(saved);
  },
};
