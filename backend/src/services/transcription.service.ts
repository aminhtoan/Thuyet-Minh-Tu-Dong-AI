import { access } from 'node:fs/promises';
import mongoose, { type ClientSession, type Types } from 'mongoose';
import { ActivityLog } from '../models/ActivityLog.js';
import { Media } from '../models/Media.js';
import { ProcessingJob } from '../models/ProcessingJob.js';
import { Project } from '../models/Project.js';
import { Transcript } from '../models/Transcript.js';
import { TranscriptSegment } from '../models/TranscriptSegment.js';
import { AppError } from '../utils/app-error.js';
import { resolveStoredFile } from '../utils/file.js';
import { getSttProvider } from './stt/stt.service.js';
import { OpenAiSttError } from './stt/openai-stt.provider.js';
import { GeminiSttError } from './stt/gemini-stt.provider.js';
import { env } from '../config/env.js';
import { isRevision, nextRevision } from './artifact-provenance.service.js';

export const rebuildTranscriptFullText = (segments: readonly { sequence: number; text: string }[], editedSegmentId: string, editedText: string, ids: readonly string[]) => {
  if (segments.length === 0 || segments.length !== ids.length) throw new AppError(409, 'TRANSCRIPT_SEGMENTS_INCONSISTENT', 'Các phân đoạn bản ghi không nhất quán.');
  let found = false;
  const text = segments.map((segment, index) => {
    if (segment.sequence !== index + 1 || !segment.text.trim()) throw new AppError(409, 'TRANSCRIPT_SEGMENTS_INCONSISTENT', 'Các phân đoạn bản ghi không nhất quán.');
    if (ids[index] === editedSegmentId) { found = true; return editedText; }
    return segment.text.trim();
  }).join(' ');
  if (!found) throw new AppError(404, 'TRANSCRIPT_SEGMENT_NOT_FOUND', 'Không tìm thấy phân đoạn bản ghi.');
  return text;
};

const log = async (userId: string, action: string, entityId: Types.ObjectId) => {
  try { await ActivityLog.create({ userId, action, entityType: 'Project', entityId, description: action.replaceAll('_', ' ').toLowerCase() }); } catch { /* best effort */ }
};
const serialize = async (projectId: string) => {
  const transcript = await Transcript.findOne({ projectId });
  if (!transcript) throw new AppError(404, 'TRANSCRIPT_NOT_FOUND', 'Không tìm thấy bản ghi.');
  const segments = await TranscriptSegment.find({ transcriptId: transcript._id }).sort({ sequence: 1 });
  return { id: transcript._id.toString(), projectId, language: transcript.languageCode, fullText: transcript.fullText, revision: transcript.revision ?? null,
    segments: segments.map((s) => ({ id: s._id.toString(), index: s.sequence - 1, startTime: s.startTime, endTime: s.endTime, text: s.text })),
    createdAt: transcript.createdAt, updatedAt: transcript.updatedAt };
};

export const getTranscript = async (projectId: string) => serialize(projectId);

const assertEditableProject = async (projectId: string, userId: string, session: ClientSession) => {
  const project = await Project.findOne({ _id: projectId, userId }).session(session);
  if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
  const transcriptionJob = await ProcessingJob.findOne({ projectId, type: 'TRANSCRIPTION', status: { $in: ['QUEUED', 'PROCESSING'] } }).session(session);
  if (project.status === 'TRANSCRIBING' || transcriptionJob) {
    throw new AppError(409, 'TRANSCRIPT_EDIT_NOT_ALLOWED', 'Không thể chỉnh sửa bản ghi khi nhận diện giọng nói đang xử lý.');
  }
};

