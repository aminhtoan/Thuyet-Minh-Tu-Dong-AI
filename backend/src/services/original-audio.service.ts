import { randomUUID } from 'node:crypto';
import { link, mkdir, realpath, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { HydratedDocument } from 'mongoose';
import { Project } from '../models/Project.js';
import { Media } from '../models/Media.js';
import { PublishedOriginalAudio, type PublishedOriginalAudioDocument } from '../models/PublishedOriginalAudio.js';
import { drainRuntime } from '../maintenance/runtime.js';
import { AppError } from '../utils/app-error.js';
import { resolveStoredFile, uploadRoot } from '../utils/file.js';
import { checkedStoredPath, fileDigest, sourceDigest, sourceFingerprint, type OriginalAudioPreparer } from './original-audio-artifact.js';
import { originalIsPublic, reviewTransition } from './original-audio-policy.js';
import { FfmpegOriginalAudioPreparer } from './media-processing/original-audio-preparer.js';
import { MediaProcessingError } from './media-processing/processing-diagnostics.js';

const missing = () => new AppError(404, 'ORIGINAL_AUDIO_NOT_FOUND', 'Không tìm thấy bản âm thanh được công bố.');
async function currentSource(projectId: string) {
  const project = await Project.findById(projectId);
  const media = project ? await Media.findOne({ projectId }) : null;
  if (!project || !media) throw missing();
  const digest = await sourceDigest(media.storagePath);
  return { project, media, fingerprint: sourceFingerprint(media, digest) };
}
type RecordItem = HydratedDocument<PublishedOriginalAudioDocument>;
function serialize(item: RecordItem) {
  return { id: String(item._id), projectId: String(item.projectId), sourceMediaId: String(item.sourceMediaId),
    languageCode: item.languageCode, artifactStatus: item.artifactStatus, publicationStatus: item.publicationStatus,
    publicationEnabled: item.publicationEnabled, authorizationMode: item.authorizationMode ?? null,
    rightsDeclaration: item.rightsDeclaration, rightsReference: item.rightsReference, rightsDeclaredAt: item.rightsDeclaredAt,
    requestedAt: item.requestedAt, reviewedBy: item.reviewedBy ? String(item.reviewedBy) : null,
    preparationErrorCode: item.preparationErrorCode ?? null, preparationStartedAt: item.preparationStartedAt ?? null,
    reviewedAt: item.reviewedAt ?? null, reviewReason: item.reviewReason ?? null, version: item.version,
    duration: item.duration ?? null, fileSize: item.fileSize ?? null, createdAt: item.createdAt, updatedAt: item.updatedAt };
}

export const requestOriginalPublication = (projectId: string, ownerId: string, input: { declaration: string; reference: string }) => drainRuntime.track('activeOperations', async () => {
  if (input.declaration.trim().length < 20 || input.reference.trim().length < 10) throw new AppError(400, 'RIGHTS_REQUIRED', 'Cần khai báo quyền và cung cấp căn cứ công bố.');
  // Explicit owner check: an ADMIN role is not an ownership substitute.
  if (!await Project.exists({ _id: projectId, userId: ownerId })) throw missing();
  const source = await currentSource(projectId);
  if (String(source.project.userId) !== ownerId || source.project.sourceLanguageStatus !== 'CONFIRMED' || !source.project.sourceLanguage) {
    throw new AppError(409, 'SOURCE_NOT_CONFIRMED', 'Cần xác nhận ngôn ngữ nguồn trước khi yêu cầu công bố.');
  }
  const now = new Date();
  const item = await PublishedOriginalAudio.create({ projectId, ownerId, sourceMediaId: source.media._id,
    sourceFingerprint: source.fingerprint, languageCode: source.project.sourceLanguage,
    rightsDeclaration: input.declaration, rightsReference: input.reference, rightsDeclaredAt: now, requestedAt: now });
  return serialize(item);
});

export async function listOriginalRequests(projectId: string, ownerId?: string) {
  if (!await Project.exists({ _id: projectId, ...(ownerId ? { userId: ownerId } : {}) })) throw missing();
  return (await PublishedOriginalAudio.find({ projectId, ...(ownerId ? { ownerId } : {}) }).sort({ createdAt: -1 }).limit(100)).map(serialize);
}

// PROCESSING is a persistent claim, not a timer lease: crashed attempts are never blindly retried.
export const prepareOriginalArtifact = (id: string, preparer: OriginalAudioPreparer = new FfmpegOriginalAudioPreparer(), signal?: AbortSignal) => drainRuntime.track('activeOperations', async () => {
  const item = await PublishedOriginalAudio.findById(id);
  if (!item || !['PENDING', 'FAILED'].includes(item.artifactStatus) || !['PENDING', 'APPROVED'].includes(item.publicationStatus)) throw new AppError(409, 'ORIGINAL_AUDIO_NOT_PREPARABLE', 'Bản thu đang xử lý hoặc không thể chuẩn bị lại.');
  const preparationId = randomUUID();
  const publicationStatus = item.publicationStatus;
  const claimed = await PublishedOriginalAudio.findOneAndUpdate({ _id: id, version: item.version, artifactStatus: item.artifactStatus, publicationStatus },
    { $set: { artifactStatus: 'PROCESSING', preparationId, preparationStartedAt: new Date() }, $unset: { preparationErrorCode: 1 }, $inc: { version: 1 } }, { returnDocument: 'after', runValidators: true });
  if (!claimed) throw new AppError(409, 'PUBLICATION_CONFLICT', 'Yêu cầu đang được xử lý.');
  const claimVersion = claimed.version;
  const path = `published-original/${item._id}/${preparationId}.mp3`;
  const temporaryPath = `published-original/${item._id}/${preparationId}.partial.mp3`;
  const destination = resolveStoredFile(path);
  const temporary = resolveStoredFile(temporaryPath);
  let ownsTemporary = false;
  try {
    const source = await currentSource(String(item.projectId));
    if (String(item.sourceMediaId) !== String(source.media._id) || item.sourceFingerprint !== source.fingerprint
      || String(item.ownerId) !== String(source.project.userId)) throw new AppError(409, 'ORIGINAL_AUDIO_SOURCE_CHANGED', 'Media nguồn đã thay đổi.');
    const expectedRoot = join(await realpath(uploadRoot), 'published-original');
    await mkdir(resolveStoredFile('published-original'), { recursive: true });
    const checkedParent = await realpath(resolveStoredFile('published-original'));
    if (checkedParent !== expectedRoot) throw new AppError(400, 'ORIGINAL_AUDIO_INVALID_PATH', 'Đường dẫn artifact không hợp lệ.');
    await mkdir(dirname(destination), { recursive: true });
    // Resolve the real parent before passing an output path to a process (reject symlink escape).
    const parent = await realpath(dirname(destination));
    if (dirname(parent) !== checkedParent) throw new AppError(400, 'ORIGINAL_AUDIO_INVALID_PATH', 'Đường dẫn artifact không hợp lệ.');
    ownsTemporary = true;
    const metadata = await preparer.prepare(await checkedStoredPath(source.media.storagePath), temporary, signal);
    if (signal?.aborted) throw new AppError(409, 'MEDIA_PROCESSING_CANCELLED', 'Đã hủy chuẩn bị âm thanh.');
    if (metadata.mimeType !== 'audio/mpeg' || !Number.isFinite(metadata.duration) || metadata.duration <= 0) throw new AppError(422, 'ORIGINAL_AUDIO_INVALID_OUTPUT', 'Artifact âm thanh không hợp lệ.');
    const artifact = await fileDigest(temporaryPath);
    const after = await currentSource(String(item.projectId));
    if (after.fingerprint !== item.sourceFingerprint || String(after.media._id) !== String(item.sourceMediaId)) throw new AppError(409, 'ORIGINAL_AUDIO_SOURCE_CHANGED', 'Media nguồn đã thay đổi.');
    // Atomic no-clobber publication on the same filesystem. A crash leaves an unreferenced file,
    // never a READY record pointing at partial bytes. Never delete final output on ambiguous DB failure.
    await link(temporary, destination);
    const finalArtifact = await fileDigest(path);
    if (finalArtifact.digest !== artifact.digest || finalArtifact.size !== artifact.size) throw new AppError(422, 'ORIGINAL_AUDIO_DIGEST_MISMATCH', 'Artifact không khớp kiểm tra toàn vẹn.');
    const updated = await PublishedOriginalAudio.findOneAndUpdate({ _id: id, version: claimVersion, preparationId, artifactStatus: 'PROCESSING', publicationStatus },
      { $set: { artifactPath: path, artifactDigest: artifact.digest, fileSize: artifact.size, duration: metadata.duration, mimeType: metadata.mimeType, artifactStatus: 'READY' }, $inc: { version: 1 } }, { returnDocument: 'after', runValidators: true });
    if (!updated) throw new AppError(409, 'PUBLICATION_CONFLICT', 'Yêu cầu đã thay đổi.');
    return serialize(updated);
  } catch (error) {
    const code = error instanceof AppError ? error.code : error instanceof MediaProcessingError ? error.diagnostics.code : 'ORIGINAL_AUDIO_PREPARATION_FAILED';
    await PublishedOriginalAudio.updateOne({ _id: id, preparationId, artifactStatus: 'PROCESSING' },
      { $set: { artifactStatus: 'FAILED', preparationErrorCode: code }, $inc: { version: 1 } });
    throw new AppError(422, code, 'Không thể chuẩn bị âm thanh gốc. Kiểm tra trạng thái yêu cầu trước khi thử lại.');
  } finally {
    if (ownsTemporary) await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw new AppError(500, 'ORIGINAL_AUDIO_CLEANUP_FAILED', 'Không thể dọn file tạm của lần chuẩn bị âm thanh.');
    });
  }
});

