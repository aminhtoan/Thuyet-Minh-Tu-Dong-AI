import type { LanguageCode, MediaType, Project } from '../projects/types';
export type Result = {
  id: string; projectId: string; languageCode: LanguageCode; mediaType: MediaType;
  createdAt: string; availability: 'MOCK_PREVIEW';
  transcriptCount?: number; translationCount?: number; voiceName?: string; speed?: number;
};
export type HistoryItem = Project & { hasResult: boolean };

