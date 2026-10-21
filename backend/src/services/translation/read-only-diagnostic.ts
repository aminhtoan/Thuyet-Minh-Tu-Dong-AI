import mongoose from 'mongoose';
import { Transcript } from '../../models/Transcript.js';
import { TranscriptSegment } from '../../models/TranscriptSegment.js';
import { Translation } from '../../models/Translation.js';
import { ProcessingJob } from '../../models/ProcessingJob.js';
import { AppError } from '../../utils/app-error.js';
import { SOURCE_BYTE_LIMIT, SOURCE_SEGMENT_LIMIT, boundedTextProjection } from './bounded-source.js';
import { candidateGroups, revision } from './group-plan.js';
import { loadSource } from './group-translation.service.js';
import { groupDraftStore } from './group-draft-store.js';

// Numeric byte accounting only; retain no transcript rows or text here. Each
// projected text is independently bounded, total rows bounded, cursor closed.
export async function measureDiagnosticSource(projectId: string) {
  const [header] = await Transcript.aggregate([
    { $match: { projectId: new mongoose.Types.ObjectId(projectId) } }, { $limit: 1 },
    { $project: { _id: 1, revision: { $cond: [{ $isNumber: '$revision' }, '$revision', null] }, status: boundedTextProjection('status', 20), languageCode: boundedTextProjection('languageCode', 20), fullText: boundedTextProjection('fullText') } },
  ]);
  if (!header) throw new AppError(409, 'SOURCE_MISSING', 'Source unavailable');
  if (!Number.isSafeInteger(header.revision) || header.revision < 1 || !['READY', 'SAVED'].includes(header.status)) throw new AppError(409, 'SOURCE_NOT_CURRENT', 'Source unavailable');
  if (typeof header.fullText !== 'string' || typeof header.languageCode !== 'string') return { bytes: null, segments: null, revision: header.revision, reason: 'BLOCKED_SOURCE_CAP' };
  let bytes = Buffer.byteLength(JSON.stringify({ transcriptId: String(header._id), transcriptRevision: header.revision, languageCode: header.languageCode, fullText: header.fullText, segments: [] }));
  let count = 0, exact = true;
  const cursor = TranscriptSegment.aggregate([
    { $match: { transcriptId: header._id } }, { $sort: { sequence: 1 } }, { $limit: SOURCE_SEGMENT_LIMIT + 1 },
    { $project: { _id: 1, sequence: { $cond: [{ $isNumber: '$sequence' }, '$sequence', null] }, startTime: { $cond: [{ $isNumber: '$startTime' }, '$startTime', null] }, endTime: { $cond: [{ $isNumber: '$endTime' }, '$endTime', null] }, text: boundedTextProjection('text') } },
  ]).cursor({ batchSize: 1 });
  try {
    for await (const row of cursor) {
      if (++count > SOURCE_SEGMENT_LIMIT) { exact = false; break; }
      if (typeof row.text !== 'string') { exact = false; break; }
      bytes += Buffer.byteLength(JSON.stringify({ id: String(row._id), sequence: row.sequence, text: row.text, startTime: row.startTime, endTime: row.endTime })) + (count > 1 ? 1 : 0);
    }
  } finally { await cursor.close(); }
  const current = await Transcript.findOne({ _id: header._id, projectId }).select('_id revision');
  if (!current || current.revision !== header.revision) throw new AppError(409, 'SOURCE_REVISION_MISMATCH', 'Source changed');
  return { bytes: exact ? bytes : null, segments: exact ? count : null, segmentCountAtLeast: count > SOURCE_SEGMENT_LIMIT ? count : null, revision: header.revision, reason: !exact || bytes > SOURCE_BYTE_LIMIT ? 'BLOCKED_SOURCE_CAP' : null };
}

