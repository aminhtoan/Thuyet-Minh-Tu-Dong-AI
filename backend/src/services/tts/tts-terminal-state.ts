import type { MediaType, ProjectStatus } from '../../constants/project.constants.js';

export interface TtsTerminalEvidence {
  mediaType: MediaType | null;
  ttsSucceeded: boolean;
  narrationReady: boolean;
  narrationProjectMatches: boolean;
  hasConflictingActiveJob: boolean;
}

export const resolveTtsTerminalStatus = (evidence: TtsTerminalEvidence): Extract<ProjectStatus, 'GENERATING_AUDIO' | 'COMPLETED'> | null => {
  if (!evidence.ttsSucceeded || !evidence.narrationReady || !evidence.narrationProjectMatches || !evidence.mediaType) return null;
  return evidence.mediaType === 'AUDIO' && !evidence.hasConflictingActiveJob ? 'COMPLETED' : 'GENERATING_AUDIO';
};
