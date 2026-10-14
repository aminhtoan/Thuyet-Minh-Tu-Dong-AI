import type { LanguageCode } from '../projects/types';
import { projectRepository } from '../projects/projectRepository';
import { transcriptService } from '../transcript/transcriptService';
import { transcriptRevision } from '../translation/translationUtils';
import { translationService } from '../translation/translationService';
import { narrationService } from '../voice/narrationService';
import { voiceService } from '../voice/voiceService';
import { translationRevision, validateNarrationConfig } from '../voice/voiceUtils';
import type { GenerationContext } from './types';

export const generationService = {
  async getContext(projectId: string, language?: LanguageCode, options: { signal?: AbortSignal } = {}): Promise<GenerationContext | null> {
    const project = projectRepository.getById(projectId) ?? await projectRepository.getProject(projectId);
    const config = await narrationService.getConfig(projectId, language, options);
    if (!config) return null;
    const [transcript, translation, voice] = await Promise.all([
      transcriptService.getTranscript(projectId, options),
      translationService.getSavedTranslation(projectId, config.languageCode, options),
      voiceService.getVoice(config.voiceId, options),
    ]);
    if (!transcript || !translation || !voice ||
        (!('groups' in translation) && translation.sourceRevision !== transcriptRevision(transcript)) ||
        config.translationRevision !== translationRevision(translation) ||
        validateNarrationConfig(config, [voice])) return null;
    return { project: { ...project }, transcript, translation, config, voice };
  },
};
