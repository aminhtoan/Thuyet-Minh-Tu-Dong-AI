import type { Transcript } from '../transcript/types';
import type { Translation } from './types';

export function transcriptRevision(transcript: Transcript): string {
  return JSON.stringify([transcript.id, transcript.languageCode, transcript.segments]);
}

export function validateTranslation(translation: Translation): Record<string, string> {
  return Object.fromEntries(translation.segments
    .filter((segment) => !segment.translatedText.trim())
    .map((segment) => [segment.id, 'Translation cannot be empty.']));
}

export function hasTranslationChanges(draft: Translation | null, saved: Translation | null): boolean {
  if (!draft) return false;
  if (!saved) return true;
  return draft.targetLanguage !== saved.targetLanguage ||
    draft.segments.length !== saved.segments.length ||
    draft.segments.some((segment, index) => segment.id !== saved.segments[index]?.id ||
      segment.translatedText !== saved.segments[index]?.translatedText);
}

export function isTranslationAligned(translation: Translation, transcript: Transcript): boolean {
  return translation.projectId === transcript.projectId &&
    translation.sourceLanguage === transcript.languageCode &&
    translation.sourceRevision === transcriptRevision(transcript) &&
    translation.segments.length === transcript.segments.length &&
    new Set(translation.segments.map((segment) => segment.id)).size === translation.segments.length &&
    translation.segments.every((segment, index) => {
      const source = transcript.segments[index];
      return segment.transcriptSegmentId === source.id && segment.sequence === source.sequence &&
        segment.startTime === source.startTime && segment.endTime === source.endTime;
    });
}

export function copyTranslation(translation: Translation): Translation {
  return { ...translation, segments: translation.segments.map((segment) => ({ ...segment })) };
}
