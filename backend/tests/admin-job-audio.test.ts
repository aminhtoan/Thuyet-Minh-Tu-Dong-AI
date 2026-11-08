import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = await mkdtemp(resolve('../scratch/s38-audio-test-'));

Object.assign(process.env, { NODE_ENV: 'test', MONGODB_URI: 'mongodb://127.0.0.1:1/audio_mock_only',
  JWT_ACCESS_SECRET: 'synthetic-access-not-a-real-secret', JWT_REFRESH_SECRET: 'synthetic-refresh-not-a-real-secret',
  JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '1d', UPLOAD_DIR: directory });
const { ProcessingJob } = await import('../src/models/ProcessingJob.js');
const { Narration } = await import('../src/models/Narration.js');
const { getAdminJobAudio } = await import('../src/services/admin-job-audio.service.js');
const job = () => ({ projectId: '1'.repeat(24), type: 'TTS', status: 'COMPLETED',
  sourceTranslationId: '2'.repeat(24), sourceTranslationRevision: 3, voiceId: '3'.repeat(24),
  targetLanguage: 'ja', startedAt: new Date('2026-01-01T00:00:00Z'), completedAt: new Date('2026-01-01T00:01:00Z') });
test('job audio fails closed for wrong state, missing provenance and ambiguous artifacts', async t => {
  t.mock.method(mongoose, 'connect', () => { throw new Error('DATABASE_FORBIDDEN'); });
  for (const value of [null, { ...job(), type: 'TRANSLATION' }, { ...job(), status: 'PROCESSING' },
    { ...job(), sourceTranslationId: undefined }, { ...job(), startedAt: undefined }]) {
    t.mock.method(ProcessingJob, 'findById', async () => value as never);
    await assert.rejects(getAdminJobAudio('4'.repeat(24)), { code: 'JOB_AUDIO_UNAVAILABLE' });
  }
  t.mock.method(ProcessingJob, 'findById', async () => job() as never);
  for (const matches of [[], [{ _id: 'a' }, { _id: 'b' }]]) {
    t.mock.method(Narration, 'find', (filter: Record<string, unknown>) => {
      assert.deepEqual(filter, { projectId: job().projectId, translationId: job().sourceTranslationId,
        sourceTranslationRevision: 3, voiceId: job().voiceId, languageCode: 'ja', status: 'READY',
        createdAt: { $gte: job().startedAt, $lte: job().completedAt } });
      return { select: () => ({ limit: (limit: number) => { assert.equal(limit, 2); return Promise.resolve(matches); } }) } as never;
    });
    await assert.rejects(getAdminJobAudio('4'.repeat(24)), { code: 'JOB_AUDIO_UNAVAILABLE' });
  }
});

test('actual Admin route protects authenticated read and serves only current bound artifact (all DB mocked)', async t => {
  t.after(() => rm(directory, { recursive: true, force: true }));
  const { Translation } = await import('../src/models/Translation.js');
  const { Transcript } = await import('../src/models/Transcript.js');
  const { User } = await import('../src/models/User.js');
  const { adminRouter } = await import('../src/routes/admin.routes.js');
  const { errorHandlerMiddleware } = await import('../src/middleware/error-handler.middleware.js');
  const { signAccessToken } = await import('../src/utils/jwt.js');
  const { default: express } = await import('express');
  const narrationId = '5'.repeat(24), transcriptId = '6'.repeat(24);
  const audio = Buffer.from('synthetic-mp3-offline-only');
  await writeFile(resolve(directory, 'synthetic.mp3'), audio);
  t.mock.method(mongoose, 'connect', () => { throw Error('DATABASE_FORBIDDEN'); });
  let role = 'ADMIN', reads = 0, stale = false;
  t.mock.method(User, 'findOne', async () => ({ _id: '7'.repeat(24), fullName: 'Synthetic', email: 'test@example.invalid', role, status: 'ACTIVE' }) as never);
  t.mock.method(ProcessingJob, 'findById', async () => { reads++; return job() as never; });
  t.mock.method(Narration, 'find', () => ({ select: () => ({ limit: () => Promise.resolve([{ _id: narrationId }]) }) }) as never);
  t.mock.method(Narration, 'findOne', async () => ({ _id: narrationId, translationId: job().sourceTranslationId,
    sourceTranslationRevision: 3, audioPath: 'synthetic.mp3', mimeType: 'audio/mpeg' }) as never);
  t.mock.method(Translation, 'findOne', async () => ({ _id: job().sourceTranslationId, revision: stale ? 4 : 3,
    transcriptId, sourceTranscriptRevision: 1 }) as never);
  t.mock.method(Transcript, 'findOne', async () => ({ _id: transcriptId, revision: 1 }) as never);
  const app = express(); app.use('/api/admin', adminRouter); app.use(errorHandlerMiddleware);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(done => server.once('listening', done));
  t.after(() => new Promise<void>(done => server.close(() => done())));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const url = 'http://127.0.0.1:' + address.port + '/api/admin/jobs/' + '4'.repeat(24) + '/audio';
  assert.equal((await fetch(url)).status, 401);
  role = 'CUSTOMER';
  const customerToken = signAccessToken('7'.repeat(24), 'CUSTOMER');
  assert.equal((await fetch(url, { headers: { authorization: 'Bearer ' + customerToken } })).status, 403);
  assert.equal(reads, 0);
  role = 'ADMIN';
  const headers = { authorization: 'Bearer ' + signAccessToken('7'.repeat(24), 'ADMIN') };
  const response = await fetch(url, { headers });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control') ?? '', /private, no-store/);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), audio);
  stale = true;
  const denied = await fetch(url, { headers });
  assert.equal(denied.status, 409);
  assert.equal((await denied.json()).error.code, 'NARRATION_PROVENANCE_INVALID');
});
