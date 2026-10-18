import type { TranscriptSegment } from './types';
import type { DataState } from '../projects/types';
export function activeTranscriptSegment(segments: readonly TranscriptSegment[], time: number): string | null;
export function seekSourceMedia(player: HTMLMediaElement | null, time: number): Promise<boolean>;
export function sourceMediaError(error: unknown): string;
export const MAX_AUTOLOAD_BLOB_SIZE: number;
export function sourceMediaInitialState(metadataState: DataState, mediaType?: string, mediaSize?: number): { status: DataState; error: string | null };
export function createSourceMediaLoader(fetchBlob: () => Promise<Blob>, createUrl: (blob: Blob) => string, revokeUrl: (url: string) => void): { load(): Promise<string | null>; dispose(): void };
export function scheduleSourceMediaAutoLoad(signal: AbortSignal, load: () => void | Promise<void>): void;
