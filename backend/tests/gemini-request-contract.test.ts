import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { GeminiGroupTranslationProvider, mapGroupResponse, responseSchema } from '../src/services/translation/gemini-group-translation.provider.js';
import { withCustomerTranslation } from '../src/services/translation/customer-scope.js';
import { gemini400Diagnostic, PROVIDER_ERROR_PARAMETERS, PROVIDER_ERROR_REASONS } from '../src/services/translation/provider-failure.js';
import { TranslationAttempt } from '../src/models/TranslationAttempt.js';

const input = { fullText: 'Synthetic only', sourceLanguage: 'vi', targetLanguage: 'en', groups: [{ groupId: 'g', sourceText: 'Synthetic only' }] };
const output = { outcome: 'translated', groups: [{ groupId: 'g', translatedText: 'Synthetic English' }] };

for (const thinking of ['DEFAULT', 'MEDIUM']) test(`installed SDK serializes supported JSON request with ${thinking}; no fallback/retry`, async t => {
  const saved = { ...process.env };
  Object.assign(process.env, { GEMINI_API_KEY: 'synthetic-only', GEMINI_TRANSLATION_MODEL: 'gemini-3.8-flash', TRANSLATION_PROVIDER: 'gemini', CUSTOMER_TRANSLATION_ENABLED: 'true', CUSTOMER_TRANSLATION_THINKING: thinking });
  delete process.env.CONTROLLED_PROVIDER_MODE;
  const calls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    const endpoint = new URL(String(url)); calls.push(init?.method ?? 'GET');
    assert.equal(endpoint.origin, 'https://generativelanguage.googleapis.com'); assert.equal(endpoint.search, '');
    if (init?.method !== 'POST') {
      assert.equal(endpoint.pathname, '/v1beta/models/gemini-3.8-flash');
      return Response.json({ supportedGenerationMethods: ['generateContent'] });
    }
    assert.equal(endpoint.pathname, '/v1beta/models/gemini-3.8-flash:generateContent');
    const body = JSON.parse(String(init.body));
    assert.deepEqual(Object.keys(body).sort(), ['contents', 'generationConfig', 'systemInstruction']);
    assert.deepEqual(body.generationConfig, {
      candidateCount: 1, maxOutputTokens: 8192, responseMimeType: 'application/json', responseJsonSchema: z.toJSONSchema(responseSchema),
      ...(thinking === 'MEDIUM' ? { thinkingConfig: { thinkingLevel: 'MEDIUM' } } : {}),
    });
    assert.deepEqual(JSON.parse(body.contents[0].parts[0].text), input);
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(output) }] } }] });
  });
  try {
    assert.deepEqual(await withCustomerTranslation(() => new GeminiGroupTranslationProvider().translate(input)), output.groups);
    assert.deepEqual(calls, ['GET', 'POST']);
  } finally { process.env = saved; }
});

const error = (body: unknown) => ({ message: JSON.stringify({ error: body }) });
const badRequest = (fields: string[]) => ({ '@type': 'type.googleapis.com/google.rpc.BadRequest', fieldViolations: fields.map(field => ({ field, description: 'PRIVATE_PROMPT_KEY' })) });
test('400 diagnostics retain only allowlisted enums and parameter roots, never descriptions/paths/metadata', () => {
  const result = gemini400Diagnostic(error({ code: 400, status: 'INVALID_ARGUMENT', message: 'PRIVATE_BODY', details: [
    badRequest(['generation_config.response_json_schema.properties.PRIVATE_NAME', 'generationConfig.thinkingConfig.thinkingLevel', 'contents[0].PRIVATE_TEXT', 'unknown.PRIVATE_FIELD']),
    { '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'BILLING_DISABLED', metadata: { secret: 'PRIVATE_KEY' } },
    { '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'PRIVATE_REASON' },
  ] }), 400);
  assert.deepEqual(result, { status: 'INVALID_ARGUMENT', reasons: ['BILLING_DISABLED'], parameters: ['generationConfig.responseJsonSchema', 'generationConfig.thinkingConfig.thinkingLevel', 'contents'] });
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE/);
});

test('unstructured, malformed, oversized and non-400 errors never retain raw provider data', () => {
  for (const value of [{ message: 'PRIVATE' }, { message: '{' }, { message: 'x'.repeat(16385) }, error({ code: 403, status: 'INVALID_ARGUMENT' }), error({ status: 'PRIVATE_STATUS', details: [badRequest(['PRIVATE_PATH'])] })]) {
    assert.deepEqual(gemini400Diagnostic(value, 400), { status: 'UNSPECIFIED', reasons: [], parameters: [] });
  }
  assert.equal(gemini400Diagnostic(error({ code: 500 }), 500), undefined);
  assert.equal(gemini400Diagnostic(undefined), undefined);
});

test('diagnostics are bounded; persistence rejects arbitrary codes and paths without database access', async () => {
  const result = gemini400Diagnostic(error({ code: 400, details: [badRequest([...PROVIDER_ERROR_PARAMETERS]), ...PROVIDER_ERROR_REASONS.map(reason => ({ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason }))] }), 400)!;
  assert.equal(result.parameters.length, 8); assert.equal(result.reasons.length, 4);
  const base = { _id: 'synthetic', ownerId: 'owner', projectId: 'project', targetLanguage: 'en', sourceRevision: 'revision', binding: 'binding', state: 'UNCERTAIN' };
  await new TranslationAttempt({ ...base, providerDiagnostic: result }).validate();
  for (const providerDiagnostic of [{ status: 'PRIVATE' }, { reasons: ['PRIVATE'] }, { parameters: ['PRIVATE'] }, { parameters: Array(9).fill('model') }]) {
    await assert.rejects(new TranslationAttempt({ ...base, providerDiagnostic }).validate());
  }
});

test('request schema does not weaken local output or ordered group validation', () => {
  for (const invalid of [{ ...output, secret: 'extra' }, { ...output, groups: [] }, { ...output, groups: [{ groupId: 'wrong', translatedText: 'Synthetic' }] }, { ...output, groups: [{ groupId: 'g', translatedText: ' ' }] }, { ...output, groups: [{ groupId: 'g', translatedText: 'x'.repeat(32001) }] }]) {
    assert.throws(() => mapGroupResponse(JSON.stringify(invalid), input));
  }
});
