export type UserRole = 'CUSTOMER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'BLOCKED';
export type ProjectStatus = 'DRAFT' | 'UPLOADED' | 'TRANSCRIBING' | 'TRANSCRIBED' | 'TRANSLATING' | 'TRANSLATED' | 'GENERATING_AUDIO' | 'PROCESSING_VIDEO' | 'COMPLETED' | 'FAILED';
export type ProcessingJobType = 'TRANSCRIPTION' | 'TRANSLATION' | 'TTS' | 'VIDEO_PROCESSING';
export type ProcessingJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