export async function triggerOriginalPreparation(id: string, actor: { id: string; role: string }) {
  const item = await PublishedOriginalAudio.findById(id);
  if (!item || actor.role !== 'ADMIN' && String(item.ownerId) !== actor.id) throw missing();
  if (!await Project.exists({ _id: item.projectId, userId: item.ownerId })) throw missing();
  return prepareOriginalArtifact(id);
}

export const reviewOriginalPublication = (id: string, adminId: string, input: { action: 'APPROVED' | 'REJECTED' | 'REVOKED'; reason: string; version: number }) => drainRuntime.track('activeOperations', async () => {
  const item = await PublishedOriginalAudio.findById(id);
  if (!item) throw missing();
  if (String(item.ownerId) === adminId || !reviewTransition(item.publicationStatus, input.action)) throw new AppError(409, 'INVALID_PUBLICATION_REVIEW', 'Không thể thực hiện thao tác duyệt này.');
  if (input.action === 'APPROVED') {
    const source = await currentSource(String(item.projectId));
    if (source.project.sourceLanguageStatus !== 'CONFIRMED' || source.project.sourceLanguage !== item.languageCode) throw missing();
    if (!originalIsPublic({ ...item.toObject(), publicationStatus: 'APPROVED', reviewedBy: adminId, reviewedAt: new Date() },
      { ownerId: source.project.userId, mediaId: source.media._id, fingerprint: source.fingerprint })) throw missing();
    const artifact = await fileDigest(item.artifactPath!);
    if (artifact.digest !== item.artifactDigest || artifact.size !== item.fileSize) throw missing();
  }
  const updated = await PublishedOriginalAudio.findOneAndUpdate({ _id: id, version: input.version, publicationStatus: item.publicationStatus },
    { $set: { publicationStatus: input.action, reviewedBy: adminId, reviewedAt: new Date(), reviewReason: input.reason }, $inc: { version: 1 } }, { returnDocument: 'after', runValidators: true });
  if (!updated) throw new AppError(409, 'PUBLICATION_CONFLICT', 'Yêu cầu đã thay đổi. Hãy tải lại trước khi duyệt.');
  return serialize(updated);
});

