import type { LanguageCode } from '../projects/types';

export type TranslationStatus = 'LOADING' | 'NOT_STARTED' | 'TRANSLATING' | 'READY' | 'SAVING' | 'SAVED' | 'FAILED';
export type TranslationSegment = {
  id: string;
  transcriptSegmentId: string;
  sequence: number;
  startTime: number;
  endTime: number;
  translatedText: string;
};
export type Translation = {
  id: string;
  projectId: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  status: 'READY' | 'SAVED';
  // Development-only source fingerprint; a future API can supply a revision ID.
  sourceRevision: string;
  segments: TranslationSegment[];
  createdAt: string;
  updatedAt: string;
};
