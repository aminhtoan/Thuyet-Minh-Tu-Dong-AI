import mongoose, { type Types } from 'mongoose';
import { ActivityLog } from '../models/ActivityLog.js';
import { Language } from '../models/Language.js';
import { ProcessingJob } from '../models/ProcessingJob.js';
import { Project } from '../models/Project.js';
import { Transcript } from '../models/Transcript.js';
import { TranscriptSegment } from '../models/TranscriptSegment.js';
import { Translation } from '../models/Translation.js';
import { TranslationSegment } from '../models/TranslationSegment.js';
import { AppError } from '../utils/app-error.js';
import { assertSourceLanguageConfirmed } from './source-language-contract.js';
import { env } from '../config/env.js';
import { getTranslationProvider } from './translation/translation.service.js';
import { OpenAiTranslationError } from './translation/openai-translation.provider.js';
import { GeminiTranslationError, GEMINI_TRANSLATION_ERRORS } from './translation/gemini-translation.provider.js';
import { isTranslationMappingCurrent } from './translation/translation-mapping.js';
import type { TranslationProviderSegment } from './translation/translation-provider.interface.js';
import { groupedDto, boundedTranslationRecord } from './translation/group-translation.service.js';
import { scopedGroupAdmission } from './translation/group-source-scope.js';
import { isRevision, nextRevision, revisionFenceOperation, translationProvenance, type ProvenanceState } from './artifact-provenance.service.js';

const writeLog = async (userId: string, action: string, projectId: Types.ObjectId, targetLanguage: string) => {
  try {
    await ActivityLog.create({ userId, action, entityType: 'Project', entityId: projectId, description: `${action.replaceAll('_', ' ').toLowerCase()} (${targetLanguage})` });
  } catch { /* best effort */ }
};

const summary = async (translation: { _id: Types.ObjectId; projectId: Types.ObjectId; sourceLanguage: string; targetLanguage: string; fullText: string; createdAt: Date; updatedAt: Date; alignmentFormat?: string | null; groups?: { sourceSegmentIds: Types.ObjectId[] }[] | null; review?: unknown }, provenanceState?: ProvenanceState) => ({
  id: translation._id.toString(), projectId: translation.projectId.toString(), sourceLanguage: translation.sourceLanguage,
  targetLanguage: translation.targetLanguage, fullText: translation.fullText,
  ...(provenanceState ? { provenanceState } : {}),
  ...(translation.alignmentFormat === 'GROUPS_V1' ? { alignmentFormat: 'GROUPS_V1', groupCount: translation.groups?.length ?? 0, sourceSegmentCount: translation.groups?.reduce((n, g) => n + g.sourceSegmentIds.length, 0) ?? 0, reviewed: Boolean(translation.review) } : { alignmentFormat: 'SEGMENTS_V1', segmentCount: await TranslationSegment.countDocuments({ translationId: translation._id }) }),
  createdAt: translation.createdAt, updatedAt: translation.updatedAt,
});

export const listTranslations = async (projectId: string) => {
  const translations = await Translation.find({ projectId, status: 'READY' }).sort({ createdAt: 1 });
  const transcript = await Transcript.findOne({ projectId });
  return Promise.all(translations.map((translation) => summary(translation, translationProvenance(translation, transcript))));
};

