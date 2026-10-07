import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import mongoose, { type Types } from 'mongoose';
import { ActivityLog } from '../models/ActivityLog.js';
import { Language } from '../models/Language.js';
import { Narration } from '../models/Narration.js';
import { ProcessingJob } from '../models/ProcessingJob.js';
import { Project } from '../models/Project.js';
import { Translation } from '../models/Translation.js';
import { Voice } from '../models/Voice.js';
import { AppError } from '../utils/app-error.js';
import { assertInsideUploadRoot, resolveStoredFile, safeDeleteStoredFile, uploadRoot } from '../utils/file.js';
import { env } from '../config/env.js';
import { getTtsProvider } from './tts/tts.service.js';
import { OpenAiTtsError } from './tts/openai-tts.provider.js';

const speed = 1;
const log = async (userId: string, action: string, projectId: Types.ObjectId, language: string, voiceId: Types.ObjectId) => {
  try { await ActivityLog.create({ userId, action, entityType: 'Project', entityId: projectId, description: `${action.replaceAll('_', ' ').toLowerCase()} (${language}, ${voiceId.toString()})` }); } catch { /* best effort */ }
};
const duplicateKey = (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 11000);

const serialize = async (narration: { _id: Types.ObjectId; projectId: Types.ObjectId; translationId: Types.ObjectId; voiceId: Types.ObjectId; languageCode: string; speed: number; mimeType: string; fileSize: number; provider: string; model: string; status: string; duration?: number | null; createdAt: Date; updatedAt: Date }) => {
  const voice = await Voice.findById(narration.voiceId).select('name');
  return { id: narration._id.toString(), projectId: narration.projectId.toString(), translationId: narration.translationId.toString(), targetLanguage: narration.languageCode,
    voice: { id: narration.voiceId.toString(), name: voice?.name ?? '' }, speed: narration.speed, mimeType: narration.mimeType, fileSize: narration.fileSize,
    duration: narration.duration ?? null, provider: narration.provider, model: narration.model, status: narration.status,
    audioUrl: `/api/projects/${narration.projectId.toString()}/narrations/${narration._id.toString()}/audio`, createdAt: narration.createdAt, updatedAt: narration.updatedAt };
};

