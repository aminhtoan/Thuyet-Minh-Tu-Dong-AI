import { access } from 'node:fs/promises';
import mongoose, { type Types } from 'mongoose';
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
import { env } from '../config/env.js';

const log = async (userId: string, action: string, entityId: Types.ObjectId) => {
  try { await ActivityLog.create({ userId, action, entityType: 'Project', entityId, description: action.replaceAll('_', ' ').toLowerCase() }); } catch { /* best effort */ }
};
const serialize = async (projectId: string) => {
  const transcript = await Transcript.findOne({ projectId });
  if (!transcript) throw new AppError(404, 'TRANSCRIPT_NOT_FOUND', 'Không tìm thấy bản ghi.');
  const segments = await TranscriptSegment.find({ transcriptId: transcript._id }).sort({ sequence: 1 });
  return { id: transcript._id.toString(), projectId, language: transcript.languageCode, fullText: transcript.fullText,
    segments: segments.map((s) => ({ id: s._id.toString(), index: s.sequence - 1, startTime: s.startTime, endTime: s.endTime, text: s.text })),
    createdAt: transcript.createdAt, updatedAt: transcript.updatedAt };
};

export const getTranscript = async (projectId: string) => serialize(projectId);

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
        const transcript = await Transcript.findOneAndUpdate({ projectId }, { projectId, languageCode: project.sourceLanguage, fullText: result.text.trim(), status: 'READY' }, { upsert: true, returnDocument: 'after', session });
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
    const code = error instanceof Error && ['STT_NOT_CONFIGURED', 'STT_FILE_TOO_LARGE', 'STT_TIMEOUT', 'STT_INVALID_RESPONSE'].includes(error.message) ? error.message : 'STT_PROVIDER_ERROR';
    await Promise.all([ProcessingJob.updateOne({ _id: job._id }, { status: 'FAILED', errorMessage: code, completedAt: new Date() }), Project.updateOne({ _id: projectId }, { status: 'FAILED' })]);
    void log(userId, 'TRANSCRIPTION_FAILED', project._id);
    const status = code === 'STT_NOT_CONFIGURED' ? 503 : code === 'STT_FILE_TOO_LARGE' ? 413 : 502;
    throw new AppError(status, code, code === 'STT_NOT_CONFIGURED' ? 'Dịch vụ chuyển giọng nói thành văn bản chưa được cấu hình.' : 'Không thể chuyển giọng nói thành văn bản.');
  }
};
