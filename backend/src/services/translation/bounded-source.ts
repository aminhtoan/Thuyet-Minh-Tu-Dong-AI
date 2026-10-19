import type { SourceSnapshot, SourceSegment } from './group-plan.js';
import { validateSource } from './group-plan.js';
import { AppError } from '../../utils/app-error.js';

export const SOURCE_BYTE_LIMIT = 96 * 1024;
export const SOURCE_SEGMENT_LIMIT = 10_000;
export const sourceTooLarge = () => new AppError(413, 'TRANSLATION_DRAFT_TOO_LARGE', 'Bản ghi vượt giới hạn dịch theo cụm.');
// Expressions run on MongoDB, so an oversized text field is never sent to Node.
export const boundedTextProjection = (field: string, limit = SOURCE_BYTE_LIMIT) => ({
  $cond: [{ $eq: [{ $type: `$${field}` }, 'string'] },
    { $cond: [{ $lte: [{ $strLenBytes: `$${field}` }, limit] }, `$${field}`, null] }, null],
});
export async function collectBoundedSource(header: Omit<SourceSnapshot, 'segments'>, rows: AsyncIterable<SourceSegment>): Promise<SourceSnapshot> {
  if (typeof header.fullText !== 'string' || typeof header.languageCode !== 'string') throw sourceTooLarge();
  const source: SourceSnapshot = { ...header, segments: [] };
  let bytes = Buffer.byteLength(JSON.stringify(source));
  if (bytes > SOURCE_BYTE_LIMIT) throw sourceTooLarge();
  for await (const row of rows) {
    if (source.segments.length >= SOURCE_SEGMENT_LIMIT || typeof row.text !== 'string') throw sourceTooLarge();
    bytes += Buffer.byteLength(JSON.stringify(row)) + (source.segments.length ? 1 : 0);
    if (bytes > SOURCE_BYTE_LIMIT) throw sourceTooLarge();
    source.segments.push(row);
  }
  validateSource(source);
  return source;
}