async function eligible(item: RecordItem) {
  try {
    const source = await currentSource(String(item.projectId));
    if (source.project.sourceLanguageStatus !== 'CONFIRMED' || source.project.sourceLanguage !== item.languageCode) return false;
    if (!originalIsPublic(item, { ownerId: source.project.userId, mediaId: source.media._id, fingerprint: source.fingerprint })) return false;
    if (item.artifactPath === source.media.storagePath) return false;
    const artifact = await fileDigest(item.artifactPath!);
    return artifact.digest === item.artifactDigest && artifact.size === item.fileSize;
  } catch { return false; }
}
function publicOption(item: RecordItem) {
  return { id: String(item._id), projectId: String(item.projectId), type: 'ORIGINAL_AUDIO' as const, languageCode: item.languageCode,
    label: item.languageCode === 'vi' ? 'Âm thanh gốc — Tiếng Việt' : `Âm thanh gốc — ${item.languageCode}`,
    audioUrl: `/api/published-original-audio/${item._id}/audio` };
}
export async function listPublicOriginalAudio() {
  const items = await PublishedOriginalAudio.find({ artifactStatus: 'READY', publicationStatus: 'APPROVED', publicationEnabled: true, authorizationMode: 'ADMIN_DIRECT' }).sort({ createdAt: -1 }).limit(100);
  const result = [];
  for (const item of items) if (await eligible(item)) result.push(publicOption(item));
  return result;
}
export async function readPublicOriginalAudio(id: string) {
  const item = await PublishedOriginalAudio.findById(id);
  if (!item || !await eligible(item)) throw missing();
  const artifact = await fileDigest(item.artifactPath!);
  if (artifact.digest !== item.artifactDigest) throw missing();
  // Recheck approval after filesystem work; concurrent revocation wins before serving.
  const fresh = await PublishedOriginalAudio.findOne({ _id: id, version: item.version, publicationStatus: 'APPROVED' });
  if (!fresh || !await eligible(fresh)) throw missing();
  return artifact.data;
}

