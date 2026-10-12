import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';
import { GeminiSttProvider, GeminiSttError, mapGeminiTranscript, type GeminiTransport, GEMINI_STT_MODEL } from '../src/services/stt/gemini-stt.provider.js';
import { getSttProvider } from '../src/services/stt/stt.service.js';
import { OpenAiSttProvider } from '../src/services/stt/openai-stt.provider.js';

const response = (words = [{ text: 'Xin', start_offset: '0s', end_offset: '0.5s' }, { text: 'chào', start_offset: '0.5s', end_offset: '1s' }]) => ({ status: 'completed', output_text: 'Xin chào', steps: [{ type: 'model_output', content: [{ type: 'text', text: 'Xin chào', annotations: words.map((word) => ({ type: 'word_info', ...word })) }] }] });
test('Gemini STT mapping validates actual word timestamps without fabricating offsets', async (t) => {
  await t.test('maps Vietnamese words to existing segments unchanged', () => {
    const result = mapGeminiTranscript(response(), 2, 'vi');
    assert.deepEqual(result.segments, [{ start: 0, end: 0.5, text: 'Xin' }, { start: 0.5, end: 1, text: 'chào' }]); assert.equal(result.text, 'Xin chào');
  });
  await t.test('accepts documented steps-only output', () => {
    const value: any = response(); delete value.output_text; assert.equal(mapGeminiTranscript(value, 2, 'vi').text, 'Xin chào');
  });
  for (const [name, value] of [
    ['negative', response([{ text: 'Xin', start_offset: '-1s', end_offset: '1s' }])],
    ['beyond duration', response([{ text: 'Xin', start_offset: '0s', end_offset: '3s' }])],
    ['reverse', response([{ text: 'Xin', start_offset: '1s', end_offset: '0s' }])],
    ['zero length', response([{ text: 'Xin', start_offset: '1s', end_offset: '1s' }])],
    ['overlap/order', response([{ text: 'Xin', start_offset: '1s', end_offset: '2s' }, { text: 'chào', start_offset: '0s', end_offset: '1s' }])],
    ['missing timestamps', response([{ text: 'Xin', start_offset: '', end_offset: '' }])],
    ['missing words', response([])],
    ['incomplete', { ...response(), status: 'failed' }],
  ]) await t.test(`rejects ${name}`, () => assert.throws(() => mapGeminiTranscript(value, 2, 'vi'), (error: unknown) => error instanceof GeminiSttError && error.code === 'STT_INVALID_RESPONSE'));
  await t.test('no speech is a distinct failure', () => assert.throws(() => mapGeminiTranscript({ ...response([]), output_text: '' }, 2, 'vi'), (error: unknown) => error instanceof GeminiSttError && error.code === 'STT_NO_SPEECH'));
});