export const updateTranscriptSegment = async (projectId: string, userId: string, segmentId: string, text: string, expectedRevision: number) => {
  const normalizedText = text.trim();
  const session = await mongoose.startSession();
  let result: { transcript: { id: string; revision: number; fullText: string }; segment: { id: string; index: number; startTime: number; endTime: number; text: string } } | undefined;
  let changed = false;
  try {
    await session.withTransaction(async () => {
      await assertEditableProject(projectId, userId, session);
      const transcript = await Transcript.findOne({ projectId }).session(session);
      if (!transcript) throw new AppError(404, 'TRANSCRIPT_NOT_FOUND', 'Không tìm thấy bản ghi.');
      if (!isRevision(transcript.revision)) throw new AppError(409, 'TRANSCRIPT_REVISION_UNAVAILABLE', 'Bản ghi cũ chưa có revision an toàn để chỉnh sửa.');
      if (transcript.revision !== expectedRevision) throw new AppError(409, 'TRANSCRIPT_REVISION_CONFLICT', 'Bản ghi đã thay đổi. Vui lòng tải lại trước khi lưu.');
      if (!['READY', 'SAVED'].includes(transcript.status)) throw new AppError(409, 'TRANSCRIPT_EDIT_NOT_ALLOWED', 'Trạng thái bản ghi hiện tại không cho phép chỉnh sửa.');

      const segment = await TranscriptSegment.findOne({ _id: segmentId, transcriptId: transcript._id }).session(session);
      if (!segment) throw new AppError(404, 'TRANSCRIPT_SEGMENT_NOT_FOUND', 'Không tìm thấy phân đoạn bản ghi.');
      if (segment.text === normalizedText) {
        result = { transcript: { id: transcript._id.toString(), revision: transcript.revision, fullText: transcript.fullText },
          segment: { id: segment._id.toString(), index: segment.sequence - 1, startTime: segment.startTime, endTime: segment.endTime, text: segment.text } };
        return;
      }

      const segments = await TranscriptSegment.find({ transcriptId: transcript._id }).sort({ sequence: 1 }).session(session);
      const ids = segments.map((item) => item._id.toString());
      const fullText = rebuildTranscriptFullText(segments, segmentId, normalizedText, ids);
      const revision = expectedRevision + 1;
      const transcriptWrite = await Transcript.updateOne(
        { _id: transcript._id, projectId, revision: expectedRevision, status: { $in: ['READY', 'SAVED'] } },
        { $set: { fullText, revision } }, { session },
      );
      if (transcriptWrite.matchedCount !== 1) throw new AppError(409, 'TRANSCRIPT_REVISION_CONFLICT', 'Bản ghi đã thay đổi. Vui lòng tải lại trước khi lưu.');
      const segmentWrite = await TranscriptSegment.updateOne(
        { _id: segment._id, transcriptId: transcript._id, text: segment.text }, { $set: { text: normalizedText } }, { session },
      );
      if (segmentWrite.matchedCount !== 1) throw new AppError(409, 'TRANSCRIPT_REVISION_CONFLICT', 'Phân đoạn đã thay đổi. Vui lòng tải lại trước khi lưu.');
      changed = true;
      result = { transcript: { id: transcript._id.toString(), revision, fullText },
        segment: { id: segment._id.toString(), index: segment.sequence - 1, startTime: segment.startTime, endTime: segment.endTime, text: normalizedText } };
    });
  } finally { await session.endSession(); }
  if (!result) throw new AppError(500, 'TRANSCRIPT_UPDATE_FAILED', 'Không thể cập nhật phân đoạn bản ghi.');
  if (changed) void log(userId, 'TRANSCRIPT_SEGMENT_UPDATED', new mongoose.Types.ObjectId(projectId));
  return {
    transcript: result.transcript,
    segment: result.segment,
    downstream: { requiresRevalidation: changed, artifactsPreserved: true, regenerationStarted: false },
  };
};

