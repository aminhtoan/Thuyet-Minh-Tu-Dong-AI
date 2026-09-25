import type { LanguageCode } from '../projects/types';
import { mockVoices } from './mockVoices';
import { waitForMock, type MockOptions } from './mockAsync';
import { filterVoicesByLanguage } from './voiceUtils';
import type { Voice } from './types';

export const voiceService = {
  async getVoices(languageCode: LanguageCode, options: MockOptions = {}): Promise<Voice[]> {
    await waitForMock(350, options);
    return filterVoicesByLanguage(mockVoices, languageCode).map((voice) => ({ ...voice }));
  },
  async getVoice(id: string, options: MockOptions = {}): Promise<Voice | null> {
    await waitForMock(150, options);
    const voice = mockVoices.find((candidate) => candidate.id === id && candidate.isActive);
    return voice ? { ...voice } : null;
  },
  async previewVoice(id: string, options: MockOptions = {}): Promise<void> {
    if (!await this.getVoice(id, options)) throw new Error('This voice is not available.');
    // No audio is played. The abortable duration drives a labelled preview simulation.
    await waitForMock(2400, options);
  },
};
