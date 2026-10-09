import type { LanguageCode } from '../projects/types';
import type { Translation } from '../translation/types';
import type { NarrationConfig, Voice, VoiceFilter } from './types';

export const MIN_SPEED = 0.5;
export const MAX_SPEED = 2;
export const speedPresets = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export const voiceFilters: readonly VoiceFilter[] = ['All', 'Female', 'Male', 'Neutral'];

export function filterVoicesByLanguage(voices: readonly Voice[], language: LanguageCode): Voice[] {
  return voices.filter((voice) => voice.isActive && voice.languageCode === language);
}
export function filterVoicesByGender(voices: readonly Voice[], gender: VoiceFilter, query = ''): Voice[] {
  const normalized = query.trim().toLocaleLowerCase();
  return voices.filter((voice) => voice.isActive && (gender === 'All' || voice.gender === gender) &&
    (!normalized || voice.name.toLocaleLowerCase().includes(normalized)));
}
export function isValidSpeed(speed: number): boolean {
  return Number.isFinite(speed) && speed >= MIN_SPEED && speed <= MAX_SPEED;
}
export function formatSpeed(speed: number): string {
  return (Number.isInteger(speed) ? speed.toFixed(1) : String(speed)) + 'x';
}
export function translationRevision(translation: Translation): string {
  return JSON.stringify([translation.id, translation.sourceRevision, translation.targetLanguage, translation.segments]);
}
export function createNarrationConfig(translation: Translation): NarrationConfig {
  return { projectId: translation.projectId, translationId: translation.id, languageCode: translation.targetLanguage,
    voiceId: '', speed: 1, translationRevision: translationRevision(translation) };
}
export function validateNarrationConfig(config: NarrationConfig, voices: readonly Voice[]): string | null {
  if (!config.projectId || !config.translationId || !config.languageCode) return 'Cần có bản dịch đã lưu.';
  if (!config.voiceId) return 'Hãy chọn giọng đọc trước khi lưu.';
  if (!voices.some((voice) => voice.id === config.voiceId && voice.isActive && voice.languageCode === config.languageCode)) {
    return 'Hãy chọn giọng đọc khả dụng cho ngôn ngữ bản dịch.';
  }
  if (!isValidSpeed(config.speed)) return 'Tốc độ giọng đọc phải nằm trong khoảng từ 0.5x đến 2.0x.';
  return null;
}
export function hasNarrationConfigChanges(draft: NarrationConfig | null, saved: NarrationConfig | null): boolean {
  if (!draft) return false;
  return draft.voiceId !== (saved?.voiceId ?? '') || draft.speed !== (saved?.speed ?? 1);
}
