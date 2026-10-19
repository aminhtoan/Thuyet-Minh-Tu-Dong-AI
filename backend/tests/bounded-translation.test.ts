import assert from 'node:assert/strict';
import test from 'node:test';
import { GoogleGenAI } from '@google/genai';
import { boundedTextProjection, collectBoundedSource, SOURCE_BYTE_LIMIT } from '../src/services/translation/bounded-source.js';
import { boundedTranslationFetch, PROVIDER_RESPONSE_BYTE_LIMIT } from '../src/services/translation/bounded-fetch.js';
import { revision, type SourceSegment } from '../src/services/translation/group-plan.js';
import { GroupDraftStore } from '../src/services/translation/group-draft-store.js';

const segment = (i: number): SourceSegment => ({ id: (i + 1).toString(16).padStart(24, '0'), sequence: i + 1, text: 'từ', startTime: i, endTime: i + 1 });
const header = { transcriptId: 'a'.repeat(24), transcriptRevision: 1, languageCode: 'vi', fullText: 'synthetic' };
async function* rows(count: number) { for (let i = 0; i < count; i++) yield segment(i); }

test('bounded source retains exact snapshot/digest; no truncation on overflow', async () => {
  const source = await collectBoundedSource(header, rows(100));
  assert.equal(revision(source), revision({ ...header, segments: Array.from({ length: 100 }, (_, i) => segment(i)) }));
  for (const count of [1027, 2000, 5000, 10001]) {
    const expected = { ...header, segments: Array.from({ length: count }, (_, i) => segment(i)) };
    if (Buffer.byteLength(JSON.stringify(expected)) > SOURCE_BYTE_LIMIT) await assert.rejects(collectBoundedSource(header, rows(count)), (e: any) => e.statusCode === 413);
    else assert.deepEqual(await collectBoundedSource(header, rows(count)), expected);
  }
  let loaded = 0;
  async function* counted() { for (let i = 0; i < 5000; i++) { loaded++; yield segment(i); } }
  await assert.rejects(collectBoundedSource(header, counted()));
  assert.ok(loaded < 2000, 'stops cursor at byte bound, not after full materialization');
});

test('source byte boundary is exact, including JSON escapes, Unicode and commas', async () => {
  const emptySize = Buffer.byteLength(JSON.stringify({ ...header, segments: [segment(0)] }));
  const padding = SOURCE_BYTE_LIMIT - emptySize;
  const exactHeader = { ...header, fullText: header.fullText + 'x'.repeat(padding) };
  assert.equal(Buffer.byteLength(JSON.stringify(await collectBoundedSource(exactHeader, rows(1)))), SOURCE_BYTE_LIMIT);
  await assert.rejects(collectBoundedSource({ ...exactHeader, fullText: exactHeader.fullText + 'x' }, rows(1)), (e: any) => e.statusCode === 413);
  let touched = false;
  async function* untouched() { touched = true; yield segment(0); }
  await assert.rejects(collectBoundedSource({ ...header, fullText: '"\n漢'.repeat(SOURCE_BYTE_LIMIT) }, untouched()));
  assert.equal(touched, false);
  assert.ok(JSON.stringify(boundedTextProjection('text')).includes('$strLenBytes'));
});

test('source iterator is closed on overflow, malformed times remain rejected', async () => {
  let closed = false;
  async function* tooLarge() { try { yield { ...segment(0), text: 'x'.repeat(SOURCE_BYTE_LIMIT) }; yield segment(1); } finally { closed = true; } }
  await assert.rejects(collectBoundedSource(header, tooLarge())); assert.ok(closed);
  async function* reversed() { yield { ...segment(0), endTime: 0 }; }
  await assert.rejects(collectBoundedSource(header, reversed()));
});

test('bounded fetch enforces actual streamed bytes without trusting Content-Length', async () => {
  let cancelled = false; let reads = 0;
  const fetcher: typeof fetch = async () => new Response(new ReadableStream({
    pull(controller) { reads++; controller.enqueue(new Uint8Array(32768)); }, cancel() { cancelled = true; },
  }), { headers: { 'content-length': '1' } });
  const response = await boundedTranslationFetch(fetcher)('http://fixture.invalid');
  await assert.rejects(response.text(), /TRANSLATION_INVALID_RESPONSE/);
  assert.ok(cancelled); assert.ok(reads <= 6);
  const exact = boundedTranslationFetch(async () => new Response('x'.repeat(PROVIDER_RESPONSE_BYTE_LIMIT)));
  assert.equal((await (await exact('http://fixture.invalid')).text()).length, PROVIDER_RESPONSE_BYTE_LIMIT);
  const overflow = boundedTranslationFetch(async () => new Response('x'.repeat(PROVIDER_RESPONSE_BYTE_LIMIT + 1)));
  await assert.rejects((await overflow('http://fixture.invalid')).text(), /TRANSLATION_INVALID_RESPONSE/);
  let clientCancelled = false;
  const cancellable = boundedTranslationFetch(async () => new Response(new ReadableStream({ cancel() { clientCancelled = true; } })));
  await (await cancellable('http://fixture.invalid')).body!.cancel();
  assert.ok(clientCancelled);
});

test('actual installed SDK uses custom bounded fetch before json parsing (mock HTTP only)', async () => {
  let calls = 0; let oversized = false;
  const fetcher: typeof fetch = async () => {
    calls++;
    return new Response(oversized ? 'x'.repeat(PROVIDER_RESPONSE_BYTE_LIMIT + 1) : JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text: 'synthetic' }] } }] }), { headers: { 'content-type': 'application/json' } });
  };
  const sdk = new GoogleGenAI({ apiKey: 'mock-only', httpOptions: { retryOptions: { attempts: 1 }, timeout: 120000, fetch: boundedTranslationFetch(fetcher) } });
  assert.equal((await sdk.models.generateContent({ model: 'gemini-3.8-flash', contents: 'synthetic' })).text, 'synthetic');
  oversized = true;
  await assert.rejects(sdk.models.generateContent({ model: 'gemini-3.8-flash', contents: 'synthetic' }), /TRANSLATION_INVALID_RESPONSE/);
  assert.equal(calls, 2, 'no retry on overflow');
  const store = new GroupDraftStore();
  const create = async () => { await sdk.models.generateContent({ model: 'gemini-3.8-flash', contents: 'synthetic' }); throw new Error('unexpected success'); };
  await assert.rejects(store.preview('overflow', 'signature', create), /TRANSLATION_INVALID_RESPONSE/);
  await assert.rejects(store.preview('overflow', 'signature', create), /TRANSLATION_INVALID_RESPONSE/);
  assert.equal(calls, 3, 'overflow has one receipt and no second generation');
  assert.throws(() => store.get('no-draft', 'owner', 'project'));
});
