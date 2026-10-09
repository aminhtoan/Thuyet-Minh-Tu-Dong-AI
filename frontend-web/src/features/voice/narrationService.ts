import type { LanguageCode } from '../projects/types';
import { translationService } from '../translation/translationService';
import { api } from '../../lib/api';
import type { RequestOptions } from './types';
import { voiceService } from './voiceService';
import { translationRevision, validateNarrationConfig } from './voiceUtils';
import type { NarrationConfig } from './types';

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
      throw new Error('The saved translation changed or is unavailable. Return to Translation and reopen Voice.');
    }
    const error = validateNarrationConfig(config, voices);
    if (error) throw new Error(error);
    if (!window.confirm('Tạo âm thanh thuyết minh bằng giọng đọc đã chọn? Thao tác này có thể sử dụng dịch vụ AI tính phí.')) throw new DOMException('Đã hủy', 'AbortError');
    const response = await api<{ narration: NarrationDto }>(`/projects/${projectId}/narrations`, { method: 'POST', signal: options.signal, body: JSON.stringify({ targetLanguage: config.languageCode, voiceId: config.voiceId }) });
    return { ...config, speed: response.narration.speed, narrationId: response.narration.id };
  },
};