export async function adminOriginalStatus(projectId: string) {
  const source = await currentSource(projectId);
  const records = await PublishedOriginalAudio.find({ projectId, authorizationMode: 'ADMIN_DIRECT' }).sort({ createdAt: -1 }).limit(100);
  const item = records.find(record => record.sourceFingerprint === source.fingerprint);
  const current = item ? await eligible(item) : false;
  return { sourceFingerprint: source.fingerprint, version: item?.version ?? null,
    publicationId: item ? String(item._id) : null, enabled: item?.publicationEnabled === true,
    status: !item ? records.length ? 'SOURCE_CHANGED' : 'NOT_PUBLIC' : !item.publicationEnabled ? 'DISABLED'
      : item.artifactStatus === 'PROCESSING' ? 'PROCESSING' : item.artifactStatus === 'FAILED' ? 'FAILED'
        : current ? 'READY' : item.artifactStatus === 'READY' ? 'FAILED' : 'PENDING',
    errorCode: item?.preparationErrorCode ?? null };
}

export const setAdminOriginalPublication = (projectId: string, adminId: string,
  input: { enabled: boolean; sourceFingerprint: string; version: number | null },
  preparer: OriginalAudioPreparer = new FfmpegOriginalAudioPreparer()) => drainRuntime.track('activeOperations', async () => {
  const source = await currentSource(projectId);
  if (input.sourceFingerprint !== source.fingerprint) throw new AppError(409, 'ORIGINAL_AUDIO_SOURCE_CHANGED', 'Nguồn đã thay đổi. Hãy tải lại trước khi công bố.');
  // Requires the unique ADMIN_DIRECT index before any concurrent activation can upsert.
  await PublishedOriginalAudio.init();
  const existing = await PublishedOriginalAudio.findOne({ projectId, sourceFingerprint: source.fingerprint, authorizationMode: 'ADMIN_DIRECT' });
  if ((existing?.version ?? null) !== input.version) throw new AppError(409, 'PUBLICATION_CONFLICT', 'Trạng thái đã thay đổi. Hãy tải lại.');
  if (!input.enabled && !existing) return adminOriginalStatus(projectId);
  if (source.project.sourceLanguageStatus !== 'CONFIRMED' || !source.project.sourceLanguage) throw new AppError(409, 'SOURCE_NOT_CONFIRMED', 'Cần xác nhận ngôn ngữ nguồn.');
  let item: RecordItem | null;
  const now = new Date();
  if (!existing) {
    try {
      item = await PublishedOriginalAudio.create({ projectId, ownerId: source.project.userId, sourceMediaId: source.media._id,
        sourceFingerprint: source.fingerprint, languageCode: source.project.sourceLanguage, authorizationMode: 'ADMIN_DIRECT',
        publicationEnabled: true, publicationStatus: 'APPROVED', reviewedBy: adminId, reviewedAt: now,
        requestedAt: now, rightsDeclaredAt: now, rightsDeclaration: 'Admin explicitly authorizes public original audio for this source revision.',
        rightsReference: 'ADMIN_PUBLICATION_CONFIRMATION', reviewReason: 'Admin enabled original audio publication.' });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) throw new AppError(409, 'PUBLICATION_CONFLICT', 'Yêu cầu công bố đã tồn tại. Hãy tải lại.');
      throw error;
    }
  } else {
    item = await PublishedOriginalAudio.findOneAndUpdate({ _id: existing._id, version: input.version },
      { $set: { publicationEnabled: input.enabled, publicationStatus: input.enabled ? 'APPROVED' : 'REVOKED',
        reviewedBy: adminId, reviewedAt: now, reviewReason: input.enabled ? 'Admin enabled original audio publication.' : 'Admin disabled original audio publication.' }, $inc: { version: 1 } },
      { returnDocument: 'after', runValidators: true });
    if (!item) throw new AppError(409, 'PUBLICATION_CONFLICT', 'Trạng thái đã thay đổi. Hãy tải lại.');
  }
  if (input.enabled && ['PENDING', 'FAILED'].includes(item.artifactStatus)) await prepareOriginalArtifact(String(item._id), preparer);
  return adminOriginalStatus(projectId);
});
