import { randomUUID } from 'node:crypto';
import { access, mkdir, rename, stat, unlink } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import mongoose, { type Types } from 'mongoose';
import { ActivityLog } from '../models/ActivityLog.js';
import { Media } from '../models/Media.js';
import { Narration } from '../models/Narration.js';
import { ProcessingJob } from '../models/ProcessingJob.js';
import { Project } from '../models/Project.js';
import { Result } from '../models/Result.js';
import { Translation } from '../models/Translation.js';
import { Transcript } from '../models/Transcript.js';
import { AppError } from '../utils/app-error.js';
import { assertInsideUploadRoot, resolveStoredFile, safeDeleteStoredFile, uploadRoot } from '../utils/file.js';
import { getMediaProcessor } from './media-processing/media-processing.service.js';
import { isRevision, narrationProvenance, resultProvenance, revisionFenceOperation, translationProvenance } from './artifact-provenance.service.js';

const duplicateKey = (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 11000);
const log = async (userId: string, action: string, projectId: Types.ObjectId, narrationId: Types.ObjectId) => {
  try { await ActivityLog.create({ userId, action, entityType: 'Project', entityId: projectId, description: `${action.replaceAll('_', ' ').toLowerCase()} (${narrationId.toString()})` }); } catch { /* best effort */ }
};
const serialize = (result: { _id: Types.ObjectId; projectId: Types.ObjectId; narrationId: Types.ObjectId; languageCode: string; mimeType: string; fileSize: number; duration: number; width?: number | null; height?: number | null; createdAt: Date; updatedAt: Date }) => ({
  id: result._id.toString(), projectId: result.projectId.toString(), narrationId: result.narrationId.toString(), targetLanguage: result.languageCode,
  mimeType: result.mimeType, fileSize: result.fileSize, duration: result.duration, width: result.width ?? null, height: result.height ?? null,
  fileUrl: `/api/projects/${result.projectId.toString()}/results/${result._id.toString()}/file`, createdAt: result.createdAt, updatedAt: result.updatedAt,
});

const resultState = async (projectId: string, result: { narrationId: Types.ObjectId; sourceNarrationRevision?: number | null }) => {
  const narration = await Narration.findOne({ _id: result.narrationId, projectId, status: 'READY' });
  const translation = narration ? await Translation.findOne({ _id: narration.translationId, projectId, status: 'READY' }) : null;
  const transcript = translation ? await Transcript.findOne({ _id: translation.transcriptId, projectId }) : null;
  const translationState = translation ? translationProvenance(translation, transcript) : 'UNKNOWN';
  const narrationState = narrationProvenance(narration ?? {}, translation, translationState);
  return resultProvenance(result, narration, narrationState);
};
const requireCurrentResult = async (projectId: string, result: { narrationId: Types.ObjectId; sourceNarrationRevision?: number | null }) => {
  if (await resultState(projectId, result) !== 'CURRENT') throw new AppError(409, 'RESULT_PROVENANCE_INVALID', 'Result provenance is missing or stale.');
};

export const listResults = async (projectId: string) => {
  const results = await Result.find({ projectId }).sort({ createdAt: 1 });
  const narrations = await Narration.find({ _id: { $in: results.map((item) => item.narrationId) }, projectId, status: 'READY' });
  const translations = await Translation.find({ _id: { $in: narrations.map((item) => item.translationId) }, projectId, status: 'READY' });
  const transcripts = await Transcript.find({ _id: { $in: translations.map((item) => item.transcriptId) }, projectId });
  const narrationById = new Map(narrations.map((item) => [item._id.toString(), item]));
  const translationById = new Map(translations.map((item) => [item._id.toString(), item]));
  const transcriptById = new Map(transcripts.map((item) => [item._id.toString(), item]));
  return results.filter((item) => {
    const narration = narrationById.get(item.narrationId.toString());
    const translation = narration ? translationById.get(narration.translationId.toString()) : undefined;
    const transcript = translation ? transcriptById.get(translation.transcriptId.toString()) : undefined;
    const translationState = translation ? translationProvenance(translation, transcript) : 'UNKNOWN';
    const narrationState = narrationProvenance(narration ?? {}, translation, translationState);
    return resultProvenance(item, narration, narrationState) === 'CURRENT';
  }).map(serialize);
};
export const getResult = async (projectId: string, resultId: string) => { const result = await Result.findOne({ _id: resultId, projectId }); if (!result) throw new AppError(404, 'RESULT_NOT_FOUND', 'Không tìm thấy kết quả.'); await requireCurrentResult(projectId, result); return serialize(result); };
export const getResultFile = async (projectId: string, resultId: string) => {
  const result = await Result.findOne({ _id: resultId, projectId }); if (!result) throw new AppError(404, 'RESULT_NOT_FOUND', 'Không tìm thấy kết quả.');
  await requireCurrentResult(projectId, result);
  try { const path = resolveStoredFile(result.videoPath); const info = await stat(path); return { path, size: info.size, mimeType: result.mimeType }; }
  catch { throw new AppError(404, 'RESULT_FILE_MISSING', 'Không tìm thấy tệp kết quả.'); }
};

