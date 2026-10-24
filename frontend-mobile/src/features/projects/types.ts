export type ProjectStatus = 'DRAFT' | 'UPLOADED' | 'TRANSCRIBING' | 'TRANSCRIBED' | 'TRANSLATING' | 'TRANSLATED' | 'GENERATING_AUDIO' | 'PROCESSING_VIDEO' | 'COMPLETED' | 'FAILED';
export type ProjectStatusFilter = 'ALL' | ProjectStatus;
export type MediaType = 'VIDEO' | 'AUDIO';
export type LanguageCode = string;
export type ProjectWorkflow = {
  step: 'UPLOAD' | 'TRANSCRIPT' | 'TRANSLATION' | 'VOICE' | 'GENERATE' | 'RESULT' | 'UNKNOWN';
  state: 'READY' | 'PROCESSING' | 'FAILED' | 'COMPLETED' | 'BLOCKED';
  canResume: boolean;
  mediaType: MediaType | null;
  targetLanguage: { code: string; source: 'JOB' | 'TRANSLATION' | 'NARRATION' | 'RESULT' } | null;
  processing?: { jobId: string; type: string; status: 'QUEUED' | 'PROCESSING'; progress: number } | null;
  artifact: { narrationReady: boolean; resultReady: boolean };
};
export type Project = { id: string; name: string; description?: string; sourceLanguage: LanguageCode; targetLanguage?: LanguageCode; status: ProjectStatus; workflow?: ProjectWorkflow; progress?: number; mediaType?: MediaType; mediaName?: string; mediaSize?: number; durationSeconds?: number; updatedAt: string; createdAt?: string; metadataState?: { media: 'READY' | 'EMPTY' | 'ERROR' | 'UNKNOWN'; translation: 'READY' | 'EMPTY' | 'ERROR' | 'UNKNOWN' } };
export type ProjectStatistics = { total: number; completed: number; processing: number; failed: number };
export type ProjectPagination = { page: number; limit: number; total: number; totalPages: number };
