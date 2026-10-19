import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import mongoose, { type Types } from 'mongoose';
import { ActivityLog } from '../models/ActivityLog.js';
import { Language } from '../models/Language.js';
import { Media } from '../models/Media.js';
import { Narration } from '../models/Narration.js';
import { ProcessingJob } from '../models/ProcessingJob.js';
import { Project } from '../models/Project.js';
import { Translation } from '../models/Translation.js';
import { Transcript } from '../models/Transcript.js';
import { Voice } from '../models/Voice.js';
import { AppError } from '../utils/app-error.js';
import { assertInsideUploadRoot, resolveStoredFile, safeDeleteStoredFile, uploadRoot } from '../utils/file.js';
import { env } from '../config/env.js';
import { getTtsProvider } from './tts/tts.service.js';
import { OpenAiTtsError } from './tts/openai-tts.provider.js';
import { resolveTtsTerminalStatus } from './tts/tts-terminal-state.js';
import { assertApprovedCurrent, loadSource } from './translation/group-translation.service.js';
import { isRevision, narrationProvenance, revisionFenceOperation, translationProvenance } from './artifact-provenance.service.js';

const speed = 1;
const log = async (userId: string, action: string, projectId: Types.ObjectId, language: string, voiceId: Types.ObjectId) => {
  try { await ActivityLog.create({ userId, action, entityType: 'Project', entityId: projectId, description: `${action.replaceAll('_', ' ').toLowerCase()} (${language}, ${voiceId.toString()})` }); } catch { /* best effort */ }
};
const duplicateKey = (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 11000);
const completionConflict = () => new Error('TTS_COMPLETION_CONFLICT');

const serialize = async (narration: { _id: Types.ObjectId; projectId: Types.ObjectId; translationId: Types.ObjectId; voiceId: Types.ObjectId; languageCode: string; speed: number; mimeType: string; fileSize: number; provider: string; model: string; status: string; duration?: number | null; createdAt: Date; updatedAt: Date }) => {
  const voice = await Voice.findById(narration.voiceId).select('name');
  return { id: narration._id.toString(), projectId: narration.projectId.toString(), translationId: narration.translationId.toString(), targetLanguage: narration.languageCode,
    voice: { id: narration.voiceId.toString(), name: voice?.name ?? '' }, speed: narration.speed, mimeType: narration.mimeType, fileSize: narration.fileSize,
    duration: narration.duration ?? null, provider: narration.provider, model: narration.model, status: narration.status,
    audioUrl: `/api/projects/${narration.projectId.toString()}/narrations/${narration._id.toString()}/audio`, createdAt: narration.createdAt, updatedAt: narration.updatedAt };
};

const narrationState = async (projectId: string, narration: { translationId: Types.ObjectId; sourceTranslationRevision?: number | null }) => {
  const translation = await Translation.findOne({ _id: narration.translationId, projectId, status: 'READY' });
  const transcript = translation ? await Transcript.findOne({ _id: translation.transcriptId, projectId }) : null;
  const upstream = translation ? translationProvenance(translation, transcript) : 'UNKNOWN';
  return narrationProvenance(narration, translation, upstream);
};
const requireCurrentNarration = async (projectId: string, narration: { translationId: Types.ObjectId; sourceTranslationRevision?: number | null }) => {
  if (await narrationState(projectId, narration) !== 'CURRENT') throw new AppError(409, 'NARRATION_PROVENANCE_INVALID', 'Narration provenance is missing or stale.');
};

export const listNarrations = async (projectId: string) => {
  const narrations = await Narration.find({ projectId, status: 'READY' }).sort({ createdAt: 1 });
  const translations = await Translation.find({ _id: { $in: narrations.map((item) => item.translationId) }, projectId, status: 'READY' });
  const transcripts = await Transcript.find({ _id: { $in: translations.map((item) => item.transcriptId) }, projectId });
  const translationById = new Map(translations.map((item) => [item._id.toString(), item]));
  const transcriptById = new Map(transcripts.map((item) => [item._id.toString(), item]));
  const current = narrations.filter((item) => {
    const translation = translationById.get(item.translationId.toString());
    const transcript = translation ? transcriptById.get(translation.transcriptId.toString()) : undefined;
    const upstream = translation ? translationProvenance(translation, transcript) : 'UNKNOWN';
    return narrationProvenance(item, translation, upstream) === 'CURRENT';
  });
  return Promise.all(current.map(serialize));
};
export const getNarration = async (projectId: string, narrationId: string) => {
  const narration = await Narration.findOne({ _id: narrationId, projectId, status: 'READY' });
  if (!narration) throw new AppError(404, 'NARRATION_NOT_FOUND', 'Không tìm thấy bản thuyết minh.');
  await requireCurrentNarration(projectId, narration);
  return serialize(narration);
};
export const getAudio = async (projectId: string, narrationId: string) => {
  const narration = await Narration.findOne({ _id: narrationId, projectId, status: 'READY' });
  if (!narration) throw new AppError(404, 'NARRATION_NOT_FOUND', 'Không tìm thấy bản thuyết minh.');
  await requireCurrentNarration(projectId, narration);
  try { return { audio: await readFile(resolveStoredFile(narration.audioPath)), mimeType: narration.mimeType }; }
  catch { throw new AppError(404, 'NARRATION_AUDIO_NOT_FOUND', 'Không tìm thấy tệp âm thanh thuyết minh.'); }
};

