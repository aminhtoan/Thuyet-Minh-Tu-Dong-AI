import { createHash } from 'node:crypto';
import { AppError } from '../../utils/app-error.js';

export const GROUPING_VERSION = 'phrase-candidates-v1';
export type SourceSegment = { id: string; sequence: number; text: string; startTime: number; endTime: number };
export type SourceSnapshot = { transcriptId: string; transcriptRevision?: number | null; languageCode: string; fullText: string; segments: SourceSegment[] };
export type TranslationGroup = { groupId: string; sequence: number; sourceSegmentIds: string[]; sourceText: string; translatedText: string; startTime: number; endTime: number };
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  return value;
}
export const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export const revision = (source: SourceSnapshot) => digest(source);
const invalid = () => new AppError(409, 'TRANSLATION_MAPPING_FAILED', 'Các cụm không khớp bản ghi nguồn. Vui lòng tải lại kế hoạch.');
export function validateSource(source: SourceSnapshot): void {
  if (!source.fullText.trim() || !source.segments.length || source.segments.length > 10_000) throw invalid();
  let end = 0;
  const ids = new Set<string>();
  source.segments.forEach((s, i) => {
    if (!/^[a-f0-9]{24}$/i.test(s.id) || ids.has(s.id) || s.sequence !== i + 1 || !s.text.trim() || !Number.isFinite(s.startTime) || !Number.isFinite(s.endTime) || s.startTime < end || s.endTime <= s.startTime) throw invalid();
    ids.add(s.id); end = s.endTime;
  });
}
function group(source: SourceSnapshot, segments: SourceSegment[], sequence: number): TranslationGroup {
  const sourceSegmentIds = segments.map(s => s.id);
  return { groupId: digest([revision(source), GROUPING_VERSION, sourceSegmentIds]), sequence, sourceSegmentIds,
    sourceText: segments.reduce((text, s) => text + (text && !/^[,.;:!?…。！？]+$/u.test(s.text.trim()) ? ' ' : '') + s.text.trim(), ''),
    startTime: segments[0]!.startTime, endTime: segments.at(-1)!.endTime, translatedText: '' };
}
export function candidateGroups(source: SourceSnapshot): TranslationGroup[] {
  validateSource(source);
  const runs: SourceSegment[][] = []; let current: SourceSegment[] = [];
  const flush = () => { if (current.length) runs.push(current); current = []; };
  for (const s of source.segments) {
    if (/\s/u.test(s.text.trim())) { flush(); runs.push([s]); continue; }
    if (current.length && (s.startTime - current.at(-1)!.endTime >= 0.6 || current.length >= 18 || s.endTime - current[0]!.startTime > 8 || current.reduce((n, v) => n + v.text.length, 0) + s.text.length > 120)) flush();
    current.push(s);
    if (/[.!?…。！？]["'”’»)]*$/u.test(s.text.trim())) flush();
  }
  flush(); return runs.map((run, i) => group(source, run, i + 1));
}
// Only removing candidate boundaries is allowed. Clients cannot edit source text/times.
export function validatePlan(source: SourceSnapshot, memberships: string[][]): TranslationGroup[] {
  const candidates = candidateGroups(source);
  const flat = memberships.flat();
  if (!memberships.length || memberships.some(ids => !ids.length) || flat.length !== source.segments.length || flat.some((id, i) => id !== source.segments[i]?.id)) throw invalid();
  const ends = new Set(candidates.map(c => c.sourceSegmentIds.at(-1)));
  if (memberships.some(ids => !ends.has(ids.at(-1)))) throw invalid();
  let offset = 0;
  return memberships.map((ids, i) => { const next = group(source, source.segments.slice(offset, offset + ids.length), i + 1); offset += ids.length; return next; });
}
export function assertStoredGroups(source: SourceSnapshot, groups: TranslationGroup[]): void {
  const expected = validatePlan(source, groups.map(g => g.sourceSegmentIds));
  if (groups.some((g, i) => !g.translatedText.trim() || digest({ ...g, translatedText: '' }) !== digest(expected[i]))) throw invalid();
}
export const outputDigest = (sourceRevision: string, targetLanguage: string, groups: TranslationGroup[]) => digest([sourceRevision, GROUPING_VERSION, targetLanguage, groups]);
