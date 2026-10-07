import type { Transcript, TranscriptSegment } from './types';

export function formatTimestamp(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

export function deriveFullText(segments: readonly TranscriptSegment[]): string {
  return segments.map((segment) => segment.text.trim()).join(' ');
}

export function getSegmentErrors(segments: readonly TranscriptSegment[]): Record<string, string> {
  return Object.fromEntries(segments.filter((segment) => !segment.text.trim()).map((segment) => [segment.id, 'Nội dung đoạn không được để trống.']));
}

export function hasTranscriptChanges(draft: Transcript | null, saved: Transcript | null): boolean {
  if (!draft) return false;
  if (!saved) return true;
  return draft.segments.length !== saved.segments.length || draft.segments.some((segment, index) => segment.id !== saved.segments[index]?.id || segment.text !== saved.segments[index]?.text);
}

export function hasSegmentEdits(draft: Transcript | null, baseline: Transcript | null): boolean {
  return Boolean(draft && baseline && hasTranscriptChanges(draft, baseline));
}
