import { AppError } from '../utils/app-error.js';

export const SOURCE_LANGUAGES = ['vi', 'en', 'ja', 'ko', 'zh'] as const;
export const SOURCE_LANGUAGE_MODES = ['AUTO', 'MANUAL'] as const;
export const SOURCE_LANGUAGE_STATUSES = ['PENDING_DETECTION', 'NEEDS_CONFIRMATION', 'CONFIRMED'] as const;
export type SourceLanguage = typeof SOURCE_LANGUAGES[number];
export type SourceLanguageMode = typeof SOURCE_LANGUAGE_MODES[number];
export type SourceLanguageState = {
  sourceLanguage?: string | null;
  sourceLanguageMode?: SourceLanguageMode | null;
  sourceLanguageStatus?: typeof SOURCE_LANGUAGE_STATUSES[number] | null;
  detectedSourceLanguage?: SourceLanguage | null;
};

export function sourceLanguageState(project: SourceLanguageState) {
  const mode = project.sourceLanguageMode ?? 'MANUAL';
  const status = project.sourceLanguageStatus ?? (mode === 'MANUAL' && project.sourceLanguage ? 'CONFIRMED' : 'PENDING_DETECTION');
  return { sourceLanguageMode: mode, sourceLanguage: project.sourceLanguage ?? null,
    detectedSourceLanguage: project.detectedSourceLanguage ?? null, sourceLanguageStatus: status };
}

export function assertSourceLanguageConfirmed(project: SourceLanguageState): asserts project is SourceLanguageState & { sourceLanguage: string } {
  const state = sourceLanguageState(project);
  if (state.sourceLanguageStatus !== 'CONFIRMED' || !state.sourceLanguage || ['auto', 'unknown'].includes(state.sourceLanguage)) {
    throw new AppError(409, 'SOURCE_LANGUAGE_UNCONFIRMED', 'Vui lòng xác nhận ngôn ngữ nguồn trước khi dịch.');
  }
}

// Only provider metadata may populate this channel. A language hint or inferred
// transcript content is NOT detection evidence. Gemini currently emits no such
// verified metadata through our adapter, so real AUTO results need confirmation.
export type LanguageDetection = { languageCode: string; evidence: 'PROVIDER_METADATA' };
export function resolveTranscribedLanguage(project: SourceLanguageState, detection?: LanguageDetection) {
  const { sourceLanguageMode } = sourceLanguageState(project);
  if (sourceLanguageMode === 'MANUAL') {
    assertSourceLanguageConfirmed(project);
    return { ...sourceLanguageState(project), sourceLanguageStatus: 'CONFIRMED' as const };
  }
  const aliases: Record<string, SourceLanguage> = { vi: 'vi', 'vi-vn': 'vi', en: 'en', 'en-us': 'en', 'en-gb': 'en', ja: 'ja', 'ja-jp': 'ja', ko: 'ko', 'ko-kr': 'ko', zh: 'zh', 'zh-cn': 'zh', 'zh-hans': 'zh', 'cmn-hans-cn': 'zh' };
  const code = detection?.evidence === 'PROVIDER_METADATA' && typeof detection.languageCode === 'string' ? aliases[detection.languageCode.toLowerCase()] : undefined;
  return { sourceLanguageMode, sourceLanguage: code ?? null, detectedSourceLanguage: code ?? null,
    sourceLanguageStatus: code ? 'CONFIRMED' as const : 'NEEDS_CONFIRMATION' as const };
}