export const listNarrations = async (projectId: string) => Promise.all((await Narration.find({ projectId, status: 'READY' }).sort({ createdAt: 1 })).map(serialize));
export const getNarration = async (projectId: string, narrationId: string) => {
  const narration = await Narration.findOne({ _id: narrationId, projectId, status: 'READY' });
  if (!narration) throw new AppError(404, 'NARRATION_NOT_FOUND', 'Không tìm thấy bản thuyết minh.');
  return serialize(narration);
};
export const getAudio = async (projectId: string, narrationId: string) => {
  const narration = await Narration.findOne({ _id: narrationId, projectId, status: 'READY' });
  if (!narration) throw new AppError(404, 'NARRATION_NOT_FOUND', 'Không tìm thấy bản thuyết minh.');
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

export const generate = async (projectId: string, userId: string, targetLanguage: string, requestedVoiceId?: string) => {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
  const translation = await Translation.findOne({ projectId, targetLanguage, status: 'READY' });
  if (!translation) throw new AppError(404, 'TRANSLATION_NOT_FOUND', 'Không tìm thấy bản dịch.');
  if (!translation.fullText.trim()) throw new AppError(409, 'TRANSLATION_EMPTY', 'Bản dịch không có nội dung để tạo giọng đọc.');
  if (translation.fullText.length > 4096) throw new AppError(413, 'TTS_TEXT_TOO_LARGE', 'Nội dung vượt quá giới hạn của dịch vụ giọng đọc.');
  const voice = await resolveVoice(targetLanguage, requestedVoiceId);
  const existing = await Narration.findOne({ translationId: translation._id, voiceId: voice._id, speed, status: 'READY' });
  if (existing) return { project: { id: projectId, status: project.status }, narration: await serialize(existing), idempotent: true };
  if (!['TRANSLATED', 'GENERATING_AUDIO', 'FAILED'].includes(project.status)) throw new AppError(409, 'INVALID_PROJECT_STATE', 'Trạng thái dự án không cho phép tạo giọng đọc.');

  let job;
  try { job = await ProcessingJob.create({ projectId, type: 'TTS', targetLanguage, voiceId: voice._id, status: 'PROCESSING', progress: 0, startedAt: new Date() }); }
  catch (error) { if (duplicateKey(error)) throw new AppError(409, 'TTS_ALREADY_RUNNING', 'Giọng đọc này đang được tạo.'); throw error; }
  await Project.updateOne({ _id: projectId }, { status: 'GENERATING_AUDIO', progress: 0 });
  void log(userId, project.status === 'FAILED' ? 'TTS_RETRIED' : 'TTS_STARTED', project._id, targetLanguage, voice._id);
  let storedPath: string | undefined; let temporaryPath: string | undefined;
  try {
    const result = await getTtsProvider().synthesize({ text: translation.fullText, language: targetLanguage, voice: voice.providerVoiceId, format: 'mp3' });
    if (!(result.audio instanceof Uint8Array) || !result.audio.byteLength || result.format !== 'mp3' || result.mimeType !== 'audio/mpeg' || !result.provider.trim()) throw new Error('TTS_INVALID_RESPONSE');
    const directory = resolve(uploadRoot, 'projects', projectId, 'narrations'); assertInsideUploadRoot(directory); await mkdir(directory, { recursive: true });
    const filename = `narration-${targetLanguage}-${randomUUID()}.mp3`; const finalPath = resolve(directory, filename); temporaryPath = `${finalPath}.tmp`; assertInsideUploadRoot(finalPath);
    await writeFile(temporaryPath, result.audio, { flag: 'wx' }); await rename(temporaryPath, finalPath); temporaryPath = undefined;
    storedPath = relative(uploadRoot, finalPath).replaceAll('\\', '/');
    const session = await mongoose.startSession(); let narrationId = '';
    try {
      await session.withTransaction(async () => {
        const [narration] = await Narration.create([{ projectId, translationId: translation._id, voiceId: voice._id, languageCode: targetLanguage, speed,
          audioPath: storedPath, mimeType: result.mimeType, fileSize: result.audio.byteLength, provider: result.provider, model: result.model ?? process.env.TTS_MODEL ?? 'unknown', status: 'READY' }], { session });
        if (!narration) throw new Error('TTS_INVALID_RESPONSE'); narrationId = narration._id.toString();
        await ProcessingJob.updateOne({ _id: job._id }, { status: 'COMPLETED', progress: 100, completedAt: new Date() }, { session });
        await Project.updateOne({ _id: projectId }, { status: 'GENERATING_AUDIO', progress: 100 }, { session });
      });
    } finally { await session.endSession(); }
    void log(userId, 'TTS_COMPLETED', project._id, targetLanguage, voice._id);
    return { project: { id: projectId, status: 'GENERATING_AUDIO' }, narration: await getNarration(projectId, narrationId), idempotent: false };
  } catch (error) {
    if (temporaryPath) { try { await unlink(temporaryPath); } catch { /* absent temp */ } }
    if (storedPath) await safeDeleteStoredFile(storedPath);
    if (env.nodeEnv === 'development' && error instanceof OpenAiTtsError) console.error('TTS provider diagnostic:', error.diagnostics);
    const code = error instanceof Error && ['TTS_NOT_CONFIGURED', 'TTS_TIMEOUT', 'TTS_INVALID_RESPONSE', 'TTS_TEXT_TOO_LARGE'].includes(error.message) ? error.message : 'TTS_PROVIDER_ERROR';
    await Promise.all([ProcessingJob.updateOne({ _id: job._id }, { status: 'FAILED', errorMessage: code, completedAt: new Date() }), Project.updateOne({ _id: projectId }, { status: 'FAILED' })]);
    void log(userId, 'TTS_FAILED', project._id, targetLanguage, voice._id);
    throw new AppError(code === 'TTS_NOT_CONFIGURED' ? 503 : code === 'TTS_TEXT_TOO_LARGE' ? 413 : 502, code, code === 'TTS_NOT_CONFIGURED' ? 'Dịch vụ giọng đọc chưa được cấu hình.' : 'Không thể tạo giọng đọc.');
  }
};
