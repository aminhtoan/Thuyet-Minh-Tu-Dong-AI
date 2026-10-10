import type { Transcript } from './types';

export class TranscriptCancelledError extends Error {}
export type TranscriptDtoInput = {
  id: string; projectId: string; language: string; fullText: string; createdAt: string; updatedAt: string;
  segments?: Array<{ id?: string; index?: number; startTime?: number; endTime?: number; text?: string }>;
};
export function mapTranscriptDto(value: TranscriptDtoInput): Transcript;
export function confirmTranscriptRequest<T>(confirm: () => Promise<boolean>, request: () => Promise<T>): Promise<T>;
export function runTranscriptRequestOnce<T>(lock: { current: boolean }, request: () => Promise<T>): Promise<{ started: false } | { started: true; value: T }>;
export function transcriptErrorMessage(error: unknown): string | null;
export function deriveTranscriptStage(projectStatus: string, editorStatus: string, hasTranscript: boolean): string;
