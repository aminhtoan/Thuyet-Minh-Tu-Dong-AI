import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import mongoose, { Types } from 'mongoose';

const directory = await mkdtemp(join(tmpdir(), 'narration-stt-debug-'));
process.env.NODE_ENV = 'test';
process.env.UPLOAD_DIR = directory;
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/stt_mock_test';
process.env.JWT_ACCESS_SECRET = randomBytes(48).toString('hex');
process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
process.env.JWT_ACCESS_EXPIRES_IN = '15m'; process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.OPENAI_API_KEY = 'test-only-no-real-key'; process.env.STT_MODEL = 'whisper-1'; process.env.STT_PROVIDER = 'openai';
const { transcribe } = await import('../src/services/transcription.service.js');
const { setSttProviderForTests } = await import('../src/services/stt/stt.service.js');
const { OpenAiSttProvider } = await import('../src/services/stt/openai-stt.provider.js');
const { Project } = await import('../src/models/Project.js');
const { Media } = await import('../src/models/Media.js');
const { ProcessingJob } = await import('../src/models/ProcessingJob.js');
const { Transcript } = await import('../src/models/Transcript.js');
const { TranscriptSegment } = await import('../src/models/TranscriptSegment.js');
const { ActivityLog } = await import('../src/models/ActivityLog.js');
const { AppError } = await import('../src/utils/app-error.js');
const { GeminiSttError } = await import('../src/services/stt/gemini-stt.provider.js');

test('STT service integration with mock persistence and no external provider calls', async (t) => {
  const projectId = new Types.ObjectId(); const userId = new Types.ObjectId().toString();
  const transcriptId = new Types.ObjectId(); let status = 'UPLOADED'; let path = 'source.mp3'; let stored: any = null; let segments: any[] = []; let lastJob: any = null;
  await writeFile(join(directory, path), new Uint8Array([1, 2, 3]));
  t.mock.method(Project, 'findOneAndUpdate', async () => { const before = status; status = 'TRANSCRIBING'; return { _id: projectId, status: before, sourceLanguage: 'vi' }; });
  t.mock.method(Project, 'updateOne', async (_filter: unknown, update: any) => { status = update.status; });
  t.mock.method(Media, 'findOne', async () => ({ storagePath: path, mimeType: 'audio/mpeg' }));
  t.mock.method(ProcessingJob, 'create', async () => ({ _id: new Types.ObjectId() }));
  t.mock.method(ProcessingJob, 'updateOne', async (_filter: unknown, update: unknown) => { lastJob = update; });
  t.mock.method(ActivityLog, 'create', async () => ({}));
  t.mock.method(mongoose, 'startSession', async () => ({ withTransaction: async (fn: () => Promise<void>) => fn(), endSession: async () => {} }));
  const query = (value: unknown) => ({ session() { return this; }, then(resolve: (item: unknown) => void, reject: (error: unknown) => void) { return Promise.resolve(value).then(resolve, reject); } });
  t.mock.method(Transcript, 'findOneAndUpdate', async (_filter: unknown, value: any) => { stored = { ...(stored ?? {}), ...(value.$set ?? value), _id: transcriptId }; return stored; });
  t.mock.method(Transcript, 'create', async (rows: any[]) => { stored = { ...rows[0], _id: transcriptId }; return [stored]; });
  t.mock.method(Transcript, 'findOne', () => query(stored));
  t.mock.method(TranscriptSegment, 'deleteMany', async () => { segments = []; });
  t.mock.method(TranscriptSegment, 'insertMany', async (items: any[]) => { segments = items.map((s) => ({ ...s, _id: new Types.ObjectId() })); });
  t.mock.method(TranscriptSegment, 'find', () => ({ sort: () => segments }));
  // Any unexpected request is rejected locally, never forwarded to the network.
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('UNEXPECTED_NETWORK_CALL'); });
  const fails = async (code: string, http: number) => {
    await assert.rejects(transcribe(projectId.toString(), userId), (error: unknown) => {
      assert.ok(error instanceof AppError); assert.equal(error.code, code); assert.equal(error.statusCode, http); return true;
    });
  };
  try {
    await t.test('missing source file restores prior status without provider request', async () => {
      status = 'UPLOADED'; path = 'missing.mp3'; await fails('MEDIA_FILE_MISSING', 409); assert.equal(status, 'UPLOADED'); path = 'source.mp3';
    });
    await t.test('missing provider key returns safe 503', async () => {
      delete process.env.OPENAI_API_KEY; setSttProviderForTests(); await fails('STT_NOT_CONFIGURED', 503); assert.equal(status, 'FAILED'); process.env.OPENAI_API_KEY = 'test-only-no-real-key';
    });
    await t.test('provider timeout maps to 502 and failed job', async () => {
      t.mock.method(globalThis, 'fetch', async () => { throw new DOMException('timeout', 'TimeoutError'); });
      await fails('STT_TIMEOUT', 502); assert.equal(lastJob.errorMessage, 'STT_TIMEOUT');
    });
    await t.test('provider rejection retains sanitized client response', async () => {
      t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ error: { code: 'insufficient_quota', message: 'private-provider-message' } }), { status: 429 }));
      await fails('STT_PROVIDER_ERROR', 502); assert.equal(lastJob.errorMessage, 'STT_PROVIDER_ERROR');
    });
    await t.test('provider adapter sends actual whisper file/language contract to mock fetch', async () => {
      t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
        assert.equal(url, 'https://api.openai.com/v1/audio/transcriptions');
        const form = init.body as FormData;
        assert.equal(form.get('model'), 'whisper-1'); assert.equal(form.get('language'), 'vi'); assert.equal(form.get('response_format'), 'verbose_json'); assert.ok(form.get('file') instanceof Blob);
        return new Response(JSON.stringify({ text: 'Xin chào', language: 'vietnamese', segments: [{ start: 0, end: 1, text: 'Xin chào' }] }), { status: 200 });
      });
      const result = await new OpenAiSttProvider().transcribe({ filePath: join(directory, path), mimeType: 'audio/mpeg', language: 'vi' });
      assert.equal(result.text, 'Xin chào');
    });
    await t.test('success lifecycle persists mock transcript and returns segments', async () => {
      setSttProviderForTests({ async transcribe(input) { assert.equal(input.language, 'vi'); return { text: 'Xin chào', segments: [{ start: 0, end: 1, text: 'Xin chào' }] }; } });
      const result = await transcribe(projectId.toString(), userId);
      assert.equal(status, 'TRANSCRIBED'); assert.equal(lastJob.status, 'COMPLETED'); assert.equal(result.transcript.fullText, 'Xin chào'); assert.equal(result.transcript.segments.length, 1);
    });
    await t.test('failed provider does not overwrite an existing successful transcript', async () => {
      setSttProviderForTests({ async transcribe() { throw new Error('private-message'); } }); await fails('STT_PROVIDER_ERROR', 502); assert.equal(stored.fullText, 'Xin chào');
    });
    await t.test('Gemini quota/key/model errors are mapped without changing old transcript', async () => {
      for (const [code, http] of [['STT_QUOTA_EXCEEDED', 429], ['STT_INVALID_KEY', 503], ['STT_MODEL_UNAVAILABLE', 503], ['STT_NO_SPEECH', 502]] as const) {
        setSttProviderForTests({ async transcribe() { throw new GeminiSttError(code); } });
        await fails(code, http); assert.equal(stored.fullText, 'Xin chào'); assert.equal(lastJob.errorMessage, code);
      }
    });
  } finally { setSttProviderForTests(); await rm(directory, { recursive: true, force: true }); }
});
