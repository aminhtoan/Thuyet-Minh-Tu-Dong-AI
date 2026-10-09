import type { LanguageCode, MediaType, Project } from '../projects/types';
export type Result = {
  id: string; projectId: string; languageCode: LanguageCode; mediaType: MediaType;
  createdAt: string; artifactType: 'VIDEO' | 'AUDIO'; mimeType: string; fileSize: number;
  duration?: number; width?: number | null; height?: number | null; voiceName?: string; speed?: number;
  filePath: string;
};
export type HistoryItem = Project & { hasResult: boolean };

