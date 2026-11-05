import mongoose, { type ClientSession } from 'mongoose';
import { Project } from '../models/Project.js';
import { Transcript } from '../models/Transcript.js';
import { Translation } from '../models/Translation.js';
import { Narration } from '../models/Narration.js';
import { Result } from '../models/Result.js';
import { TranslationAttempt } from '../models/TranslationAttempt.js';
import { ProcessingJob } from '../models/ProcessingJob.js';
import { AppError } from '../utils/app-error.js';
import { isRevision } from './artifact-provenance.service.js';
import { SOURCE_LANGUAGES, sourceLanguageState, type SourceLanguage, type SourceLanguageMode } from './source-language-contract.js';

const conflict = () => new AppError(409, 'SOURCE_LANGUAGE_REVISION_CONFLICT', 'Ngôn ngữ nguồn hoặc bản ghi đã thay đổi. Vui lòng tải lại.');
async function assertNoDependents(projectId: string, session: ClientSession) {
  // Sequential reads: parallel operations are unsupported inside transactions.
  if (await Translation.exists({ projectId }).session(session)
    || await Narration.exists({ projectId }).session(session)
    || await Result.exists({ projectId }).session(session)) throw new AppError(409, 'SOURCE_LANGUAGE_HAS_DEPENDENTS', 'Không thể đổi nguồn khi đã có bản dịch hoặc artifact phụ thuộc.');
  if (await TranslationAttempt.exists({ projectId }).session(session)) throw new AppError(409, 'SOURCE_LANGUAGE_HAS_DEPENDENTS', 'Không thể đổi nguồn khi đã có lần dịch hoặc bản nháp.');
  if (await ProcessingJob.exists({ projectId, status: { $in: ['QUEUED', 'PROCESSING'] } }).session(session)) throw new AppError(409, 'SOURCE_LANGUAGE_BUSY', 'Dự án đang xử lý.');
}

export async function updateProjectSource(projectId: string, ownerId: string, input: {
  sourceLanguage?: string | null; sourceLanguageMode?: SourceLanguageMode; name?: string; description?: string;
}) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const project = await Project.findOne({ _id: projectId, userId: ownerId }).session(session);
      if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
      const state = sourceLanguageState(project);
      const mode = input.sourceLanguageMode ?? (input.sourceLanguage ? 'MANUAL' : state.sourceLanguageMode);
      const source = mode === 'AUTO' ? null : input.sourceLanguage ?? state.sourceLanguage;
      if (mode === 'AUTO' && input.sourceLanguage || mode === 'MANUAL' && !SOURCE_LANGUAGES.includes(source as SourceLanguage)) throw new AppError(400, 'SOURCE_LANGUAGE_INVALID', 'Ngôn ngữ nguồn không hợp lệ.');
      const changed = mode !== state.sourceLanguageMode || source !== state.sourceLanguage;
      if (changed) {
        if (!['DRAFT', 'UPLOADED', 'FAILED'].includes(project.status) || await Transcript.exists({ projectId }).session(session)) {
          throw new AppError(409, 'SOURCE_LANGUAGE_CONFIRMATION_REQUIRED', 'Sau khi có bản ghi, hãy dùng API xác nhận nguồn; đổi nguồn đã xác định cần workflow revision.');
        }
        await assertNoDependents(projectId, session);
      }
      const values = { ...(input.name !== undefined ? { name: input.name } : {}), ...(input.description !== undefined ? { description: input.description } : {}),
        ...(changed ? { sourceLanguageMode: mode, sourceLanguage: source, detectedSourceLanguage: null, sourceLanguageStatus: mode === 'AUTO' ? 'PENDING_DETECTION' : 'CONFIRMED' } : {}) };
      const updated = await Project.findOneAndUpdate({ _id: projectId, userId: ownerId, status: project.status }, { $set: values }, { session, returnDocument: 'after', runValidators: true });
      if (!updated) throw conflict();
      return updated;
    });
  } finally { await session.endSession(); }
}

export async function confirmSourceLanguage(projectId: string, ownerId: string, language: string, expectedRevision: number) {
  if (!SOURCE_LANGUAGES.includes(language as SourceLanguage) || !isRevision(expectedRevision)) throw new AppError(400, 'SOURCE_LANGUAGE_INVALID', 'Ngôn ngữ nguồn hoặc revision không hợp lệ.');
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const project = await Project.findOne({ _id: projectId, userId: ownerId }).session(session);
      if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
      const transcript = await Transcript.findOne({ projectId }).session(session);
      if (!transcript || !['READY', 'SAVED'].includes(transcript.status) || !transcript.fullText.trim()) throw new AppError(409, 'TRANSCRIPT_NOT_FOUND', 'Cần có bản ghi hợp lệ trước khi xác nhận nguồn.');
      if (!isRevision(transcript.revision)) throw new AppError(409, 'TRANSCRIPT_REVISION_UNAVAILABLE', 'Bản ghi cũ chưa có revision an toàn.');
      if (transcript.revision !== expectedRevision) throw conflict();
      const state = sourceLanguageState(project);
      if (state.sourceLanguageStatus === 'CONFIRMED' && state.sourceLanguage === language && transcript.languageCode === language) {
        return { ...state, transcriptRevision: expectedRevision, idempotent: true };
      }
      await assertNoDependents(projectId, session);
      // Freeze established source provenance until a dedicated revision workflow
      // exists. In particular, do not race a RAM draft or another process's claim.
      if (state.sourceLanguageStatus === 'CONFIRMED' || transcript.languageCode) throw new AppError(409, 'SOURCE_LANGUAGE_REVISION_REQUIRED', 'Đổi nguồn đã xác định cần workflow revision riêng.');
      if (state.sourceLanguageMode !== 'AUTO' || state.sourceLanguageStatus !== 'NEEDS_CONFIRMATION' || !['TRANSCRIBED', 'FAILED'].includes(project.status)) throw conflict();
      const revision = expectedRevision + 1;
      const written = await Transcript.updateOne({ _id: transcript._id, revision: expectedRevision, languageCode: null, sourceLanguageStatus: 'NEEDS_CONFIRMATION' },
        { $set: { languageCode: language, sourceLanguageStatus: 'CONFIRMED', revision } }, { session });
      if (written.matchedCount !== 1) throw conflict();
      const projectWrite = await Project.updateOne({ _id: projectId, userId: ownerId, sourceLanguageMode: 'AUTO', sourceLanguageStatus: 'NEEDS_CONFIRMATION', sourceLanguage: null, status: project.status },
        { $set: { sourceLanguage: language, sourceLanguageStatus: 'CONFIRMED' } }, { session });
      if (projectWrite.matchedCount !== 1) throw conflict();
      return { ...state, sourceLanguage: language, sourceLanguageStatus: 'CONFIRMED' as const, transcriptRevision: revision, idempotent: false };
    });
  } finally { await session.endSession(); }
}