export const getTranslation = async (projectId: string, targetLanguage: string, supportsGroups = false) => {
  const translation = await boundedTranslationRecord({ projectId, targetLanguage, status: 'READY' });
  const currentTranscript = translation ? await (scopedGroupAdmission() ? Transcript.findOne({ _id: translation.transcriptId, projectId }).select('_id revision') : Transcript.findOne({ _id: translation.transcriptId, projectId })) : null;
  if (translation && translationProvenance(translation, currentTranscript) !== 'CURRENT') throw new AppError(409, 'TRANSLATION_PROVENANCE_INVALID', 'Translation provenance is missing or stale.');
  if (!translation) throw new AppError(404, 'TRANSLATION_NOT_FOUND', 'Không tìm thấy bản dịch.');
  if (scopedGroupAdmission() && translation.alignmentFormat !== 'GROUPS_V1') throw new AppError(409, 'TRANSLATION_FORMAT_UNSUPPORTED', 'Profile thử nghiệm chỉ hỗ trợ GROUPS_V1.');
  if (translation.alignmentFormat === 'GROUPS_V1') {
    if (!supportsGroups) throw new AppError(409, 'TRANSLATION_FORMAT_UNSUPPORTED', 'Bản dịch theo cụm cần ứng dụng hỗ trợ GROUPS_V1.');
    return groupedDto(translation);
  }
  const sourceSegments = await TranscriptSegment.find({ transcriptId: translation.transcriptId }).sort({ sequence: 1 });
  const translatedSegments = await TranslationSegment.find({ translationId: translation._id });
  if (!isTranslationMappingCurrent(sourceSegments, translatedSegments)) throw new AppError(404, 'TRANSLATION_NOT_FOUND', 'Bản dịch không còn khớp bản ghi hiện tại. Vui lòng dịch lại.');
  const bySource = new Map(translatedSegments.map((segment) => [segment.transcriptSegmentId.toString(), segment]));
  return {
    ...(await summary(translation, 'CURRENT')),
    segments: sourceSegments.map((source) => ({
      index: source.sequence - 1, sourceSegmentId: source._id.toString(), text: bySource.get(source._id.toString())?.translatedText ?? '',
    })),
  };
};

const validateResult = (expected: TranslationProviderSegment[], actual: TranslationProviderSegment[]): TranslationProviderSegment[] => {
  if (!Array.isArray(actual) || actual.length !== expected.length) throw new Error('TRANSLATION_INVALID_RESPONSE');
  const byIndex = new Map<number, string>();
  for (const segment of actual) {
    if (!segment || !Number.isInteger(segment.index) || typeof segment.text !== 'string' || !segment.text.trim() || byIndex.has(segment.index)) throw new Error('TRANSLATION_INVALID_RESPONSE');
    byIndex.set(segment.index, segment.text.trim());
  }
  if (expected.some((segment) => !byIndex.has(segment.index)) || [...byIndex.keys()].some((index) => !expected.some((segment) => segment.index === index))) throw new Error('TRANSLATION_INVALID_RESPONSE');
  return expected.map((segment) => ({ index: segment.index, text: byIndex.get(segment.index) as string }));
};

const isDuplicateKey = (error: unknown): boolean => Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 11000);

// No transcript schema currently provides a trusted 1:1 alignment capability.
// Do not accept client claims or infer semantics from text/timing heuristics.
function requireLegacyAlignmentCapability(): void {
  throw new AppError(409, 'TRANSLATION_ALIGNMENT_UNVERIFIED', 'Chưa có bằng chứng ánh xạ 1:1 cho bản ghi này. Vui lòng sử dụng luồng dịch theo cụm và duyệt bản dịch.');
}