export const transcribe = async (projectId: string, userId: string) => {
  const project = await Project.findOneAndUpdate(
    { _id: projectId, userId, status: { $in: ['UPLOADED', 'FAILED', 'TRANSCRIBED'] } },
    { $set: { status: 'TRANSCRIBING', progress: 0 } }, { returnDocument: 'before' },
  );
  if (!project) {
    const existing = await Project.findOne({ _id: projectId, userId });
    if (!existing) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
    if (existing.status === 'TRANSCRIBING') throw new AppError(409, 'TRANSCRIPTION_ALREADY_RUNNING', 'Dự án đang được chuyển giọng nói thành văn bản.');
    throw new AppError(409, 'INVALID_PROJECT_STATE', 'Trạng thái dự án không cho phép chuyển giọng nói thành văn bản.');
  }
  const media = await Media.findOne({ projectId });
  if (!media) { await Project.updateOne({ _id: projectId }, { status: project.status }); throw new AppError(404, 'MEDIA_NOT_FOUND', 'Không tìm thấy media nguồn.'); }
  const filePath = resolveStoredFile(media.storagePath);
  try { await access(filePath); } catch { await Project.updateOne({ _id: projectId }, { status: project.status }); throw new AppError(409, 'MEDIA_FILE_MISSING', 'Tệp media nguồn không tồn tại.'); }
  const job = await ProcessingJob.create({ projectId, type: 'TRANSCRIPTION', status: 'PROCESSING', progress: 0, startedAt: new Date() });
  void log(userId, project.status === 'FAILED' ? 'TRANSCRIPTION_RETRIED' : 'TRANSCRIPTION_STARTED', project._id);
  try {
    const result = await getSttProvider().transcribe({ filePath, mimeType: media.mimeType, language: project.sourceLanguage });
    if (!result.text.trim() || !result.segments.length) throw new Error('STT_INVALID_RESPONSE');
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const currentTranscript = await Transcript.findOne({ projectId }).session(session);
        const revision = nextRevision(currentTranscript?.revision);
        const transcript = currentTranscript
          ? await Transcript.findOneAndUpdate(
            { _id: currentTranscript._id, ...(currentTranscript.revision === undefined ? { revision: { $exists: false } } : { revision: currentTranscript.revision }) },
            { $set: { languageCode: project.sourceLanguage, fullText: result.text.trim(), status: 'READY', revision } },
            { returnDocument: 'after', session },
          )
          : (await Transcript.create([{ projectId, languageCode: project.sourceLanguage, fullText: result.text.trim(), status: 'READY', revision }], { session }))[0];
        if (!transcript) throw new Error('TRANSCRIPT_REVISION_CONFLICT');
        await TranscriptSegment.deleteMany({ transcriptId: transcript._id }, { session });
        await TranscriptSegment.insertMany(result.segments.map((s, index) => ({ transcriptId: transcript._id, sequence: index + 1, startTime: s.start, endTime: s.end, text: s.text.trim() })), { session });
        await ProcessingJob.updateOne({ _id: job._id }, { status: 'COMPLETED', progress: 100, completedAt: new Date() }, { session });
        await Project.updateOne({ _id: projectId }, { status: 'TRANSCRIBED', progress: 100 }, { session });
      });
    } finally { await session.endSession(); }
    void log(userId, 'TRANSCRIPTION_COMPLETED', project._id);
    return { project: { id: projectId, status: 'TRANSCRIBED' }, transcript: { ...(await serialize(projectId)), segmentCount: result.segments.length } };
  } catch (error) {
    if (env.nodeEnv === 'development' && error instanceof OpenAiSttError) {
      console.error('STT provider diagnostic:', error.diagnostics);
    }
    if (env.nodeEnv === 'development' && error instanceof GeminiSttError) {
      console.error('STT provider diagnostic:', { provider: 'gemini', code: error.code, httpStatus: error.httpStatus });
    }
    const code = error instanceof GeminiSttError ? error.code : error instanceof Error && ['STT_NOT_CONFIGURED', 'STT_FILE_TOO_LARGE', 'STT_TIMEOUT', 'STT_INVALID_RESPONSE'].includes(error.message) ? error.message : 'STT_PROVIDER_ERROR';
    await Promise.all([ProcessingJob.updateOne({ _id: job._id }, { status: 'FAILED', errorMessage: code, completedAt: new Date() }), Project.updateOne({ _id: projectId }, { status: 'FAILED' })]);
    void log(userId, 'TRANSCRIPTION_FAILED', project._id);
    const status = ['STT_NOT_CONFIGURED', 'STT_INVALID_KEY', 'STT_MODEL_UNAVAILABLE'].includes(code) ? 503 : code === 'STT_FILE_TOO_LARGE' ? 413 : code === 'STT_QUOTA_EXCEEDED' ? 429 : code === 'STT_INVALID_FILE' ? 422 : 502;
    const messages: Record<string, string> = {
      STT_NOT_CONFIGURED: 'Dịch vụ chuyển giọng nói thành văn bản chưa được cấu hình.',
      STT_INVALID_KEY: 'Khóa dịch vụ chuyển giọng nói thành văn bản không hợp lệ.',
      STT_MODEL_UNAVAILABLE: 'Model chuyển giọng nói thành văn bản không khả dụng hoặc chưa được cấp quyền.',
      STT_QUOTA_EXCEEDED: 'Dịch vụ chuyển giọng nói thành văn bản đã hết hạn mức hoặc bị giới hạn yêu cầu.',
      STT_INVALID_FILE: 'Tệp âm thanh/video không hợp lệ hoặc không thể xử lý.',
      STT_NO_SPEECH: 'Không nhận diện được lời nói trong tệp.',
    };
    throw new AppError(status, code, messages[code] ?? 'Không thể chuyển giọng nói thành văn bản.');
  }
};
