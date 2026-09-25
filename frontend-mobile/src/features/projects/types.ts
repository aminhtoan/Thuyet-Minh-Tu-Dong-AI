export type ProjectStatus = 'DRAFT' | 'UPLOADED' | 'TRANSCRIBING' | 'TRANSCRIBED' | 'TRANSLATING' | 'TRANSLATED' | 'GENERATING_AUDIO' | 'PROCESSING_VIDEO' | 'COMPLETED' | 'FAILED';
export type ProjectStatusFilter = 'ALL' | 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type MediaType = 'VIDEO' | 'AUDIO';
export type LanguageCode = 'vi' | 'en' | 'ja' | 'ko';
export type Project = { id: string; name: string; sourceLanguage: LanguageCode; targetLanguage: LanguageCode; status: ProjectStatus; progress?: number; mediaType: MediaType; updatedAt: string };
export type ProjectStatistics = { total: number; completed: number; processing: number; failed: number };