const resolveVoice = async (targetLanguage: string, voiceId?: string) => {
  const language = await Language.findOne({ code: targetLanguage, isActive: true });
  if (!language) throw new AppError(400, 'VOICE_NOT_SUPPORTED', 'Ngôn ngữ chưa có giọng đọc được hỗ trợ.');
  const provider = process.env.TTS_PROVIDER?.trim().toLowerCase();
  const voice = voiceId
    ? await Voice.findById(voiceId)
    : await Voice.findOne({ languageId: language._id, provider, providerVoiceId: process.env.TTS_DEFAULT_VOICE?.trim(), isActive: true });
  if (!voice) throw new AppError(404, 'VOICE_NOT_FOUND', 'Không tìm thấy giọng đọc.');
  if (!voice.isActive) throw new AppError(409, 'VOICE_INACTIVE', 'Giọng đọc đã bị vô hiệu hóa.');
  if (voice.languageId.toString() !== language._id.toString() || voice.provider.toLowerCase() !== provider) throw new AppError(400, 'VOICE_NOT_SUPPORTED', 'Giọng đọc không hỗ trợ ngôn ngữ hoặc nhà cung cấp này.');
  return voice;
};

const finalizeIdleAudioProject = async (projectId: string, userId: string) => {
  const session = await mongoose.startSession();
  let status: 'GENERATING_AUDIO' | 'COMPLETED' | null = null;
  try {
    await session.withTransaction(async () => {
      const currentProject = await Project.findOne({ _id: projectId, userId }).session(session);
      if (!currentProject) return;
      if (currentProject.status === 'COMPLETED') { status = 'COMPLETED'; return; }
      if (currentProject.status !== 'GENERATING_AUDIO') return;
      const currentMedia = await Media.findOne({ projectId }).select('mediaType').session(session);
      if (currentMedia?.mediaType !== 'AUDIO') { status = 'GENERATING_AUDIO'; return; }
      const [readyNarrations, activeJob] = await Promise.all([
        Narration.find({ projectId, status: 'READY' }).session(session),
        ProcessingJob.exists({ projectId, status: { $in: ['QUEUED', 'PROCESSING'] } }).session(session),
      ]);
      const translations = await Translation.find({ _id: { $in: readyNarrations.map((item) => item.translationId) }, projectId, status: 'READY' }).session(session);
      const transcripts = await Transcript.find({ _id: { $in: translations.map((item) => item.transcriptId) }, projectId }).session(session);
      const translationById = new Map(translations.map((item) => [item._id.toString(), item]));
      const transcriptById = new Map(transcripts.map((item) => [item._id.toString(), item]));
      const readyNarration = readyNarrations.find((item) => {
        const translation = translationById.get(item.translationId.toString());
        const transcript = translation ? transcriptById.get(translation.transcriptId.toString()) : undefined;
        const upstream = translation ? translationProvenance(translation, transcript) : 'UNKNOWN';
        return narrationProvenance(item, translation, upstream) === 'CURRENT';
      });
      const terminal = resolveTtsTerminalStatus({
        mediaType: currentMedia.mediaType, ttsSucceeded: true, narrationReady: Boolean(readyNarration),
        narrationProjectMatches: Boolean(readyNarration), hasConflictingActiveJob: Boolean(activeJob),
      });
      if (terminal !== 'COMPLETED') { status = 'GENERATING_AUDIO'; return; }
      const updated = await Project.updateOne(
        { _id: projectId, userId, status: 'GENERATING_AUDIO' },
        { status: 'COMPLETED', progress: 100 },
        { session },
      );
      if (updated.matchedCount !== 1) throw completionConflict();
      status = 'COMPLETED';
    });
  } finally { await session.endSession(); }
  return status;
};

