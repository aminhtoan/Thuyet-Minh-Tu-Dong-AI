import { createHash } from 'node:crypto';
import { open, stat } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { drainRuntime } from '../maintenance/runtime.js';
import { Result } from '../models/Result.js';
import { Project } from '../models/Project.js';
import { Media } from '../models/Media.js';
import { AppError } from '../utils/app-error.js';
import { resolveMediaExecutable } from '../utils/media-executable.js';
import { checkedStoredPath } from './original-audio-artifact.js';
import { getResult } from './result.service.js';
import { getMediaProcessor } from './media-processing/media-processing.service.js';
import { runMediaCommand } from './media-processing/ffmpeg-media-processor.js';

const unavailable = () => new AppError(404, 'PUBLIC_VIDEO_UNAVAILABLE', 'Video is not publicly available.');
export async function digestVideo(handle: FileHandle) {
  const hash = createHash('sha256');
  const buffer = Buffer.alloc(64 * 1024);
  let position = 0;
  for (;;) {
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, position);
    if (!bytesRead) break;
    hash.update(buffer.subarray(0, bytesRead)); position += bytesRead;
  }
  return hash.digest('hex');
}

async function context(projectId: string, resultId: string) {
  const result = await Result.findOne({ _id: resultId, projectId });
  const project = await Project.findOne({ _id: projectId });
  const media = await Media.findOne({ projectId });
  if (!result || !project || !media || media.mediaType !== 'VIDEO' || !media.updatedAt || result.mimeType !== 'video/mp4') throw unavailable();
  // Reuse the protected Result's complete transcript -> translation -> narration revision chain.
  await getResult(projectId, resultId);
  const snapshot = createHash('sha256').update(JSON.stringify([
    String(result._id), projectId, String(result.narrationId), result.sourceNarrationRevision,
    result.videoPath, result.fileSize, result.duration, result.languageCode, result.mimeType,
    String(media._id), media.updatedAt.toISOString(), media.storagePath,
  ])).digest('hex');
  return { result, project, media, snapshot };
}

async function openGenerated(value: Awaited<ReturnType<typeof context>>) {
  const path = await checkedStoredPath(value.result.videoPath).catch(() => { throw unavailable(); });
  const handle = await open(path, 'r').catch(() => { throw unavailable(); });
  try {
    const info = await handle.stat();
    // Reject source aliases, including symlinks and hard links; never fall back to uploaded video.
    const sourcePath = await checkedStoredPath(value.media.storagePath);
    const source = await stat(sourcePath);
    if (path === sourcePath || (info.ino === source.ino && info.dev === source.dev)
      || info.size !== value.result.fileSize || value.result.duration <= 0) throw unavailable();
    return { handle, path, size: info.size };
  } catch { await handle.close(); throw unavailable(); }
}

const status = (result: Awaited<ReturnType<typeof context>>['result']) => ({
  resultId: String(result._id), projectId: String(result.projectId),
  enabled: result.videoPublication?.enabled === true, version: result.videoPublication?.version ?? 0,
});
export async function videoPublicationStatus(projectId: string, resultId: string) {
  const result = await Result.findOne({ _id: resultId, projectId });
  if (!result) throw unavailable();
  return status(result);
}

export async function setVideoPublication(projectId: string, resultId: string, adminId: string, input: { enabled: boolean; version: number }) {
  return drainRuntime.track('activeOperations', async () => {
    const result = await Result.findOne({ _id: resultId, projectId });
    if (!result) throw unavailable();
    if ((result.videoPublication?.version ?? 0) !== input.version) {
      throw new AppError(409, 'VIDEO_PUBLICATION_CONFLICT', 'Reload publication status before retrying.');
    }
    let snapshot: string | undefined; let digest: string | undefined;
    if (input.enabled) {
      const value = await context(projectId, resultId);
      const file = await openGenerated(value);
      try {
        const before = await digestVideo(file.handle);
        const probe = await getMediaProcessor().probe(file.path);
        if (!probe.format.split(',').includes('mp4') || !probe.hasVideo || !probe.hasAudio
          || probe.videoCodec !== 'h264' || probe.audioCodec !== 'aac' || !Number.isFinite(probe.duration)
          || probe.duration <= 0 || Math.abs(probe.duration - result.duration) > 0.25) throw unavailable();
        // Probe alone cannot prove that all packets decode. This only reads the generated file.
        await runMediaCommand(await resolveMediaExecutable('ffmpeg', process.env.FFMPEG_PATH), [
          '-nostdin', '-v', 'error', '-xerror', '-i', file.path, '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-',
        ], 'VALIDATE_OUTPUT');
        digest = await digestVideo(file.handle);
        if (digest !== before) throw unavailable();
        const current = await context(projectId, resultId);
        if (current.snapshot !== value.snapshot) throw unavailable();
        snapshot = value.snapshot;
      } catch { throw new AppError(409, 'VIDEO_ARTIFACT_INVALID', 'Generated MP4 could not be validated.'); }
      finally { await file.handle.close(); }
    }
    const versionFilter = input.version === 0
      ? { $or: [{ 'videoPublication.version': 0 }, { 'videoPublication.version': { $exists: false } }] }
      : { 'videoPublication.version': input.version };
    const updated = await Result.findOneAndUpdate({ _id: resultId, projectId, ...versionFilter }, {
      $set: { videoPublication: { enabled: input.enabled, version: input.version + 1, snapshot, digest, reviewedBy: adminId, reviewedAt: new Date() } },
    }, { new: true, runValidators: true });
    if (!updated) throw new AppError(409, 'VIDEO_PUBLICATION_CONFLICT', 'Reload publication status before retrying.');
    return status(updated);
  });
}

export async function openPublicVideo(projectId: string, resultId: string) {
  return drainRuntime.track('activeOperations', async () => {
    let file: Awaited<ReturnType<typeof openGenerated>> | undefined;
    try {
      const value = await context(projectId, resultId);
      const publication = value.result.videoPublication;
      if (!publication?.enabled || publication.snapshot !== value.snapshot || !publication.digest) throw unavailable();
      file = await openGenerated(value);
      if (await digestVideo(file.handle) !== publication.digest) throw unavailable();
      // Re-read after disk validation so revocation during validation cannot authorize playback.
      const current = await context(projectId, resultId);
      if (!current.result.videoPublication?.enabled || current.result.videoPublication.version !== publication.version
        || current.snapshot !== value.snapshot) throw unavailable();
      return { ...file, title: value.project.name, languageCode: value.result.languageCode };
    } catch (error) {
      await file?.handle.close();
      if (error instanceof AppError || (error instanceof Error && 'code' in error && ['ENOENT', 'INVALID_STORAGE_PATH'].includes(String(error.code)))) throw unavailable();
      throw error;
    }
  });
}

export async function listPublicVideos() {
  const results = await Result.find({ 'videoPublication.enabled': true }).sort({ _id: 1 }).limit(100);
  const videos = [];
  for (const result of results) {
    try {
      const file = await openPublicVideo(String(result.projectId), String(result._id));
      await file.handle.close();
      videos.push({ id: String(result._id), projectId: String(result.projectId), title: file.title,
        artifactType: 'VIDEO', sourceMediaType: 'VIDEO', languageCode: file.languageCode, mimeType: 'video/mp4',
        duration: result.duration, fileUrl: `/api/published-video-narrations/public/projects/${result.projectId}/results/${result._id}/file` });
    } catch (error) { if (!(error instanceof AppError && error.statusCode === 404)) throw error; }
  }
  return videos;
}
