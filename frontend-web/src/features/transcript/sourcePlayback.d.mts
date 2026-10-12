import type { TranscriptSegment } from './types';
export function activeTranscriptSegment(segments: readonly TranscriptSegment[], time: number): string | null;
export function seekSourceMedia(player: HTMLMediaElement | null, time: number): Promise<boolean>;
export function sourceMediaError(error: unknown): string;
export function createSourceMediaLoader(fetchBlob: () => Promise<Blob>, createUrl: (blob: Blob) => string, revokeUrl: (url: string) => void): { load(): Promise<string | null>; dispose(): void };
