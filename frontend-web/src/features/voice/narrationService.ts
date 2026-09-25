import type { LanguageCode } from '../projects/types';
import { translationService } from '../translation/translationService';
import { waitForMock, type MockOptions } from './mockAsync';
import { voiceService } from './voiceService';
import { translationRevision, validateNarrationConfig } from './voiceUtils';
import type { NarrationConfig } from './types';

const savedConfigs = new Map<string, NarrationConfig>();
const key = (projectId: string, language: LanguageCode) => projectId + ':' + language;

export const narrationService = {
  async getConfig(projectId: string, language?: LanguageCode, options: MockOptions = {}): Promise<NarrationConfig | null> {
    await waitForMock(200, options);
    const translation = await translationService.getSavedTranslation(projectId, language, { signal: options.signal });
    if (!translation) return null;
    const saved = savedConfigs.get(key(projectId, translation.targetLanguage));
    if (!saved || saved.translationId !== translation.id || saved.translationRevision !== translationRevision(translation)) return null;
    const voices = await voiceService.getVoices(translation.targetLanguage, { signal: options.signal });
    return validateNarrationConfig(saved, voices) ? null : { ...saved };
  },
  async saveConfig(projectId: string, config: NarrationConfig, options: MockOptions = {}): Promise<NarrationConfig> {
    await waitForMock(400, options);
    const voices = await voiceService.getVoices(config.languageCode, { signal: options.signal });
    const translation = await translationService.getSavedTranslation(projectId, config.languageCode, { signal: options.signal });
    if (!translation || config.projectId !== projectId || config.translationId !== translation.id ||
        config.translationRevision !== translationRevision(translation)) {
      throw new Error('The saved translation changed or is unavailable. Return to Translation and reopen Voice.');
    }
    const error = validateNarrationConfig(config, voices);
    if (error) throw new Error(error);
    const saved = { ...config };
    savedConfigs.set(key(projectId, config.languageCode), saved);
    return { ...saved };
  },
};
