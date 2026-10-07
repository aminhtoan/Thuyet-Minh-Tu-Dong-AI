export const PROCESSING_JOB_TYPES = [
  'TRANSCRIPTION',
  'TRANSLATION',
  'TTS',
  'VIDEO_PROCESSING',
] as const;
export type ProcessingJobType = (typeof PROCESSING_JOB_TYPES)[number];

export const PROCESSING_JOB_STATUSES = [
  'QUEUED',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
] as const;
export type ProcessingJobStatus = (typeof PROCESSING_JOB_STATUSES)[number];
