import type { LanguageCode } from '../projects/types';

export type TranscriptStatus = 'LOADING' | 'NOT_STARTED' | 'GENERATING' | 'READY' | 'SAVING' | 'SAVED' | 'FAILED';
export type TranscriptSegment = { id: string; sequence: number; startTime?: number; endTime?: number; text: string };
export type Transcript = { id: string; projectId: string; languageCode: LanguageCode; fullText: string; status: 'READY' | 'SAVED'; segments: TranscriptSegment[]; createdAt: string; updatedAt: string };