export const process = async (projectId: string, userId: string, narrationId: string) => {
  const project = await Project.findOne({ _id: projectId, userId }); if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
  const media = await Media.findOne({ projectId }); if (!media) throw new AppError(404, 'MEDIA_NOT_FOUND', 'Không tìm thấy media nguồn.');
  if (media.mediaType !== 'VIDEO') throw new AppError(409, 'VIDEO_SOURCE_REQUIRED', 'Cần video nguồn để tạo kết quả video.');
  const narration = await Narration.findOne({ _id: narrationId, projectId, status: 'READY' }); if (!narration) throw new AppError(404, 'NARRATION_NOT_FOUND', 'Không tìm thấy bản thuyết minh.');
  const translation = await Translation.findOne({ _id: narration.translationId, projectId, status: 'READY' });
  const transcript = translation ? await Transcript.findOne({ _id: translation.transcriptId, projectId }) : null;
  const translationState = translation ? translationProvenance(translation, transcript) : 'UNKNOWN';
  const narrationState = narrationProvenance(narration, translation, translationState);
  if (!translation || !transcript || !isRevision(narration.revision) || narrationState !== 'CURRENT') throw new AppError(409, 'NARRATION_PROVENANCE_INVALID', 'Narration provenance is missing or stale.');
  const existing = await Result.findOne({ projectId, narrationId });
  if (existing) {
    if (resultProvenance(existing, narration, narrationState) !== 'CURRENT') throw new AppError(409, 'RESULT_PROVENANCE_INVALID', 'Result provenance is missing or stale.');
    return { project: { id: projectId, status: project.status }, result: serialize(existing), idempotent: true };
  }
  if (project.status === 'PROCESSING_VIDEO') throw new AppError(409, 'VIDEO_PROCESSING_ALREADY_RUNNING', 'Kết quả này đang được xử lý.');
  if (!['GENERATING_AUDIO', 'FAILED', 'COMPLETED'].includes(project.status)) throw new AppError(409, 'INVALID_PROJECT_STATE', 'Trạng thái dự án không cho phép xử lý video.');
  const sourcePath = resolveStoredFile(media.storagePath); const narrationPath = resolveStoredFile(narration.audioPath);
  try { await access(sourcePath); } catch { throw new AppError(409, 'MEDIA_FILE_MISSING', 'Tệp video nguồn không tồn tại.'); }
  try { await access(narrationPath); } catch { throw new AppError(409, 'NARRATION_FILE_MISSING', 'Tệp giọng đọc không tồn tại.'); }
  let job;
  try { job = await ProcessingJob.create({ projectId, type: 'VIDEO_PROCESSING', targetLanguage: narration.languageCode, narrationId: narration._id,
    sourceNarrationId: narration._id, sourceNarrationRevision: narration.revision,
    status: 'PROCESSING', progress: 0, startedAt: new Date() }); }
  catch (error) { if (duplicateKey(error)) throw new AppError(409, 'VIDEO_PROCESSING_ALREADY_RUNNING', 'Kết quả này đang được xử lý.'); throw error; }
  await Project.updateOne({ _id: projectId }, { status: 'PROCESSING_VIDEO', progress: 0 }); void log(userId, project.status === 'FAILED' ? 'VIDEO_PROCESSING_RETRIED' : 'VIDEO_PROCESSING_STARTED', project._id, narration._id);
  const directory = resolve(uploadRoot, 'projects', projectId, 'results'); assertInsideUploadRoot(directory); await mkdir(directory, { recursive: true });
  const id = randomUUID(); const tempPath = resolve(directory, `.tmp-${id}.mp4`); const finalPath = resolve(directory, `result-${id}.mp4`); assertInsideUploadRoot(tempPath); assertInsideUploadRoot(finalPath); let storedPath: string | undefined;
  try {
    const processed = await getMediaProcessor().composeNarration({ sourceVideoPath: sourcePath, narrationAudioPath: narrationPath, outputPath: tempPath });
    const info = await stat(tempPath); if (!processed.hasVideo || !processed.hasAudio || processed.mimeType !== 'video/mp4' || processed.duration <= 0 || info.size <= 0) throw new Error('MEDIA_PROCESSING_INVALID_OUTPUT');
    await rename(tempPath, finalPath); storedPath = relative(uploadRoot, finalPath).replaceAll('\\', '/'); const session = await mongoose.startSession(); let resultId = '';
    try { await session.withTransaction(async () => {
      const [currentNarration, currentTranslation, currentTranscript] = await Promise.all([
        Narration.findOne({ _id: narration._id, projectId, status: 'READY' }).session(session),
        Translation.findOne({ _id: narration.translationId, projectId, status: 'READY' }).session(session),
        Transcript.findOne({ _id: translation.transcriptId, projectId }).session(session),
      ]);
      const currentTranslationState = currentTranslation ? translationProvenance(currentTranslation, currentTranscript) : 'UNKNOWN';
      if (!currentNarration || !currentTranslation || !currentTranscript || currentNarration.revision !== narration.revision ||
        narrationProvenance(currentNarration, currentTranslation, currentTranslationState) !== 'CURRENT') throw new Error('MEDIA_PROCESSING_SOURCE_CHANGED');
      const transcriptFence = revisionFenceOperation(currentTranscript._id, currentTranscript.revision);
      const translationFence = revisionFenceOperation(currentTranslation._id, currentTranslation.revision);
      const narrationFence = revisionFenceOperation(currentNarration._id, currentNarration.revision);
      const [fencedTranscript, fencedTranslation, fencedNarration] = await Promise.all([
        Transcript.updateOne(transcriptFence.filter, transcriptFence.update, { session }),
        Translation.updateOne(translationFence.filter, translationFence.update, { session }),
        Narration.updateOne(narrationFence.filter, narrationFence.update, { session }),
      ]);
      if (fencedTranscript.matchedCount !== 1 || fencedTranslation.matchedCount !== 1 || fencedNarration.matchedCount !== 1) throw new Error('MEDIA_PROCESSING_SOURCE_CHANGED');
      const [result] = await Result.create([{ projectId, narrationId: narration._id, sourceNarrationRevision: narration.revision,
        languageCode: narration.languageCode, videoPath: storedPath, mimeType: processed.mimeType, fileSize: info.size,
        duration: processed.duration, width: processed.width, height: processed.height }], { session });
      if (!result) throw new Error('MEDIA_PROCESSING_INVALID_OUTPUT'); resultId = result._id.toString();
      const completed = await ProcessingJob.updateOne(
        { _id: job._id, status: 'PROCESSING', sourceNarrationId: narration._id, sourceNarrationRevision: narration.revision },
        { status: 'COMPLETED', progress: 100, completedAt: new Date() }, { session },
      );
      if (completed.matchedCount !== 1) throw new Error('MEDIA_PROCESSING_SOURCE_CHANGED');
      await Project.updateOne({ _id: projectId }, { status: 'COMPLETED', progress: 100 }, { session });
    }); } finally { await session.endSession(); }
    void log(userId, 'VIDEO_PROCESSING_COMPLETED', project._id, narration._id); return { project: { id: projectId, status: 'COMPLETED' }, result: await getResult(projectId, resultId), idempotent: false };
  } catch (error) {
    try { await unlink(tempPath); } catch { /* no partial temp */ } if (storedPath) await safeDeleteStoredFile(storedPath);
    const code = error instanceof Error && ['FFMPEG_NOT_AVAILABLE', 'MEDIA_PROCESSING_TIMEOUT', 'MEDIA_PROCESSING_INVALID_OUTPUT'].includes(error.message) ? error.message : 'MEDIA_PROCESSING_FAILED';
    await Promise.all([ProcessingJob.updateOne({ _id: job._id }, { status: 'FAILED', errorMessage: code, completedAt: new Date() }), Project.updateOne({ _id: projectId }, { status: 'FAILED' })]); void log(userId, 'VIDEO_PROCESSING_FAILED', project._id, narration._id);
    throw new AppError(code === 'FFMPEG_NOT_AVAILABLE' ? 503 : 502, code, code === 'FFMPEG_NOT_AVAILABLE' ? 'FFmpeg hoặc FFprobe chưa khả dụng.' : 'Không thể xử lý video.');
  }
};