const dependencies = {
  measure: measureDiagnosticSource, load: loadSource,
  english: (projectId: string) => Translation.exists({ projectId, targetLanguage: 'en' }),
  jobs: (projectId: string) => ProcessingJob.exists({ projectId, type: 'TRANSLATION', targetLanguage: 'en', status: { $in: ['QUEUED', 'PROCESSING'] } }),
  drafts: (projectId: string) => groupDraftStore.inspectConflicts(projectId, 'en'),
};
export async function readOnlyTranslationDiagnostic(projectId: string, deps = dependencies) {
  if (process.env.NODE_ENV !== 'development' || !/^[a-f\d]{24}$/i.test(projectId)) throw new AppError(404, 'DIAGNOSTIC_NOT_AVAILABLE', 'Không tìm thấy chẩn đoán.');
  const base = { sourceCapBytes: SOURCE_BYTE_LIMIT, sourceSegmentLimit: SOURCE_SEGMENT_LIMIT, groupTranslationEnabled: process.env.GROUP_TRANSLATION_ENABLED === 'true', generationAuthorized: false, transcript: 'UNKNOWN', groups: 'UNKNOWN', persistedEnglish: 'UNKNOWN', activeEnglishJobs: 'UNKNOWN', drafts: { visibility: 'PROCESS_LOCAL_ONLY', count: null as number | null, globalAbsence: 'UNKNOWN' } };
  try {
    const [english, jobs] = await Promise.all([deps.english(projectId), deps.jobs(projectId)]);
    const conflicts = { ...base, persistedEnglish: english ? 'BLOCKED' : 'PASS', activeEnglishJobs: jobs ? 'BLOCKED' : 'PASS', drafts: deps.drafts(projectId) };
    const measured = await deps.measure(projectId);
    const details = { ...conflicts, sourceBytes: measured.bytes, segmentCount: measured.segments, segmentCountAtLeast: 'segmentCountAtLeast' in measured ? measured.segmentCountAtLeast : null, transcriptRevision: measured.revision };
    if (measured.reason) return { ...details, status: 'BLOCKED', reasonCode: measured.reason };
    const source = await deps.load(projectId);
    if (source.transcriptRevision !== measured.revision || Buffer.byteLength(JSON.stringify(source)) !== measured.bytes) return { ...details, status: 'BLOCKED', reasonCode: 'SOURCE_REVISION_MISMATCH' };
    const digest = revision(source), groups = candidateGroups(source);
    const ids = groups.flatMap(g => g.sourceSegmentIds);
    const current = Number.isSafeInteger(source.transcriptRevision) && source.transcriptRevision! > 0 && source.languageCode !== 'en' && Boolean(source.languageCode);
    const aligned = groups.length > 0 && groups.length <= 1000 && ids.length === source.segments.length && ids.every((id, i) => id === source.segments[i]?.id);
    return { ...details, transcript: current ? 'PASS' : 'BLOCKED', groups: aligned ? 'PASS' : 'BLOCKED', sourceDigest: digest, groupCount: groups.length,
      status: !current || !aligned || english || jobs || conflicts.drafts.count ? 'BLOCKED' : 'UNKNOWN',
      reasonCode: !current ? 'SOURCE_NOT_CURRENT' : !aligned ? 'GROUP_COVERAGE_MISMATCH' : english || jobs || conflicts.drafts.count ? 'ENGLISH_CONFLICT' : !base.groupTranslationEnabled ? 'GROUP_TRANSLATION_DISABLED' : 'PROCESS_LOCAL_ONLY' };
  } catch (error) {
    const safeCodes = ['SOURCE_MISSING', 'SOURCE_NOT_CURRENT', 'SOURCE_REVISION_MISMATCH', 'TRANSCRIPT_REVISION_UNAVAILABLE', 'TRANSCRIPT_NOT_FOUND', 'TRANSLATION_DRAFT_TOO_LARGE'];
    return { ...base, status: 'BLOCKED', reasonCode: error instanceof AppError && safeCodes.includes(error.code) ? error.code : 'DIAGNOSTIC_UNAVAILABLE' };
  }
}
