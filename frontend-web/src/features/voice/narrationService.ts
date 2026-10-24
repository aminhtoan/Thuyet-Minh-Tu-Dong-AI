import type { LanguageCode } from '../projects/types';
import { translationService } from '../translation/translationService';
import { api } from '../../lib/api';
import type { RequestOptions } from './types';
import { voiceService } from './voiceService';
import { translationRevision, validateNarrationConfig } from './voiceUtils';
import type { NarrationConfig } from './types';
import { confirmationMessages } from '../../localization/confirmationMessages.mjs';
import { requireConfirmation } from '../../utils/confirmationGuard.mjs';

type NarrationDto = { id: string; translationId: string; targetLanguage: string; voice: { id: string; name: string }; speed: number };

export const narrationService = {
  async getConfig(projectId: string, language?: LanguageCode, options: RequestOptions = {}): Promise<NarrationConfig | null> {
    const translation = await translationService.getSavedTranslation(projectId, language, { signal: options.signal });
    if (!translation) return null;
    const response = await api<{ narrations: NarrationDto[] }>(`/projects/${projectId}/narrations`, { signal: options.signal });
    const narration = [...response.narrations].reverse().find((item) => item.targetLanguage === translation.targetLanguage); if (!narration) return null;
    return { projectId, translationId: translation.id, languageCode: translation.targetLanguage, voiceId: narration.voice.id, speed: narration.speed, translationRevision: translationRevision(translation), narrationId: narration.id };
  },
  async saveConfig(projectId: string, config: NarrationConfig, options: RequestOptions = {}): Promise<NarrationConfig> {
    const voices = await voiceService.getVoices(config.languageCode, { signal: options.signal });
    const translation = await translationService.getSavedTranslation(projectId, config.languageCode, { signal: options.signal });
    if (!translation || config.projectId !== projectId || config.translationId !== translation.id ||
        config.translationRevision !== translationRevision(translation)) {
      throw new Error('Bản dịch đã thay đổi hoặc không còn khả dụng. Hãy quay lại Bản dịch rồi mở lại Giọng đọc.');
    }
    let effectiveConfig = config;
    if (!voices.some((v) => v.id === effectiveConfig.voiceId && v.isActive && v.languageCode === effectiveConfig.languageCode)) {
      const fallbackVoice = voices.find((v) => v.isActive && v.languageCode === effectiveConfig.languageCode) || voices[0];
      if (fallbackVoice) effectiveConfig = { ...effectiveConfig, voiceId: fallbackVoice.id };
    }
    const error = validateNarrationConfig(effectiveConfig, voices);
    if (error) throw new Error(error);
    requireConfirmation(window.confirm, confirmationMessages.narration);
    const response = await api<{ narration: NarrationDto }>(`/projects/${projectId}/narrations`, { method: 'POST', signal: options.signal, body: JSON.stringify({ targetLanguage: effectiveConfig.languageCode, voiceId: effectiveConfig.voiceId }) });
    return { ...effectiveConfig, speed: response.narration.speed, narrationId: response.narration.id };
  },
};