export const translate = async (projectId: string, userId: string, targetLanguage: string) => {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
  assertSourceLanguageConfirmed(project);
  if (project.sourceLanguage === targetLanguage) throw new AppError(400, 'SAME_SOURCE_TARGET_LANGUAGE', 'Ngôn ngữ đích phải khác ngôn ngữ nguồn.');
  if (!await Language.exists({ code: targetLanguage, isActive: true })) throw new AppError(400, 'TRANSLATION_LANGUAGE_NOT_SUPPORTED', 'Ngôn ngữ đích chưa được hệ thống hỗ trợ.');
  const transcript = await Transcript.findOne({ projectId });
  if (transcript && !isRevision(transcript.revision)) throw new AppError(409, 'TRANSCRIPT_REVISION_UNAVAILABLE', 'Transcript revision is unavailable for safe artifact creation.');
  if (!transcript) throw new AppError(404, 'TRANSCRIPT_NOT_FOUND', 'Không tìm thấy bản ghi.');
  if (!transcript.languageCode || transcript.sourceLanguageStatus === 'NEEDS_CONFIRMATION') throw new AppError(409, 'SOURCE_LANGUAGE_UNCONFIRMED', 'Vui lòng xác nhận ngôn ngữ nguồn trước khi dịch.');
  const sourceLanguage = transcript.languageCode;
  const sourceSegments = await TranscriptSegment.find({ transcriptId: transcript._id }).sort({ sequence: 1 });
  if (!transcript.fullText.trim() || !sourceSegments.length || sourceSegments.some((segment) => !segment.text.trim())) throw new AppError(409, 'TRANSCRIPT_NOT_FOUND', 'Bản ghi không có nội dung có thể dịch.');
  const existing = await Translation.findOne({ transcriptId: transcript._id, targetLanguage, status: 'READY' });
  if (existing?.alignmentFormat === 'GROUPS_V1') throw new AppError(409, 'TRANSLATION_ALREADY_EXISTS', 'Đã có bản dịch theo cụm; không ghi đè bằng luồng cũ.');
  if (existing && translationProvenance(existing, transcript) === 'CURRENT' && isTranslationMappingCurrent(sourceSegments, await TranslationSegment.find({ translationId: existing._id }))) return { project: { id: projectId, status: project.status }, translation: await getTranslation(projectId, targetLanguage), idempotent: true };
  // No persisted capability currently certifies 1:1 semantic alignment for new
  // legacy generations. Revision/ID equality proves freshness, not alignment.
  // Keep reading existing current records, but do not create/replace legacy data.
  if (!['TRANSCRIBED', 'TRANSLATED', 'FAILED'].includes(project.status)) {
    if (project.status === 'TRANSLATING') throw new AppError(409, 'TRANSLATION_ALREADY_RUNNING', 'Dự án đang được dịch.');
    throw new AppError(409, 'INVALID_PROJECT_STATE', 'Trạng thái dự án không cho phép dịch.');
  }
  requireLegacyAlignmentCapability();

  let job;
  try {
    job = await ProcessingJob.create({ projectId, type: 'TRANSLATION', targetLanguage, sourceTranscriptId: transcript._id,
      sourceTranscriptRevision: transcript.revision, status: 'PROCESSING', progress: 0, startedAt: new Date() });
  } catch (error) {
    if (isDuplicateKey(error)) throw new AppError(409, 'TRANSLATION_ALREADY_RUNNING', 'Bản dịch cho ngôn ngữ này đang được xử lý.');
    throw error;
  }
  const claimed = await Project.findOneAndUpdate(
    { _id: projectId, userId, status: { $in: ['TRANSCRIBED', 'TRANSLATED', 'FAILED'] } },
    { $set: { status: 'TRANSLATING', progress: 0 } }, { returnDocument: 'before' },
  );
  if (!claimed) {
    await ProcessingJob.updateOne({ _id: job._id }, { status: 'CANCELLED', completedAt: new Date() });
    throw new AppError(409, 'TRANSLATION_ALREADY_RUNNING', 'Dự án đang được dịch.');
  }
  void writeLog(userId, claimed.status === 'FAILED' ? 'TRANSLATION_RETRIED' : 'TRANSLATION_STARTED', claimed._id, targetLanguage);
  try {
    const providerInput = sourceSegments.map((segment) => ({ index: segment.sequence - 1, text: segment.text, sourceSegmentId: segment._id.toString(), startTime: segment.startTime, endTime: segment.endTime }));
    const result = await getTranslationProvider().translate({ fullText: transcript.fullText, sourceLanguage, targetLanguage, segments: providerInput });
    if (result.sourceLanguage !== transcript.languageCode || result.targetLanguage !== targetLanguage) throw new Error('TRANSLATION_INVALID_RESPONSE');
    const translated = validateResult(providerInput, result.segments);
    const session = await mongoose.startSession();
    let translationId = '';
    try {
      await session.withTransaction(async () => {
        const currentTranscript = await Transcript.findOne({ _id: transcript._id }, undefined, { session });
        if (!currentTranscript || currentTranscript.revision !== transcript.revision) throw new Error('TRANSLATION_MAPPING_FAILED');
        const transcriptFence = revisionFenceOperation(currentTranscript._id, transcript.revision);
        const fencedTranscript = await Transcript.updateOne(transcriptFence.filter, transcriptFence.update, { session });
        if (fencedTranscript.matchedCount !== 1) throw new Error('TRANSLATION_MAPPING_FAILED');
        const existingFormat = await Translation.findOne({ transcriptId: transcript._id, targetLanguage }, undefined, { session });
        if (existingFormat?.alignmentFormat === 'GROUPS_V1') throw new AppError(409, 'TRANSLATION_ALREADY_EXISTS', 'Đã có bản dịch theo cụm; không ghi đè bằng luồng cũ.');
        const current = await TranscriptSegment.find({ transcriptId: transcript._id }).sort({ sequence: 1 }).session(session);
        if (current.length !== sourceSegments.length || current.some((segment, index) => segment._id.toString() !== sourceSegments[index]?._id.toString() || segment.text !== sourceSegments[index]?.text || segment.startTime !== sourceSegments[index]?.startTime || segment.endTime !== sourceSegments[index]?.endTime)) throw new Error('TRANSLATION_MAPPING_FAILED');
        const translationRevision = nextRevision(existingFormat?.revision);
        const values = { projectId, transcriptId: transcript._id, sourceLanguage, targetLanguage,
          fullText: translated.map((segment) => segment.text).join(' '), status: 'READY' as const, alignmentFormat: 'SEGMENTS_V1' as const,
          revision: translationRevision, sourceTranscriptRevision: transcript.revision };
        const translation = existingFormat
          ? await Translation.findOneAndUpdate(
            { _id: existingFormat._id, ...(existingFormat.revision === undefined ? { revision: { $exists: false } } : { revision: existingFormat.revision }) },
            { $set: values, $unset: { sourceRevision: 1, groupingVersion: 1, groups: 1, review: 1 } },
            { returnDocument: 'after', session },
          )
          : (await Translation.create([values], { session }))[0];
        if (!translation) throw new Error('TRANSLATION_MAPPING_FAILED');
        translationId = translation._id.toString();
        await TranslationSegment.deleteMany({ translationId: translation._id }, { session });
        await TranslationSegment.insertMany(translated.map((segment, index) => ({ translationId: translation._id, transcriptSegmentId: sourceSegments[index]?._id, translatedText: segment.text })), { session });
        const completed = await ProcessingJob.updateOne(
          { _id: job._id, status: 'PROCESSING', sourceTranscriptId: transcript._id, sourceTranscriptRevision: transcript.revision },
          { status: 'COMPLETED', progress: 100, completedAt: new Date() }, { session },
        );
        if (completed.matchedCount !== 1) throw new Error('TRANSLATION_MAPPING_FAILED');
        await Project.updateOne({ _id: projectId }, { status: 'TRANSLATED', progress: 100 }, { session });
      });
    } finally { await session.endSession(); }
    void writeLog(userId, 'TRANSLATION_COMPLETED', claimed._id, targetLanguage);
    return { project: { id: projectId, status: 'TRANSLATED' }, translation: await getTranslation(projectId, targetLanguage), translationId, idempotent: false };
  } catch (error) {
    if (env.nodeEnv === 'development' && error instanceof OpenAiTranslationError) console.error('Translation provider diagnostic:', error.diagnostics);
    if (env.nodeEnv === 'development' && error instanceof GeminiTranslationError) console.error('Translation provider diagnostic:', { provider: 'gemini', code: error.code, httpStatus: error.httpStatus });
    const known = error instanceof Error && (GEMINI_TRANSLATION_ERRORS as readonly string[]).includes(error.message) ? error.message : 'TRANSLATION_PROVIDER_ERROR';
    await Promise.all([
      ProcessingJob.updateOne({ _id: job._id }, { status: 'FAILED', errorMessage: known, completedAt: new Date() }),
      Project.updateOne({ _id: projectId }, { status: 'FAILED' }),
    ]);
    void writeLog(userId, 'TRANSLATION_FAILED', claimed._id, targetLanguage);
    const messages: Record<string, string> = { TRANSLATION_NOT_CONFIGURED: 'Dịch vụ dịch chưa được cấu hình.', TRANSLATION_INVALID_KEY: 'Khóa dịch vụ dịch không hợp lệ. Vui lòng liên hệ quản trị viên.', TRANSLATION_MODEL_UNAVAILABLE: 'Model dịch không khả dụng hoặc chưa được cấp quyền.', TRANSLATION_QUOTA_EXCEEDED: 'Dịch vụ dịch đã hết hạn mức. Vui lòng thử lại sau.', TRANSLATION_TIMEOUT: 'Dịch vụ dịch phản hồi quá lâu. Vui lòng thử lại sau.', TRANSLATION_NETWORK_ERROR: 'Không kết nối được dịch vụ dịch.', TRANSLATION_INVALID_RESPONSE: 'Dịch vụ dịch trả về dữ liệu không hợp lệ.', TRANSLATION_MAPPING_FAILED: 'Không thể ánh xạ bản dịch chính xác với bản ghi gốc.' };
    throw new AppError(known === 'TRANSLATION_NOT_CONFIGURED' ? 503 : 502, known, messages[known] ?? 'Không thể dịch bản ghi.');
  }
};
