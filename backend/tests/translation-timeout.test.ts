import assert from 'node:assert/strict';
import test from 'node:test';
import { GeminiGroupTranslationProvider } from '../src/services/translation/gemini-group-translation.provider.js';
import { GeminiTranslationError, mapGeminiTranslationError } from '../src/services/translation/gemini-translation.provider.js';
import { withCustomerTranslation } from '../src/services/translation/customer-scope.js';

const input = { fullText: 'Synthetic', sourceLanguage: 'vi', targetLanguage: 'en', groups: [{ groupId: 'g1', sourceText: 'Synthetic' }] };
function configuration(t: test.TestContext) {
  const old = { ...process.env };
  Object.assign(process.env, { CUSTOMER_TRANSLATION_ENABLED: 'true', CUSTOMER_TRANSLATION_METHOD: 'GEMINI_SIMPLE_V1', CUSTOMER_TRANSLATION_THINKING: 'DEFAULT', CUSTOMER_TRANSLATION_MODEL_SELECTION: 'PRIMARY', GEMINI_TRANSLATION_MODEL: 'gemini-3.8-flash', GEMINI_API_KEY: 'synthetic-secret', TRANSLATION_PROVIDER: 'gemini' });
  delete process.env.CONTROLLED_PROVIDER_MODE;
  t.after(() => { for (const key of Object.keys(process.env)) if (!(key in old)) delete process.env[key]; Object.assign(process.env, old); });
}
test('504/408 are HTTP timeouts; a local abort does not invent an HTTP status', () => {
  for (const status of [408, 504]) { const error = mapGeminiTranslationError({ status }); assert.equal(error.code, 'TRANSLATION_TIMEOUT'); assert.equal(error.httpStatus, status); }
  const local = mapGeminiTranslationError(new DOMException('PRIVATE', 'TimeoutError'));
  assert.equal(local.code, 'TRANSLATION_TIMEOUT'); assert.equal(local.httpStatus, undefined);
});
for (const requestId of ['opaque-request-123', 'unsafe value PRIVATE', 'synthetic-secret']) test(`HTTP 504 diagnostics sanitize correlation header (${requestId === 'opaque-request-123' ? 'safe' : 'redacted'})`, async t => {
  configuration(t); let posts = 0;
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    if (init?.method !== 'POST') return Response.json({ supportedGenerationMethods: ['generateContent'] });
    posts++; return Response.json({ error: { code: 504, message: 'PRIVATE_KEY_PROMPT', status: 'DEADLINE_EXCEEDED' } }, { status: 504, headers: { 'x-request-id': requestId } });
  });
  await assert.rejects(withCustomerTranslation(() => new GeminiGroupTranslationProvider().translate(input)), error => {
    assert.ok(error instanceof GeminiTranslationError); assert.equal(error.code, 'TRANSLATION_TIMEOUT'); assert.equal(error.httpStatus, 504);
    assert.equal(error.transportDiagnostic?.origin, 'HTTP_RESPONSE'); assert.equal(error.transportDiagnostic?.operation, 'GENERATION');
    assert.equal(error.transportDiagnostic?.requestId, requestId === 'opaque-request-123' ? requestId : undefined);
    assert.doesNotMatch(JSON.stringify(error), /PRIVATE|synthetic-secret/); return true;
  });
  assert.equal(posts, 1);
});
test('expired overall deadline never dispatches, including after metadata/source checks', async t => {
  configuration(t); const controller = new AbortController(); let gets = 0, posts = 0;
  t.mock.method(AbortSignal, 'timeout', () => controller.signal);
  t.mock.method(globalThis, 'fetch', async (_url, init) => { if (init?.method === 'POST') posts++; else gets++; return Response.json({ supportedGenerationMethods: ['generateContent'] }); });
  let checks = 0;
  await assert.rejects(withCustomerTranslation(() => new GeminiGroupTranslationProvider().translate(input, async () => { if (++checks === 2) controller.abort(new DOMException('PRIVATE', 'TimeoutError')); })), (error: unknown) => error instanceof GeminiTranslationError && error.code === 'TRANSLATION_TIMEOUT' && error.transportDiagnostic?.origin === 'LOCAL_ABORT');
  assert.equal(gets, 1); assert.equal(posts, 0);
  await assert.rejects(withCustomerTranslation(() => new GeminiGroupTranslationProvider().translate(input)));
  assert.equal(gets, 1); assert.equal(posts, 0);
});
test('local timeout after POST is distinguished from HTTP response and is never retried', async t => {
  configuration(t); let posts = 0;
  t.mock.method(globalThis, 'fetch', async (_url, init) => { if (init?.method !== 'POST') return Response.json({ supportedGenerationMethods: ['generateContent'] }); posts++; throw new DOMException('PRIVATE', 'TimeoutError'); });
  await assert.rejects(withCustomerTranslation(() => new GeminiGroupTranslationProvider().translate(input)), error => {
    assert.ok(error instanceof GeminiTranslationError); assert.equal(error.code, 'TRANSLATION_TIMEOUT'); assert.equal(error.httpStatus, undefined); assert.equal(error.transportDiagnostic?.origin, 'LOCAL_ABORT'); return true;
  });
  assert.equal(posts, 1);
});