export const generate = async (projectId: string, userId: string, targetLanguage: string, requestedVoiceId?: string) => {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
  const translation = await Translation.findOne({ projectId, targetLanguage, status: 'READY' });
  if (!translation) throw new AppError(404, 'TRANSLATION_NOT_FOUND', 'Không tìm thấy bản dịch.');
  const source = await loadSource(projectId);
  const translationState = translationProvenance(translation, { id: source.transcriptId, revision: source.transcriptRevision });
  if (translationState !== 'CURRENT' || !isRevision(translation.revision)) throw new AppError(409, 'TRANSLATION_PROVENANCE_INVALID', 'Translation provenance is missing or stale.');
  if (translation.alignmentFormat === 'GROUPS_V1') assertApprovedCurrent(translation, source);
  if (!translation.fullText.trim()) throw new AppError(409, 'TRANSLATION_EMPTY', 'Bản dịch không có nội dung để tạo giọng đọc.');
  if (translation.fullText.length > 4096) throw new AppError(413, 'TTS_TEXT_TOO_LARGE', 'Nội dung vượt quá giới hạn của dịch vụ giọng đọc.');
  const media = await Media.findOne({ projectId }).select('mediaType');
  if (!media) throw new AppError(404, 'MEDIA_NOT_FOUND', 'Không tìm thấy media nguồn.');
  const voice = await resolveVoice(targetLanguage, requestedVoiceId);
  const existing = await Narration.findOne({ projectId, translationId: translation._id, voiceId: voice._id, speed, status: 'READY' });
  if (existing) {
    if (narrationProvenance(existing, translation, translationState) !== 'CURRENT') throw new AppError(409, 'NARRATION_PROVENANCE_INVALID', 'Narration provenance is missing or stale.');
    const reconciled = media.mediaType === 'AUDIO' ? await finalizeIdleAudioProject(projectId, userId) : null;
    return { project: { id: projectId, status: reconciled ?? project.status }, narration: await serialize(existing), idempotent: true };
  }
  if (!['TRANSLATED', 'GENERATING_AUDIO', 'FAILED'].includes(project.status)) throw new AppError(409, 'INVALID_PROJECT_STATE', 'Trạng thái dự án không cho phép tạo giọng đọc.');

  let job;
  try { job = await ProcessingJob.create({ projectId, type: 'TTS', targetLanguage, voiceId: voice._id,
    sourceTranslationId: translation._id, sourceTranslationRevision: translation.revision,
    status: 'PROCESSING', progress: 0, startedAt: new Date() }); }
  catch (error) { if (duplicateKey(error)) throw new AppError(409, 'TTS_ALREADY_RUNNING', 'Giọng đọc này đang được tạo.'); throw error; }
  await Project.updateOne({ _id: projectId }, { status: 'GENERATING_AUDIO', progress: 0 });
  void log(userId, project.status === 'FAILED' ? 'TTS_RETRIED' : 'TTS_STARTED', project._id, targetLanguage, voice._id);
  let storedPath: string | undefined; let temporaryPath: string | undefined; let persistenceCommitted = false;
  try {
    const result = await getTtsProvider().synthesize({ text: translation.fullText, language: targetLanguage, voice: voice.providerVoiceId, format: 'mp3' });
    if (!(result.audio instanceof Uint8Array) || !result.audio.byteLength || result.format !== 'mp3' || result.mimeType !== 'audio/mpeg' || !result.provider.trim()) throw new Error('TTS_INVALID_RESPONSE');
    const directory = resolve(uploadRoot, 'projects', projectId, 'narrations'); assertInsideUploadRoot(directory); await mkdir(directory, { recursive: true });
    const filename = `narration-${targetLanguage}-${randomUUID()}.mp3`; const finalPath = resolve(directory, filename); temporaryPath = `${finalPath}.tmp`; assertInsideUploadRoot(finalPath);
    await writeFile(temporaryPath, result.audio, { flag: 'wx' }); await rename(temporaryPath, finalPath); temporaryPath = undefined;
    storedPath = relative(uploadRoot, finalPath).replaceAll('\\', '/');
    const session = await mongoose.startSession(); let narrationId = ''; let completedProjectStatus: 'GENERATING_AUDIO' | 'COMPLETED' = 'GENERATING_AUDIO';
    try {
      await session.withTransaction(async () => {
        const [currentProject, currentMedia, currentJob, conflictingActiveJob, currentTranslation, currentTranscript] = await Promise.all([
          Project.findOne({ _id: projectId, userId, status: 'GENERATING_AUDIO' }).session(session),
          Media.findOne({ projectId }).select('mediaType').session(session),
          ProcessingJob.findOne({ _id: job._id, projectId, type: 'TTS', status: 'PROCESSING' }).session(session),
          ProcessingJob.exists({ projectId, _id: { $ne: job._id }, status: { $in: ['QUEUED', 'PROCESSING'] } }).session(session),
          Translation.findOne({ _id: translation._id, projectId, status: 'READY' }).session(session),
          Transcript.findOne({ _id: translation.transcriptId, projectId }).session(session),
        ]);
        if (!currentProject || !currentMedia || !currentJob || !currentTranslation || !currentTranscript ||
          currentTranslation.revision !== translation.revision || translationProvenance(currentTranslation, currentTranscript) !== 'CURRENT') throw completionConflict();
        if (currentTranslation.alignmentFormat === 'GROUPS_V1') assertApprovedCurrent(currentTranslation, await loadSource(projectId, session));
        const transcriptFence = revisionFenceOperation(currentTranscript._id, currentTranscript.revision);
        const translationFence = revisionFenceOperation(currentTranslation._id, currentTranslation.revision);
        const [fencedTranscript, fencedTranslation] = await Promise.all([
          Transcript.updateOne(transcriptFence.filter, transcriptFence.update, { session }),
          Translation.updateOne(translationFence.filter, translationFence.update, { session }),
        ]);
        if (fencedTranscript.matchedCount !== 1 || fencedTranslation.matchedCount !== 1) throw completionConflict();
        const [narration] = await Narration.create([{ projectId, translationId: translation._id, voiceId: voice._id, languageCode: targetLanguage, speed,
          revision: 1, sourceTranslationRevision: translation.revision,
          audioPath: storedPath, mimeType: result.mimeType, fileSize: result.audio.byteLength, provider: result.provider, model: result.model ?? process.env.TTS_MODEL ?? 'unknown', status: 'READY' }], { session });
        if (!narration) throw new Error('TTS_INVALID_RESPONSE'); narrationId = narration._id.toString();
        const terminal = resolveTtsTerminalStatus({
          mediaType: currentMedia.mediaType, ttsSucceeded: true, narrationReady: narration.status === 'READY',
          narrationProjectMatches: narration.projectId.toString() === projectId, hasConflictingActiveJob: Boolean(conflictingActiveJob),
        });
        if (!terminal) throw completionConflict();
        const completedJob = await ProcessingJob.updateOne(
          { _id: job._id, projectId, type: 'TTS', status: 'PROCESSING', sourceTranslationId: translation._id, sourceTranslationRevision: translation.revision },
          { status: 'COMPLETED', progress: 100, completedAt: new Date() },
          { session },
        );
        if (completedJob.matchedCount !== 1) throw completionConflict();
        const completedProject = await Project.updateOne(
          { _id: projectId, userId, status: 'GENERATING_AUDIO' },
          { status: terminal, progress: 100 },
          { session },
        );
        if (completedProject.matchedCount !== 1) throw completionConflict();
        completedProjectStatus = terminal;
      });
      persistenceCommitted = true;
    } finally { await session.endSession(); }
    if (media.mediaType === 'AUDIO' && completedProjectStatus === 'GENERATING_AUDIO') {
      try { completedProjectStatus = await finalizeIdleAudioProject(projectId, userId) ?? completedProjectStatus; }
      catch { /* Artifact/job commit succeeded; a later idempotent request can reconcile the terminal state. */ }
    }
    void log(userId, 'TTS_COMPLETED', project._id, targetLanguage, voice._id);
    return { project: { id: projectId, status: completedProjectStatus }, narration: await getNarration(projectId, narrationId), idempotent: false };
  } catch (error) {
    if (persistenceCommitted) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'TTS_COMPLETION_READ_FAILED', 'Giọng đọc đã được tạo nhưng chưa thể tải trạng thái mới nhất.');
    }
    if (temporaryPath) { try { await unlink(temporaryPath); } catch { /* absent temp */ } }
    if (storedPath) await safeDeleteStoredFile(storedPath);
    if (env.nodeEnv === 'development' && error instanceof OpenAiTtsError) console.error('TTS provider diagnostic:', error.diagnostics);
    const code = error instanceof Error && ['TTS_NOT_CONFIGURED', 'TTS_TIMEOUT', 'TTS_INVALID_RESPONSE', 'TTS_TEXT_TOO_LARGE'].includes(error.message) ? error.message : 'TTS_PROVIDER_ERROR';
    await Promise.all([
      ProcessingJob.updateOne({ _id: job._id, status: 'PROCESSING' }, { status: 'FAILED', errorMessage: code, completedAt: new Date() }),
      Project.updateOne({ _id: projectId, userId, status: 'GENERATING_AUDIO' }, { status: 'FAILED' }),
    ]);
    void log(userId, 'TTS_FAILED', project._id, targetLanguage, voice._id);
    throw new AppError(code === 'TTS_NOT_CONFIGURED' ? 503 : code === 'TTS_TEXT_TOO_LARGE' ? 413 : 502, code, code === 'TTS_NOT_CONFIGURED' ? 'Dịch vụ giọng đọc chưa được cấu hình.' : 'Không thể tạo giọng đọc.');
  }
};
