import type { TranscriptSegment } from '../transcript/types';
import type { TranslationSegment } from './types';
export function mapTranslationSegments(translationId: string, segments: readonly { index: number; sourceSegmentId?: string; text: string }[], sources: readonly TranscriptSegment[]): TranslationSegment[];
export function buildTranslationPresentation(sources: readonly TranscriptSegment[], translations?: readonly TranslationSegment[]): {
  rows: Array<{ source: TranscriptSegment; translation?: TranslationSegment }>;
  notice: string | null;
};