test('Gemini MP3/MP4 provider contract with mock SDK transport (no API, no DB)', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'gemini-provider-test-'));
  const file = join(directory, 'source.mp3'); await writeFile(file, new Uint8Array([1, 2]));
  process.env.GEMINI_API_KEY = 'test-only-not-a-real-key'; process.env.GEMINI_STT_MODEL = GEMINI_STT_MODEL;
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('REAL_NETWORK_FORBIDDEN'); });
  let events: string[] = []; let extractedFile = '';
  const transport: GeminiTransport = {
    async checkModel(model) { assert.equal(model, GEMINI_STT_MODEL); events.push('model'); },
    async upload(path, mime) { assert.ok(['audio/mpeg', 'audio/wav'].includes(mime)); await access(path); events.push('upload'); return { name: 'files/test-owned', uri: 'mock-private-file', state: 'ACTIVE' }; },
    async getFile() { throw new Error('Unexpected polling'); },
    async deleteFile(name) { assert.equal(name, 'files/test-owned'); events.push('cleanup'); },
    async transcribe(model, uri, mime, language) { assert.equal(model, GEMINI_STT_MODEL); assert.equal(uri, 'mock-private-file'); assert.equal(language, 'vi-VN'); assert.ok(['audio/mpeg', 'audio/wav'].includes(mime)); events.push('transcribe'); return response(); },
  };
  const probe = async () => ({ duration: 2, hasAudio: true, hasVideo: true, fileSize: 2, format: 'mp3' });
  const extract = async (source: string, destination: string) => { assert.equal(source, file); extractedFile = destination; await writeFile(destination, new Uint8Array([1, 2])); events.push('extract'); };
  const make = () => new GeminiSttProvider(transport, probe, extract);
  const input = { filePath: file, mimeType: 'audio/mpeg', language: 'vi' };
  const rejects = async (code: string, provider = make(), currentInput = input) => assert.rejects(provider.transcribe(currentInput), (error: unknown) => error instanceof GeminiSttError && error.code === code);
  try {
    await t.test('default Gemini and explicit OpenAI remain available', () => { delete process.env.STT_PROVIDER; assert.ok(getSttProvider() instanceof GeminiSttProvider); process.env.STT_PROVIDER = 'openai'; assert.ok(getSttProvider() instanceof OpenAiSttProvider); });
    await t.test('MP3 passed directly and remote file cleaned', async () => { events = []; assert.equal((await make().transcribe(input)).text, 'Xin chào'); assert.deepEqual(events, ['model', 'upload', 'transcribe', 'cleanup']); });
    await t.test('MP4 extracted to temporary WAV; original preserved; cleanup scoped', async () => { events = []; await make().transcribe({ ...input, mimeType: 'video/mp4' }); assert.deepEqual(events, ['model', 'extract', 'upload', 'transcribe', 'cleanup']); await access(file); await assert.rejects(access(extractedFile)); });
    await t.test('missing key does not upload', async () => { events = []; delete process.env.GEMINI_API_KEY; await rejects('STT_NOT_CONFIGURED'); assert.deepEqual(events, []); process.env.GEMINI_API_KEY = 'test-only-not-a-real-key'; });
    await t.test('unsupported model rejected without fallback', async () => { process.env.GEMINI_STT_MODEL = 'whisper-1'; await rejects('STT_MODEL_UNAVAILABLE'); process.env.GEMINI_STT_MODEL = GEMINI_STT_MODEL; });
    await t.test('invalid MIME rejected', async () => { await rejects('STT_INVALID_FILE', make(), { ...input, mimeType: 'application/pdf' }); });
    await t.test('missing source rejected without network', async () => { events = []; await rejects('STT_INVALID_FILE', make(), { ...input, filePath: join(directory, 'absent.mp3') }); assert.deepEqual(events, []); });
    await t.test('no audio rejected before upload', async () => { await rejects('STT_INVALID_FILE', new GeminiSttProvider(transport, async () => ({ ...await probe(), hasAudio: false }))); });
    await t.test('duration guard rejected before upload', async () => { await rejects('STT_INVALID_FILE', new GeminiSttProvider(transport, async () => ({ ...await probe(), duration: 3601 }))); });
    for (const [status, code] of [[401, 'STT_INVALID_KEY'], [403, 'STT_MODEL_UNAVAILABLE'], [404, 'STT_MODEL_UNAVAILABLE'], [429, 'STT_QUOTA_EXCEEDED'], [500, 'STT_PROVIDER_ERROR']] as const) await t.test(`model check ${status} maps to ${code} without upload`, async () => {
      events = []; await rejects(code, new GeminiSttProvider({ ...transport, async checkModel() { throw { status, message: 'secret-payload-do-not-log' }; } }, probe)); assert.deepEqual(events, []);
    });
    await t.test('invalid key 400 reason is distinct', async () => { await rejects('STT_INVALID_KEY', new GeminiSttProvider({ ...transport, async checkModel() { throw { status: 400, message: 'API_KEY_INVALID' }; } }, probe)); });
    await t.test('timeout cleans uploaded file and never retries paid call', async () => { events = []; await rejects('STT_TIMEOUT', new GeminiSttProvider({ ...transport, async transcribe() { events.push('transcribe'); throw new DOMException('timeout', 'TimeoutError'); } }, probe)); assert.deepEqual(events, ['model', 'upload', 'transcribe', 'cleanup']); });
    await t.test('invalid response cleans uploaded file', async () => { events = []; await rejects('STT_INVALID_RESPONSE', new GeminiSttProvider({ ...transport, async transcribe() { return response([]); } }, probe)); assert.equal(events.at(-1), 'cleanup'); });
    await t.test('failed extraction never uploads and preserves source', async () => { events = []; await rejects('STT_INVALID_FILE', new GeminiSttProvider(transport, probe, async () => { throw new Error('private-path'); }), { ...input, mimeType: 'video/mp4' }); await access(file); assert.deepEqual(events, ['model']); });
    await t.test('remote processing failure never generates transcript', async () => { events = []; await rejects('STT_INVALID_FILE', new GeminiSttProvider({ ...transport, async upload() { return { name: 'files/test-owned', state: 'FAILED' }; } }, probe)); assert.deepEqual(events, ['model', 'cleanup']); });
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('real synthetic MP4 audio extraction + FFprobe, Gemini still mocked', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gemini-ffmpeg-test-'));
  const source = join(directory, 'source.mp4'); let uploaded = '';
  const run = promisify(execFile);
  try {
    await run(process.env.FFMPEG_PATH || 'ffmpeg', ['-nostdin', '-y', '-f', 'lavfi', '-i', 'color=c=black:s=64x64:r=10', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=16000', '-t', '2', '-c:v', 'libx264', '-c:a', 'aac', source], { timeout: 30_000, windowsHide: true });
    const transport: GeminiTransport = {
      async checkModel() {},
      async upload(file, mime) { uploaded = file; assert.equal(mime, 'audio/wav'); await access(file); return { name: 'files/synthetic', uri: 'mock-synthetic', state: 'ACTIVE' }; },
      async getFile() { throw new Error('Unexpected'); }, async deleteFile() {}, async transcribe() { return response(); },
    };
    const result = await new GeminiSttProvider(transport).transcribe({ filePath: source, mimeType: 'video/mp4', language: 'vi' });
    assert.ok(result.duration && result.duration >= 2); assert.equal(result.segments.length, 2);
    await access(source); await assert.rejects(access(uploaded));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
