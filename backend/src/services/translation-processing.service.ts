import mongoose, { type Types } from 'mongoose';
import { ActivityLog } from '../models/ActivityLog.js';
import { ProcessingJob } from '../models/ProcessingJob.js';
import { Project } from '../models/Project.js';
import { Transcript } from '../models/Transcript.js';
import { TranscriptSegment } from '../models/TranscriptSegment.js';
import { Translation } from '../models/Translation.js';
import { TranslationSegment } from '../models/TranslationSegment.js';
import { AppError } from '../utils/app-error.js';
import { env } from '../config/env.js';
import { getTranslationProvider } from './translation/translation.service.js';
import { OpenAiTranslationError } from './translation/openai-translation.provider.js';
import type { TranslationProviderSegment } from './translation/translation-provider.interface.js';

const writeLog = async (userId: string, action: string, projectId: Types.ObjectId, targetLanguage: string) => {
  try {
    await ActivityLog.create({ userId, action, entityType: 'Project', entityId: projectId, description: `${action.replaceAll('_', ' ').toLowerCase()} (${targetLanguage})` });
  } catch { /* best effort */ }
};

const summary = async (translation: { _id: Types.ObjectId; projectId: Types.ObjectId; sourceLanguage: string; targetLanguage: string; fullText: string; createdAt: Date; updatedAt: Date }) => ({
  id: translation._id.toString(), projectId: translation.projectId.toString(), sourceLanguage: translation.sourceLanguage,
  targetLanguage: translation.targetLanguage, fullText: translation.fullText,
  segmentCount: await TranslationSegment.countDocuments({ translationId: translation._id }),
  createdAt: translation.createdAt, updatedAt: translation.updatedAt,
});

export const listTranslations = async (projectId: string) => {
  const translations = await Translation.find({ projectId, status: 'READY' }).sort({ createdAt: 1 });
  return Promise.all(translations.map((translation) => summary(translation)));
};

export const getTranslation = async (projectId: string, targetLanguage: string) => {
  const translation = await Translation.findOne({ projectId, targetLanguage, status: 'READY' });
  if (!translation) throw new AppError(404, 'TRANSLATION_NOT_FOUND', 'Không tìm thấy bản dịch.');
  const sourceSegments = await TranscriptSegment.find({ transcriptId: translation.transcriptId }).sort({ sequence: 1 });
  const translatedSegments = await TranslationSegment.find({ translationId: translation._id });
  const bySource = new Map(translatedSegments.map((segment) => [segment.transcriptSegmentId.toString(), segment]));
  return {
    ...(await summary(translation)),
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

export const translate = async (projectId: string, userId: string, targetLanguage: string) => {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
  if (project.sourceLanguage === targetLanguage) throw new AppError(400, 'SAME_SOURCE_TARGET_LANGUAGE', 'Ngôn ngữ đích phải khác ngôn ngữ nguồn.');
  const transcript = await Transcript.findOne({ projectId });
  if (!transcript) throw new AppError(404, 'TRANSCRIPT_NOT_FOUND', 'Không tìm thấy bản ghi.');
  const sourceSegments = await TranscriptSegment.find({ transcriptId: transcript._id }).sort({ sequence: 1 });
  if (!transcript.fullText.trim() || !sourceSegments.length || sourceSegments.some((segment) => !segment.text.trim())) throw new AppError(409, 'TRANSCRIPT_NOT_FOUND', 'Bản ghi không có nội dung có thể dịch.');
  const existing = await Translation.findOne({ transcriptId: transcript._id, targetLanguage, status: 'READY' });
  if (existing) return { project: { id: projectId, status: project.status }, translation: await getTranslation(projectId, targetLanguage), idempotent: true };
  if (!['TRANSCRIBED', 'TRANSLATED', 'FAILED'].includes(project.status)) {
    if (project.status === 'TRANSLATING') throw new AppError(409, 'TRANSLATION_ALREADY_RUNNING', 'Dự án đang được dịch.');
    throw new AppError(409, 'INVALID_PROJECT_STATE', 'Trạng thái dự án không cho phép dịch.');
  }

  let job;
  try {
    job = await ProcessingJob.create({ projectId, type: 'TRANSLATION', targetLanguage, status: 'PROCESSING', progress: 0, startedAt: new Date() });
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
    const providerInput = sourceSegments.map((segment) => ({ index: segment.sequence - 1, text: segment.text }));
    const result = await getTranslationProvider().translate({ sourceLanguage: transcript.languageCode, targetLanguage, segments: providerInput });
    if (result.sourceLanguage !== transcript.languageCode || result.targetLanguage !== targetLanguage) throw new Error('TRANSLATION_INVALID_RESPONSE');
    const translated = validateResult(providerInput, result.segments);
    const session = await mongoose.startSession();
    let translationId = '';
    try {
      await session.withTransaction(async () => {
        const translation = await Translation.findOneAndUpdate(
          { transcriptId: transcript._id, targetLanguage },
          { projectId, transcriptId: transcript._id, sourceLanguage: transcript.languageCode, targetLanguage, fullText: translated.map((segment) => segment.text).join(' '), status: 'READY' },
          { upsert: true, returnDocument: 'after', session },
        );
        translationId = translation._id.toString();
        await TranslationSegment.deleteMany({ translationId: translation._id }, { session });
        await TranslationSegment.insertMany(translated.map((segment, index) => ({ translationId: translation._id, transcriptSegmentId: sourceSegments[index]?._id, translatedText: segment.text })), { session });
        await ProcessingJob.updateOne({ _id: job._id }, { status: 'COMPLETED', progress: 100, completedAt: new Date() }, { session });
        await Project.updateOne({ _id: projectId }, { status: 'TRANSLATED', progress: 100 }, { session });
      });
    } finally { await session.endSession(); }
    void writeLog(userId, 'TRANSLATION_COMPLETED', claimed._id, targetLanguage);
    return { project: { id: projectId, status: 'TRANSLATED' }, translation: await getTranslation(projectId, targetLanguage), translationId, idempotent: false };
  } catch (error) {
    if (env.nodeEnv === 'development' && error instanceof OpenAiTranslationError) console.error('Translation provider diagnostic:', error.diagnostics);
    const known = error instanceof Error && ['TRANSLATION_NOT_CONFIGURED', 'TRANSLATION_TIMEOUT', 'TRANSLATION_INVALID_RESPONSE'].includes(error.message) ? error.message : 'TRANSLATION_PROVIDER_ERROR';
    await Promise.all([
      ProcessingJob.updateOne({ _id: job._id }, { status: 'FAILED', errorMessage: known, completedAt: new Date() }),
      Project.updateOne({ _id: projectId }, { status: 'FAILED' }),
    ]);
    void writeLog(userId, 'TRANSLATION_FAILED', claimed._id, targetLanguage);
    throw new AppError(known === 'TRANSLATION_NOT_CONFIGURED' ? 503 : 502, known, known === 'TRANSLATION_NOT_CONFIGURED' ? 'Dịch vụ dịch chưa được cấu hình.' : 'Không thể dịch bản ghi.');
  }
};
