import type { LanguageCode } from '../projects/types';

export type VoiceGender = 'Female' | 'Male';
export type VoiceFilter = 'All' | VoiceGender;
export type Voice = {
  id: string;
  name: string;
  languageCode: LanguageCode;
  gender: VoiceGender;
  description: string;
  isActive: boolean;
};
export type NarrationConfig = {
  projectId: string;
  translationId: string;
  languageCode: LanguageCode;
  voiceId: string;
  speed: number;
  // Mock revision guard; no audio path exists in the configuration sprint.
  translationRevision: string;
};
export type VoiceEditorStatus = 'LOADING' | 'READY' | 'SAVING' | 'SAVED' | 'FAILED';
