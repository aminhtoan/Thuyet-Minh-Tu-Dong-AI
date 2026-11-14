import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { Types } from 'mongoose';

const directory = await mkdtemp(join(tmpdir(), 'public-media-authorization-'));
process.env.NODE_ENV = 'test';
process.env.UPLOAD_DIR = directory;
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/public_media_mock';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex');
process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

const { default: express } = await import('express');
const { Narration } = await import('../src/models/Narration.js');
const { Translation } = await import('../src/models/Translation.js');
const { Transcript } = await import('../src/models/Transcript.js');
const { Project } = await import('../src/models/Project.js');
const { Media } = await import('../src/models/Media.js');
const { User } = await import('../src/models/User.js');
const { projectRouter } = await import('../src/routes/project.routes.js');
const { errorHandlerMiddleware } = await import('../src/middleware/error-handler.middleware.js');
const { signAccessToken } = await import('../src/utils/jwt.js');

test('public narration listing and playback share the approved current publication policy', async (t) => {
  const projectId = new Types.ObjectId();
  const otherProjectId = new Types.ObjectId();
  const transcriptId = new Types.ObjectId();
  const translationId = new Types.ObjectId();
  const narrationId = new Types.ObjectId();
  const voiceId = new Types.ObjectId();
  const ownerId = new Types.ObjectId();
  const adminId = new Types.ObjectId();
  const otherUserId = new Types.ObjectId();
  const audioPath = 'approved.mp3';
  const audio = Buffer.from('approved-public-audio');
  await writeFile(join(directory, audioPath), audio);

  const transcript = new Transcript({
    _id: transcriptId, projectId, languageCode: 'vi', fullText: 'Xin chào', status: 'READY', revision: 3,
  });
  const translation = new Translation({
    _id: translationId, projectId, transcriptId, sourceLanguage: 'vi', targetLanguage: 'en',
    fullText: 'Hello', status: 'READY', revision: 2, sourceTranscriptRevision: 3,
  });
  const narration = new Narration({
    _id: narrationId, projectId, translationId, voiceId, languageCode: 'en', speed: 1,
    audioPath, mimeType: 'audio/mpeg', fileSize: audio.length, provider: 'mock', model: 'mock',
    status: 'READY', isApproved: true, revision: 1, sourceTranslationRevision: 2,
  });

  t.mock.method(Narration, 'findOne', async (filter: any) => {
    if (String(filter._id) !== narrationId.toString() || String(filter.projectId) !== projectId.toString()) return null;
    if (filter.status !== narration.status || ('isApproved' in filter && filter.isApproved !== narration.isApproved)) return null;
    return narration;
  });
  t.mock.method(Narration, 'find', (filter: any) => ({
    sort: async () => filter.status === narration.status && filter.isApproved === narration.isApproved ? [narration] : [],
  }) as any);
  t.mock.method(Translation, 'findOne', async (filter: any) =>
    String(filter._id) === translationId.toString() && String(filter.projectId) === projectId.toString()
      && filter.status === translation.status ? translation : null);
  t.mock.method(Translation, 'find', async () => [translation] as any);
  t.mock.method(Transcript, 'findOne', async (filter: any) =>
    String(filter._id) === transcriptId.toString() && String(filter.projectId) === projectId.toString()
      ? transcript : null);
  t.mock.method(Transcript, 'find', async () => [transcript] as any);
  t.mock.method(Project, 'find', async () => [{
    _id: projectId, name: 'Published museum guide', description: 'Published description', status: 'TRANSLATED',
  }] as any);
  t.mock.method(Project, 'findOne', (filter: any) => ({
    select: async () => String(filter._id) === projectId.toString()
      && (!filter.userId || String(filter.userId) === ownerId.toString()) ? { _id: projectId } : null,
  }) as any);
  t.mock.method(Media, 'find', async () => [{
    projectId, storagePath: 'projects/source.mp3', originalName: 'source.mp3', fileSize: 42, mediaType: 'AUDIO',
  }] as any);
  t.mock.method(User, 'findOne', async (filter: any) => {
    const id = String(filter._id);
    if (id === adminId.toString()) return { _id: adminId, fullName: 'Admin', email: 'admin@example.test', role: 'ADMIN', status: 'ACTIVE' };
    if (id === ownerId.toString()) return { _id: ownerId, fullName: 'Owner', email: 'owner@example.test', role: 'CUSTOMER', status: 'ACTIVE' };
    if (id === otherUserId.toString()) return { _id: otherUserId, fullName: 'Other', email: 'other@example.test', role: 'CUSTOMER', status: 'ACTIVE' };
    return null;
  });

  const app = express();
  app.use('/api/projects', projectRouter);
  app.use(errorHandlerMiddleware);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const narrationUrl = `${base}/api/projects/public-audio/${projectId}/${narrationId}`;
  const notFound = async (url = narrationUrl) => {
    const response = await fetch(url);
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, 'NARRATION_NOT_FOUND');
  };

  try {
    await t.test('approved READY CURRENT narration is listed and anonymously playable', async () => {
      const listing = await fetch(`${base}/api/projects/public-audio-guides`);
      assert.equal(listing.status, 200);
      const body = await listing.json() as any;
      const languages = body.data.guides[0].languages;
      assert.equal(languages.length, 1);
      assert.equal(languages[0].narrationId, narrationId.toString());
      assert.doesNotMatch(JSON.stringify(body), /public-audio\/[^"/]+\/source/);
      const playback = await fetch(`${base}${languages[0].audioUrl}`);
      assert.equal(playback.status, 200);
      assert.equal(playback.headers.get('content-type'), 'audio/mpeg');
      assert.deepEqual(Buffer.from(await playback.arrayBuffer()), audio);
    });

    await t.test('unapproved READY narration is hidden and direct access is 404', async () => {
      narration.isApproved = false;
      await notFound();
      const body = await (await fetch(`${base}/api/projects/public-audio-guides`)).json() as any;
      assert.deepEqual(body.data.guides, []);
      narration.isApproved = true;
    });

    await t.test('approved stale narration is hidden and direct access is 404', async () => {
      narration.sourceTranslationRevision = 1;
      await notFound();
      const body = await (await fetch(`${base}/api/projects/public-audio-guides`)).json() as any;
      assert.deepEqual(body.data.guides, []);
      narration.sourceTranslationRevision = 2;
    });

    await t.test('approved narration not READY is 404', async () => {
      narration.status = 'FAILED';
      await notFound();
      narration.status = 'READY';
    });

    await t.test('cross-project, nonexistent and invalid identifiers are 404', async () => {
      await notFound(`${base}/api/projects/public-audio/${otherProjectId}/${narrationId}`);
      await notFound(`${base}/api/projects/public-audio/${projectId}/${new Types.ObjectId()}`);
      await notFound(`${base}/api/projects/public-audio/not-an-id/not-an-id`);
    });

    await t.test('public source alias is always private and reveals no file path', async () => {
      const response = await fetch(`${base}/api/projects/public-audio/${projectId}/source`);
      assert.equal(response.status, 404);
      assert.doesNotMatch(await response.text(), /source\.mp3|public-media-authorization|storagePath/);
    });

    await t.test('protected narration preview permits owner and Admin but rejects anonymous and other customers', async () => {
      narration.isApproved = false;
      const protectedUrl = `${base}/api/projects/${projectId}/narrations/${narrationId}/audio`;
      const request = (token?: string) => fetch(protectedUrl, { headers: token ? { authorization: `Bearer ${token}` } : {} });
      assert.equal((await request()).status, 401);
      assert.equal((await request(signAccessToken(otherUserId.toString(), 'CUSTOMER'))).status, 404);
      for (const token of [signAccessToken(ownerId.toString(), 'CUSTOMER'), signAccessToken(adminId.toString(), 'ADMIN')]) {
        const response = await request(token);
        assert.equal(response.status, 200);
        assert.deepEqual(Buffer.from(await response.arrayBuffer()), audio);
      }
      narration.isApproved = true;
    });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
