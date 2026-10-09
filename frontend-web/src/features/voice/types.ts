import type { LanguageCode } from '../projects/types';
export type RequestOptions = { signal?: AbortSignal };

export type VoiceGender = 'Female' | 'Male' | 'Neutral';
export type VoiceFilter = 'All' | VoiceGender;
export type Voice = {
  id: string;
  name: string;
  languageCode: LanguageCode;
  gender: VoiceGender;
  description: string;
  isActive: boolean;
  previewUrl?: string;
};
export type NarrationConfig = {
  projectId: string;
  translationId: string;
  languageCode: LanguageCode;
  voiceId: string;
  speed: number;
  // Mock revision guard; no audio path exists in the configuration sprint.
  translationRevision: string;
  narrationId?: string;
};
export type VoiceEditorStatus = 'LOADING' | 'READY' | 'SAVING' | 'SAVED' | 'FAILED';
