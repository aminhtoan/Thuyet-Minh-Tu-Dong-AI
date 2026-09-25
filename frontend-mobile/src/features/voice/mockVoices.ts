import type { Voice } from './types';

// Development-only identities, not a provider voice catalog.
export const mockVoices: readonly Voice[] = [
  { id: 'voice-en-aria', name: 'Aria', languageCode: 'en', gender: 'Female', description: 'Natural and clear narration.', isActive: true },
  { id: 'voice-en-guy', name: 'Guy', languageCode: 'en', gender: 'Male', description: 'Warm and professional delivery.', isActive: true },
  { id: 'voice-en-jenny', name: 'Jenny', languageCode: 'en', gender: 'Female', description: 'Friendly and conversational tone.', isActive: true },
  { id: 'voice-ja-nanami', name: 'Nanami', languageCode: 'ja', gender: 'Female', description: 'Clear Japanese narration.', isActive: true },
  { id: 'voice-ja-keita', name: 'Keita', languageCode: 'ja', gender: 'Male', description: 'Professional Japanese delivery.', isActive: true },
  { id: 'voice-ko-sunhi', name: 'SunHi', languageCode: 'ko', gender: 'Female', description: 'Natural Korean narration.', isActive: true },
  { id: 'voice-ko-injoon', name: 'InJoon', languageCode: 'ko', gender: 'Male', description: 'Professional Korean delivery.', isActive: true },
  { id: 'voice-vi-linh', name: 'Linh', languageCode: 'vi', gender: 'Female', description: 'Clear and friendly Vietnamese narration.', isActive: true },
  { id: 'voice-vi-minh', name: 'Minh', languageCode: 'vi', gender: 'Male', description: 'Warm Vietnamese narration.', isActive: true },
  { id: 'voice-en-inactive', name: 'Archived sample', languageCode: 'en', gender: 'Male', description: 'Unavailable development sample.', isActive: false },
];
