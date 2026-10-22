import test from 'node:test';
import assert from 'node:assert/strict';
import { customerTranslationModel } from '../src/config/translation-model.js';
import { GeminiGroupTranslationProvider } from '../src/services/translation/gemini-group-translation.provider.js';
import { withCustomerTranslation, withCustomerModel } from '../src/services/translation/customer-scope.js';
import { providerFailureMessage } from '../src/services/translation/provider-failure.js';
import { CustomerAttemptStore } from '../src/services/translation/customer-attempt.js';

test('primary remains default; fallback requires explicit operator selection, invalid config fails closed', () => {
  assert.deepEqual(customerTranslationModel({}), { primary: 'gemini-3.8-flash', fallback: 'gemini-3.6-flash', selection: 'PRIMARY', model: 'gemini-3.8-flash' });
  assert.equal(customerTranslationModel({ CUSTOMER_TRANSLATION_MODEL_SELECTION: 'FALLBACK' }).model, 'gemini-3.6-flash');
  assert.equal(customerTranslationModel({ GEMINI_TRANSLATION_FALLBACK_MODEL: 'gemini-3.8-flash', CUSTOMER_TRANSLATION_MODEL_SELECTION: 'FALLBACK' }).model, 'gemini-3.8-flash');
  for (const env of [{ CUSTOMER_TRANSLATION_MODEL_SELECTION: 'AUTO' }, { CUSTOMER_TRANSLATION_MODEL_SELECTION: '' }, { GEMINI_TRANSLATION_FALLBACK_MODEL: 'https://private.invalid/key' }, { GEMINI_TRANSLATION_MODEL: 'gemini-live' }, { CUSTOMER_TRANSLATION_MODEL_SELECTION: 'FALLBACK', GEMINI_TRANSLATION_FALLBACK_MODEL: '' }]) {
    assert.throws(() => customerTranslationModel(env), (e: any) => e.code === 'TRANSLATION_NOT_CONFIGURED');
  }
});

for (const selection of ['PRIMARY', 'FALLBACK']) for (const status of [400, 503]) test(`${selection} HTTP ${status}: exact bound model, no fallback/retry even after config drift`, async t => {
  const saved = { ...process.env };
  Object.assign(process.env, { GEMINI_API_KEY: 'synthetic-only', GEMINI_TRANSLATION_MODEL: 'gemini-3.8-flash', GEMINI_TRANSLATION_FALLBACK_MODEL: 'gemini-3.6-flash', CUSTOMER_TRANSLATION_MODEL_SELECTION: selection, CUSTOMER_TRANSLATION_ENABLED: 'true', CUSTOMER_TRANSLATION_THINKING: 'DEFAULT', TRANSLATION_PROVIDER: 'gemini' });
  delete process.env.CONTROLLED_PROVIDER_MODE;
  const model = customerTranslationModel().model, calls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    const endpoint = new URL(String(url)); calls.push(endpoint.pathname);
    assert.equal(endpoint.pathname, `/v1beta/models/${model}${init?.method === 'POST' ? ':generateContent' : ''}`);
    if (init?.method !== 'POST') {
      process.env.CUSTOMER_TRANSLATION_MODEL_SELECTION = selection === 'PRIMARY' ? 'FALLBACK' : 'PRIMARY';
      return Response.json({ supportedGenerationMethods: ['generateContent'] });
    }
    return Response.json({ error: { code: status, status: status === 400 ? 'INVALID_ARGUMENT' : 'UNAVAILABLE', message: 'PRIVATE' } }, { status });
  });
  try {
    await assert.rejects(withCustomerTranslation(() => withCustomerModel(model, () => new GeminiGroupTranslationProvider().translate({ fullText: 'Synthetic', sourceLanguage: 'vi', targetLanguage: 'en', groups: [{ groupId: 'g', sourceText: 'Synthetic' }] }))), (e: any) => e.httpStatus === status && e.code === 'TRANSLATION_PROVIDER_ERROR');
    assert.equal(calls.length, 2);
  } finally { process.env = saved; }
});

test('safe provider guidance distinguishes request/conditions400 and temporary503 without granting retry', () => {
  assert.match(providerFailureMessage(400)!, /HTTP 400.*API.*billing/);
  assert.match(providerFailureMessage(400, { status: 'FAILED_PRECONDITION', reasons: [], parameters: [] })!, /khu vực.*billing/);
  assert.match(providerFailureMessage(503)!, /HTTP 503.*Không tự gửi lại hoặc chuyển model/);
  assert.equal(providerFailureMessage(500), undefined);
});

test('GET status exposes only safe numeric400/503 evidence and cannot authorize re-execution', async () => {
  const scope = { ownerId: 'owner', projectId: 'project', sourceRevision: 'source', targetLanguage: 'en' };
  for (const http of [400, 503, 500]) {
    const row = { ...scope, state: 'UNCERTAIN', executionVersion: 1, phase: 'GENERATION_DISPATCHING', providerHttpStatus: http, providerDiagnostic: { secret: 'PRIVATE' } };
    const store = new CustomerAttemptStore({ read: async () => row } as any);
    const result = await store.inspect(scope);
    assert.equal(result?.providerHttpStatus, http === 500 ? null : http); assert.equal(result?.canGenerate, false);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE|providerDiagnostic/);
    await assert.rejects(store.execute(scope, 'new-model-binding', async () => assert.fail('NO_REPLAY')));
  }
});
