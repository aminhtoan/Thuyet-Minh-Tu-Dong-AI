export const PROJECT_STATUSES = [
  'DRAFT',
  'UPLOADED',
  'TRANSCRIBING',
  'TRANSCRIBED',
  'TRANSLATING',
  'TRANSLATED',
  'GENERATING_AUDIO',
  'PROCESSING_VIDEO',
  'COMPLETED',
  'FAILED',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const MEDIA_TYPES = ['VIDEO', 'AUDIO'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const CONTENT_STATUSES = ['READY', 'SAVED'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const NARRATION_STATUSES = ['READY', 'GENERATING', 'COMPLETED', 'FAILED'] as const;
export type NarrationStatus = (typeof NARRATION_STATUSES)[number];
