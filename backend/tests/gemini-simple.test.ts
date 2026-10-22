import test from 'node:test';
import assert from 'node:assert/strict';
import { GeminiGroupTranslationProvider, mapGroupResponse } from '../src/services/translation/gemini-group-translation.provider.js';
import { assertSimpleInput } from '../src/services/translation/gemini-simple-contract.js';
import { customerTranslationMethod } from '../src/config/customer-translation-method.js';
import { withCustomerTranslation, withCustomerMethod } from '../src/services/translation/customer-scope.js';
const input = (count = 1) => ({ fullText: 'Synthetic source', sourceLanguage: 'vi', targetLanguage: 'en', groups: Array.from({ length: count }, (_, i) => ({ groupId: `g${i}`, sourceText: 'Synthetic source' })) });

for (const scenario of ['one', 'many', 'invalid-json', 'missing', 'duplicate', 'order', 'wrong', 'empty', 'truncated', '400', '429', '503', 'timeout', 'overflow']) test(`simple SDK ${scenario}: no forced output config, no retry, strict result`, async t => {
  const old = { ...process.env };
  Object.assign(process.env, { GEMINI_API_KEY: 'synthetic-only', GEMINI_TRANSLATION_MODEL: 'gemini-3.8-flash', TRANSLATION_PROVIDER: 'gemini', CUSTOMER_TRANSLATION_ENABLED: 'true', CUSTOMER_TRANSLATION_METHOD: 'GEMINI_SIMPLE_V1', CUSTOMER_TRANSLATION_THINKING: 'DEFAULT', CUSTOMER_TRANSLATION_MODEL_SELECTION: 'PRIMARY' });
  delete process.env.CONTROLLED_PROVIDER_MODE;
  const source = input(scenario === 'one' ? 1 : 3); let posts = 0, gets = 0;
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    if (init?.method !== 'POST') { gets++; process.env.CUSTOMER_TRANSLATION_METHOD = 'GROUPS_V1'; return Response.json({ supportedGenerationMethods: ['generateContent'] }); }
    posts++; const body = JSON.parse(String(init.body));
    assert.deepEqual(body.generationConfig, { candidateCount: 1, maxOutputTokens: 8192 });
    assert.match(body.systemInstruction.parts[0].text, /Translate Vietnamese to English/);
    assert.deepEqual(JSON.parse(body.contents[0].parts[0].text), source);
    if (['400', '429', '503'].includes(scenario)) return Response.json({ error: { code: Number(scenario), status: 'INVALID_ARGUMENT', message: 'PRIVATE' } }, { status: Number(scenario) });
    if (scenario === 'timeout') throw new DOMException('PRIVATE', 'TimeoutError');
    if (scenario === 'overflow') return new Response('x'.repeat(131073));
    const groups = source.groups.map(g => ({ groupId: g.groupId, translatedText: 'Synthetic English' }));
    if (scenario === 'missing') groups.pop();
    if (scenario === 'duplicate') groups[1] = groups[0]!;
    if (scenario === 'order') groups.reverse();
    if (scenario === 'wrong') groups[0]!.groupId = 'wrong';
    if (scenario === 'empty') groups[0]!.translatedText = ' ';
    const text = scenario === 'invalid-json' ? '```json\n{}\n```' : JSON.stringify({ outcome: 'translated', groups });
    return Response.json({ candidates: [{ finishReason: scenario === 'truncated' ? 'MAX_TOKENS' : 'STOP', content: { parts: [{ text }] } }] });
  });
  try {
    const work = () => withCustomerTranslation(() => withCustomerMethod('GEMINI_SIMPLE_V1', () => new GeminiGroupTranslationProvider().translate(source)));
    if (['one', 'many'].includes(scenario)) assert.equal((await work()).length, source.groups.length);
    else await assert.rejects(work());
    assert.equal(gets, 1); assert.equal(posts, 1);
  } finally { process.env = old; }
});

test('simple input bounds reject oversize without truncation; original JSON parser stays strict', () => {
  assertSimpleInput(input(1)); assertSimpleInput(input(22));
  for (const source of [input(33), { ...input(), fullText: 'x'.repeat(12001) }, { ...input(), groups: [{ groupId: 'g', sourceText: 'x'.repeat(2001) }] }]) assert.throws(() => assertSimpleInput(source));
  assert.throws(() => mapGroupResponse('{}', input()));
});

test('method defaults GROUPS_V1, invalid selection fails; simple never silently enables MEDIUM', async () => {
  const old = { ...process.env };
  try {
    delete process.env.CUSTOMER_TRANSLATION_METHOD; assert.equal(customerTranslationMethod(), 'GROUPS_V1');
    process.env.CUSTOMER_TRANSLATION_METHOD = 'AUTO'; assert.throws(customerTranslationMethod);
    Object.assign(process.env, { CUSTOMER_TRANSLATION_ENABLED: 'true', CUSTOMER_TRANSLATION_THINKING: 'MEDIUM', GEMINI_API_KEY: 'synthetic-only' });
    await assert.rejects(withCustomerTranslation(() => withCustomerMethod('GEMINI_SIMPLE_V1', () => new GeminiGroupTranslationProvider().translate(input()))), (e: any) => e.code === 'TRANSLATION_NOT_CONFIGURED');
  } finally { process.env = old; }
});
