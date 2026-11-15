import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, writeFile, rm, link } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { Types } from 'mongoose';

const directory = await mkdtemp(join(tmpdir(), 'public-video-'));
process.env.NODE_ENV = 'test'; process.env.UPLOAD_DIR = directory;
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/public_video_mock';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex');
process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
const { default: express } = await import('express');
const { Result } = await import('../src/models/Result.js');
const { Project } = await import('../src/models/Project.js');
const { Media } = await import('../src/models/Media.js');
const { Transcript } = await import('../src/models/Transcript.js');
const { Translation } = await import('../src/models/Translation.js');
const { Narration } = await import('../src/models/Narration.js');
const { User } = await import('../src/models/User.js');
const { publicVideoRouter } = await import('../src/routes/public-video.routes.js');
const { projectRouter } = await import('../src/routes/project.routes.js');
const { errorHandlerMiddleware } = await import('../src/middleware/error-handler.middleware.js');
const { signAccessToken } = await import('../src/utils/jwt.js');
const service = await import('../src/services/public-video.service.js');
const { resolveMediaExecutable } = await import('../src/utils/media-executable.js');
const { runMediaCommand } = await import('../src/services/media-processing/ffmpeg-media-processor.js');

test('generated MP4 publication: actual synthetic media, mock database, real HTTP routes', async t => {
  const generatedPath = join(directory, 'generated.mp4');
  t.after(() => rm(directory, { recursive: true, force: true }));
  await runMediaCommand(await resolveMediaExecutable('ffmpeg', process.env.FFMPEG_PATH), [
    '-nostdin', '-y', '-f', 'lavfi', '-i', 'color=c=blue:s=64x64:r=25:d=1',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-c:v', 'libx264', '-c:a', 'aac', '-shortest', generatedPath,
  ], 'RENDER');
  const bytes = await readFile(generatedPath);
  await writeFile(join(directory, 'source.mp4'), 'private source bytes');
  const projectId = new Types.ObjectId(), resultId = new Types.ObjectId(), owner = new Types.ObjectId(), admin = new Types.ObjectId();
  const transcript = new Transcript({ projectId, revision: 1 });
  const translation = new Translation({ projectId, transcriptId: transcript._id, revision: 1, sourceTranscriptRevision: 1, status: 'READY' });
  const narration = new Narration({ projectId, translationId: translation._id, revision: 1, sourceTranslationRevision: 1, status: 'READY', isApproved: false });
  const result = new Result({ _id: resultId, projectId, narrationId: narration._id, sourceNarrationRevision: 1,
    videoPath: 'generated.mp4', mimeType: 'video/mp4', fileSize: bytes.length, duration: 1, languageCode: 'en' });
  const media = new Media({ projectId, storagePath: 'source.mp4', mediaType: 'VIDEO', updatedAt: new Date() });
  const project = new Project({ _id: projectId, userId: owner, name: 'Synthetic video', sourceLanguage: 'vi', status: 'COMPLETED', progress: 100 });
  t.mock.method(Result, 'findOne', async (filter: Record<string, unknown>) => String(filter._id) === String(resultId) && String(filter.projectId) === String(projectId) ? result : null);
  t.mock.method(Result, 'find', () => ({ sort: () => ({ limit: async () => result.videoPublication?.enabled ? [result] : [] }) }) as never);
  t.mock.method(Result, 'findOneAndUpdate', async (filter: Record<string, unknown>, update: { $set: { videoPublication: unknown } }) => {
    const version = result.videoPublication?.version ?? 0;
    if (String(filter.projectId) !== String(projectId) || String(filter._id) !== String(resultId)
      || (filter.$or ? version !== 0 : filter['videoPublication.version'] !== version)) return null;
    result.set('videoPublication', update.$set.videoPublication); return result;
  });
  t.mock.method(Project, 'findOne', (filter: Record<string, unknown>) => {
    const value = String(filter._id) === String(projectId) && (!filter.userId || String(filter.userId) === String(owner)) ? project : null;
    return Object.assign(Promise.resolve(value), { select: async () => value }) as never;
  });
  t.mock.method(Media, 'findOne', async () => media);
  t.mock.method(Transcript, 'findOne', async () => transcript);
  t.mock.method(Translation, 'findOne', async () => translation);
  t.mock.method(Narration, 'findOne', async () => narration);
  t.mock.method(User, 'findOne', async (filter: Record<string, unknown>) => new User({ _id: filter._id,
    fullName: 'Synthetic', email: 'synthetic@example.test', role: String(filter._id) === String(admin) ? 'ADMIN' : 'CUSTOMER', status: 'ACTIVE' }));
  const app = express(); app.use(express.json());
  app.use('/api/published-video-narrations', publicVideoRouter); app.use('/api/projects', projectRouter); app.use(errorHandlerMiddleware);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/published-video-narrations`;
  const fileUrl = `${base}/public/projects/${projectId}/results/${resultId}/file`;
  const adminUrl = `${base}/admin/projects/${projectId}/results/${resultId}/publication`;
  const adminToken = signAccessToken(String(admin), 'ADMIN');
  const ownerToken = signAccessToken(String(owner), 'CUSTOMER');
  const toggle = (enabled: boolean, version = result.videoPublication?.version ?? 0) => fetch(adminUrl, {
    method: 'PATCH', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled, version }),
  });

  await t.test('default OFF even if project is COMPLETED and audio is approved', async () => {
    assert.equal((await service.videoPublicationStatus(String(projectId), String(resultId))).enabled, false);
    narration.isApproved = true;
    assert.deepEqual(await service.listPublicVideos(), []);
    assert.equal((await fetch(fileUrl)).status, 404);
  });
  await t.test('only Admin can enable, with strict input and version precondition', async () => {
    assert.equal((await fetch(adminUrl)).status, 401);
    assert.equal((await fetch(adminUrl, { headers: { Authorization: `Bearer ${ownerToken}` } })).status, 403);
    assert.equal((await fetch(adminUrl, { method: 'PATCH', headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: true, version: 0 }) })).status, 403);
    assert.equal((await toggle(true, 99)).status, 409);
    assert.equal(result.videoPublication, undefined);
  });
  await t.test('valid generated h264/AAC MP4 can be independently published and listed without paths', async () => {
    narration.isApproved = false; // Video publication is independent from audio approval.
    assert.equal((await toggle(true)).status, 200);
    const response = await fetch(`${base}/public`); assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.data.videos.length, 1); assert.equal(body.data.videos[0].artifactType, 'VIDEO');
    assert.ok(!JSON.stringify(body).includes('generated.mp4')); assert.ok(!JSON.stringify(body).includes('source.mp4'));
    const file = await fetch(fileUrl); assert.equal(file.status, 200);
    assert.equal(file.headers.get('cache-control'), 'no-store'); assert.equal(file.headers.get('content-type'), 'video/mp4');
    assert.deepEqual(Buffer.from(await file.arrayBuffer()), bytes);
  });
  await t.test('Range, HEAD and invalid range support browser playback', async () => {
    const response = await fetch(fileUrl, { headers: { Range: 'bytes=0-15' } });
    assert.equal(response.status, 206); assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes.subarray(0, 16));
    assert.equal((await fetch(fileUrl, { method: 'HEAD' })).headers.get('content-length'), String(bytes.length));
    assert.equal((await fetch(fileUrl, { headers: { Range: 'bytes=9999999-' } })).status, 416);
  });
  await t.test('revocation removes listing and blocks old playback URL; stale CAS cannot undo it', async () => {
    const oldVersion = result.videoPublication!.version;
    assert.equal((await toggle(false)).status, 200);
    assert.equal((await fetch(fileUrl)).status, 404); assert.deepEqual(await service.listPublicVideos(), []);
    assert.equal((await toggle(true, oldVersion)).status, 409);
    assert.equal((await toggle(true)).status, 200);
  });
  await t.test('cross-project public playback and activation fail closed', async () => {
    const other = new Types.ObjectId();
    assert.equal((await fetch(fileUrl.replace(String(projectId), String(other)))).status, 404);
    await assert.rejects(service.setVideoPublication(String(other), String(resultId), String(admin), { enabled: true, version: 0 }));
  });
  await t.test('revocation during file validation is rechecked before returning a public handle', async inner => {
    let reads = 0;
    const previous = result.videoPublication!.toObject();
    inner.mock.method(Result, 'findOne', async () => {
      if (++reads === 3) result.set('videoPublication', { ...previous, enabled: false, version: previous.version + 1 });
      return result;
    });
    await assert.rejects(service.openPublicVideo(String(projectId), String(resultId)), { code: 'PUBLIC_VIDEO_UNAVAILABLE' });
    result.set('videoPublication', previous);
  });
  await t.test('stale transcript or source incarnation blocks listing and playback', async () => {
    transcript.revision = 2;
    assert.equal((await fetch(fileUrl)).status, 404); assert.deepEqual(await service.listPublicVideos(), []);
    transcript.revision = 1;
    const previous = media.updatedAt; media.updatedAt = new Date(previous.getTime() + 1000);
    assert.equal((await fetch(fileUrl)).status, 404); media.updatedAt = previous;
    assert.equal((await fetch(fileUrl)).status, 200);
  });
  await t.test('missing, corrupt and same-size tampered generated file fail closed', async () => {
    await rm(generatedPath);
    assert.equal((await fetch(fileUrl)).status, 404); assert.deepEqual(await service.listPublicVideos(), []);
    await writeFile(generatedPath, Buffer.alloc(bytes.length, 42));
    assert.equal((await fetch(fileUrl)).status, 404);
    assert.equal((await toggle(true)).status, 409); // Full probe/decode rejects corrupt bytes, not just extension.
    await writeFile(generatedPath, bytes);
  });
  await t.test('audio-only MP4 is not a valid generated video', async () => {
    const path = join(directory, 'audio-only.mp4');
    await runMediaCommand(await resolveMediaExecutable('ffmpeg', process.env.FFMPEG_PATH), [
      '-nostdin', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-c:a', 'aac', path,
    ], 'RENDER');
    result.videoPath = 'audio-only.mp4'; result.fileSize = (await readFile(path)).length;
    assert.equal((await toggle(true)).status, 409);
    result.videoPath = 'generated.mp4'; result.fileSize = bytes.length;
  });
  await t.test('source path and hard-link source aliases cannot be published', async () => {
    result.videoPath = 'source.mp4'; result.fileSize = 20;
    assert.equal((await fetch(fileUrl)).status, 404);
    await assert.rejects(service.setVideoPublication(String(projectId), String(resultId), String(admin), { enabled: true, version: result.videoPublication!.version }));
    await link(join(directory, 'source.mp4'), join(directory, 'alias.mp4'));
    result.videoPath = 'alias.mp4';
    await assert.rejects(service.setVideoPublication(String(projectId), String(resultId), String(admin), { enabled: true, version: result.videoPublication!.version }));
    result.videoPath = 'generated.mp4'; result.fileSize = bytes.length;
  });
  await t.test('protected Result playback remains authenticated and works after video revocation', async () => {
    assert.equal((await toggle(false)).status, 200);
    const protectedUrl = `http://127.0.0.1:${address.port}/api/projects/${projectId}/results/${resultId}/file`;
    assert.equal((await fetch(protectedUrl)).status, 401);
    assert.equal((await fetch(protectedUrl, { headers: { Authorization: `Bearer ${signAccessToken(String(new Types.ObjectId()), 'CUSTOMER')}` } })).status, 404);
    const response = await fetch(protectedUrl, { headers: { Authorization: `Bearer ${ownerToken}` } });
    assert.equal(response.status, 200); assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    assert.equal((await fetch(`http://127.0.0.1:${address.port}/api/projects/public-audio/${projectId}/source`)).status, 404);
  });
});
