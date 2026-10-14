import assert from 'node:assert/strict';
import test from 'node:test';
import { GeminiTranslationError, GeminiTranslationProvider, mapGeminiTranslation, translationInstructions, type GeminiTranslationTransport } from '../src/services/translation/gemini-translation.provider.js';
import { isTranslationMappingCurrent } from '../src/services/translation/translation-mapping.js';
import { getTranslationProvider } from '../src/services/translation/translation.service.js';
import { OpenAiTranslationProvider } from '../src/services/translation/openai-translation.provider.js';
const input = { sourceLanguage: 'vi', targetLanguage: 'en', segments: [
  { index: 0, sourceSegmentId: 'source-0', startTime: .12, endTime: 2.3, text: 'Trường Tiểu học Nguyễn Hữu Huân' },
  { index: 1, sourceSegmentId: 'source-1', startTime: 2.3, endTime: 6.7, text: '12 Long Châu, Vĩnh Long' },
] };
const output = () => ({ segments: [ { index: 0, sourceSegmentId: 'source-0', text: 'Nguyễn Hữu Huân Primary School' }, { index: 1, sourceSegmentId: 'source-1', text: '12 Long Châu, Vĩnh Long' } ] });
test('Gemini translation mocked SDK transport, never Google or Database', async t => {
  const oldKey = process.env.GEMINI_API_KEY, oldModel = process.env.GEMINI_TRANSLATION_MODEL, oldProvider = process.env.TRANSLATION_PROVIDER;
  process.env.GEMINI_API_KEY = 'not-a-real-key'; process.env.GEMINI_TRANSLATION_MODEL = 'gemini-3.8-flash';
  let calls = 0;
  const transport: GeminiTranslationTransport = { async checkModel() { return { supportedActions: ['generateContent'] }; }, async generate(_model, received) { calls++; assert.deepEqual(received, input); return JSON.stringify(output()); } };
  const rejects = async (client: GeminiTranslationTransport, code: string) => { const before = calls; await assert.rejects(new GeminiTranslationProvider(client).translate(input), (error: unknown) => error instanceof GeminiTranslationError && error.code === code && !error.message.includes('secret')); assert.ok(calls - before <= 1); };
  try {
    await t.test('success preserves proper names, addresses, original IDs/timestamps and single request', async () => { const before = JSON.stringify(input); const result = await new GeminiTranslationProvider(transport).translate(input); assert.equal(calls, 1); assert.equal(result.targetLanguage, 'en'); assert.equal(result.segments[0]?.text, 'Nguyễn Hữu Huân Primary School'); assert.equal(result.segments[1]?.text, '12 Long Châu, Vĩnh Long'); assert.equal(JSON.stringify(input), before); assert.match(translationInstructions, /full context/); });
    await t.test('missing key does not generate', async () => { delete process.env.GEMINI_API_KEY; await rejects(transport, 'TRANSLATION_NOT_CONFIGURED'); process.env.GEMINI_API_KEY = 'not-a-real-key'; });
    await t.test('STT model rejected without generation', async () => { process.env.GEMINI_TRANSLATION_MODEL = 'gemini-3.5-transcribe'; await rejects(transport, 'TRANSLATION_MODEL_UNAVAILABLE'); process.env.GEMINI_TRANSLATION_MODEL = 'gemini-3.8-flash'; });
    await t.test('word-level semantic ambiguity stops before metadata and generation', async () => {
      const words = ['Trường', 'Tiểu', 'học', 'Nguyễn', 'Hữu', 'Huân', 'tọa', 'lạc'];
      const guarded: GeminiTranslationTransport = { async checkModel() { assert.fail('No metadata for unsafe granularity'); }, async generate() { assert.fail('No paid generation'); } };
      await assert.rejects(new GeminiTranslationProvider(guarded).translate({ ...input, segments: words.map((text, index) => ({ index, text, sourceSegmentId: `source-${index}` })) }), /TRANSLATION_MAPPING_FAILED/);
    });
    await t.test('metadata lacking generateContent is rejected', async () => { await rejects({ ...transport, async checkModel() { return { supportedActions: ['embedContent'] }; } }, 'TRANSLATION_MODEL_UNAVAILABLE'); });
    for (const [status, code] of [[401, 'TRANSLATION_INVALID_KEY'], [403, 'TRANSLATION_MODEL_UNAVAILABLE'], [404, 'TRANSLATION_MODEL_UNAVAILABLE'], [429, 'TRANSLATION_QUOTA_EXCEEDED'], [500, 'TRANSLATION_PROVIDER_ERROR']] as const) await t.test(`sanitized ${status}, no paid retry`, async () => { await rejects({ ...transport, async generate() { calls++; throw { status, message: 'secret-key transcript data' }; } }, code); });
    await t.test('invalid key reason', async () => { await rejects({ ...transport, async checkModel() { throw { status: 400, message: 'API_KEY_INVALID secret-key' }; } }, 'TRANSLATION_INVALID_KEY'); });
    await t.test('timeout', async () => { await rejects({ ...transport, async generate() { calls++; throw new DOMException('secret', 'TimeoutError'); } }, 'TRANSLATION_TIMEOUT'); });
    await t.test('network error', async () => { await rejects({ ...transport, async generate() { calls++; throw new TypeError('secret'); } }, 'TRANSLATION_NETWORK_ERROR'); });
    await t.test('empty or malformed response', async () => { for (const value of [undefined, '', 'not json', '{"segments":[{"text":"hello"}]}']) await rejects({ ...transport, async generate() { return value; } }, 'TRANSLATION_INVALID_RESPONSE'); });
    await t.test('missing/duplicate/reordered/wrong source IDs rejected', () => { const valid = output(); for (const segments of [[], valid.segments.slice(1), [valid.segments[0], valid.segments[0]], [...valid.segments].reverse(), [{ ...valid.segments[0], sourceSegmentId: 'other' }, valid.segments[1]]]) assert.throws(() => mapGeminiTranslation(JSON.stringify({ segments }), input), /TRANSLATION_MAPPING_FAILED/); });
    await t.test('extra data, fabricated timestamps or empty translation rejected', () => { for (const value of [{ ...output(), explanation: 'no' }, { segments: [{ ...output().segments[0], startTime: 0 }, output().segments[1]] }, { segments: [{ ...output().segments[0], text: ' ' }, output().segments[1]] }]) assert.throws(() => mapGeminiTranslation(JSON.stringify(value), input), /TRANSLATION_INVALID_RESPONSE/); });
    await t.test('provider default Gemini and explicit OpenAI preserved', () => { delete process.env.TRANSLATION_PROVIDER; assert.ok(getTranslationProvider() instanceof GeminiTranslationProvider); process.env.TRANSLATION_PROVIDER = 'openai'; assert.ok(getTranslationProvider() instanceof OpenAiTranslationProvider); });
  } finally { for (const [name, value] of [['GEMINI_API_KEY', oldKey], ['GEMINI_TRANSLATION_MODEL', oldModel], ['TRANSLATION_PROVIDER', oldProvider]]) { if (value === undefined) delete process.env[name!]; else process.env[name!] = value; } }
});
test('persisted translation version requires exact current source IDs, nonempty text and one-to-one mapping', () => {
  const sources = [{ _id: 'a' }, { _id: 'b' }]; const translated = [{ transcriptSegmentId: 'a', translatedText: 'A' }, { transcriptSegmentId: 'b', translatedText: 'B' }];
  assert.ok(isTranslationMappingCurrent(sources, translated));
  assert.ok(!isTranslationMappingCurrent([{ _id: 'new-a' }, { _id: 'new-b' }], translated));
  assert.ok(!isTranslationMappingCurrent(sources, translated.slice(1)));
  assert.ok(!isTranslationMappingCurrent(sources, [translated[0]!, translated[0]!]));
  assert.ok(!isTranslationMappingCurrent(sources, [{ ...translated[0]!, translatedText: ' ' }, translated[1]!]));
});
