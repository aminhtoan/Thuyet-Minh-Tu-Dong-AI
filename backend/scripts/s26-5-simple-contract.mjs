// Run with: node --import tsx scripts/s26-5-simple-contract.mjs
// Default is entirely mock-only. --execute-once requires separate user approval.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { assertSimpleInput, simpleTranslationInstructions } from '../src/services/translation/gemini-simple-contract.ts';
import { mapGroupResponse } from '../src/services/translation/gemini-group-translation.provider.ts';
import { candidateGroups, validatePlan } from '../src/services/translation/group-plan.ts';
import { boundedTranslationFetch } from '../src/services/translation/bounded-fetch.ts';
import { gemini400Diagnostic } from '../src/services/translation/provider-failure.ts';

const model = 'gemini-3.8-flash';
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
let dispatches = 0, mockDispatches = 0, httpStatus = null;

async function main() {
  const args = process.argv.slice(2);
  if (args.length && !(args.length === 1 && args[0] === '--execute-once')) throw new Error('INVALID_ARGUMENTS');
  const execute = args.length === 1;
  const pkg = JSON.parse(await readFile(new URL('../node_modules/@google/genai/package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.version, '2.28.0');
  const source = { transcriptId: '222222222222222222222222', transcriptRevision: 1, languageCode: 'vi', fullText: 'Xin chào, tôi là sinh viên.', segments: [{ id: '111111111111111111111111', sequence: 1, text: 'Xin chào, tôi là sinh viên.', startTime: 0, endTime: 2 }] };
  const groups = candidateGroups(source);
  validatePlan(source, groups.map(group => group.sourceSegmentIds));
  assert.equal(groups.length, 1);
  // Exact GroupProviderInput projection used by the Customer service.
  const input = { fullText: source.fullText, sourceLanguage: source.languageCode, targetLanguage: 'en', groups: groups.map(group => ({ groupId: group.groupId, sourceText: group.sourceText })) };
  assertSimpleInput(input);
  const expected = [{ groupId: groups[0].groupId, translatedText: 'Hello, I am a student.' }];
  // Local parser tests never call a provider and never repair malformed output.
  assert.deepEqual(mapGroupResponse(JSON.stringify({ outcome: 'translated', groups: expected }), input), expected);
  for (const text of ['not JSON', '```json\n{}\n```', JSON.stringify({ outcome: 'translated', groups: [] }), JSON.stringify({ outcome: 'translated', groups: [{ ...expected[0], groupId: 'wrong' }] }), JSON.stringify({ outcome: 'translated', groups: [...expected, ...expected] }), JSON.stringify({ outcome: 'translated', groups: [{ ...expected[0], translatedText: '' }] })]) assert.throws(() => mapGroupResponse(text, input));
  let key = 'synthetic-only-not-real';
  if (execute) {
    const env = dotenv.parse(await readFile(new URL('../.env', import.meta.url), 'utf8'));
    key = (process.env.GEMINI_API_KEY ?? env.GEMINI_API_KEY)?.trim();
    if (!key) throw new Error('API_KEY_MISSING');
  }
  const config = { systemInstruction: simpleTranslationInstructions, candidateCount: 1, maxOutputTokens: 8192 };
  const nativeFetch = globalThis.fetch;
  const rawFetch = async (url, init) => {
    const address = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
    assert.equal(address, endpoint); assert.equal(init?.method, 'POST');
    assert.equal(dispatches + mockDispatches, 0);
    const body = JSON.parse(String(init.body));
    assert.deepEqual(body.generationConfig, { candidateCount: 1, maxOutputTokens: 8192 });
    assert.deepEqual(body.contents, [{ role: 'user', parts: [{ text: JSON.stringify(input) }] }]);
    assert.deepEqual(body.systemInstruction.parts, [{ text: simpleTranslationInstructions }]);
    if (!execute) {
      mockDispatches++;
      return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ outcome: 'translated', groups: expected }) }] } }] });
    }
    dispatches++; // Count before network; ambiguous result never permits replay.
    const response = await nativeFetch(url, { ...init, redirect: 'error' });
    httpStatus = response.status;
    return response;
  };
  const ai = new GoogleGenAI({ apiKey: key, httpOptions: { apiVersion: 'v1beta', timeout: 120000, retryOptions: { attempts: 1 }, fetch: boundedTranslationFetch(rawFetch) } });
  const result = await ai.models.generateContent({ model, contents: JSON.stringify(input), config: { ...config, abortSignal: AbortSignal.timeout(120000) } });
  if (result.candidates?.[0]?.finishReason !== 'STOP') throw new Error('INVALID_FINISH_REASON');
  const translated = mapGroupResponse(result.text, input);
  assert.deepEqual(groups[0].sourceSegmentIds, [source.segments[0].id]);
  console.log(JSON.stringify({ mode: execute ? 'REAL' : 'DRY_RUN', status: 'PASS', model, sdk: pkg.version, apiVersion: 'v1beta', syntheticSegments: 1, groups: translated.length, jsonValid: true, coverage: '1/1', payloadVerified: true, validatorNegativeCases: 6, schemaMimeThinkingAbsent: true, maxOutputTokens: 8192, timeoutMs: 120000, retries: 0, metadataRequests: 0, httpStatus, realRequests: dispatches, mockRequests: mockDispatches, ...(execute ? { translation: translated[0].translatedText } : {}) }));
}

try { await main(); }
catch (error) {
  let code = dispatches ? 'DISPATCH_OR_RESPONSE_UNCERTAIN' : 'PRE_DISPATCH_CHECK_FAILED';
  const safeCodes = ['INVALID_ARGUMENTS', 'API_KEY_MISSING', 'INVALID_FINISH_REASON', 'TRANSLATION_INVALID_RESPONSE', 'TRANSLATION_MAPPING_FAILED'];
  if (safeCodes.includes(error?.code)) code = error.code;
  if (safeCodes.includes(error?.message)) code = error.message;
  try {
    if (typeof error?.message === 'string' && Buffer.byteLength(error.message) <= 131072) {
      const status = JSON.parse(error.message)?.error?.status;
      if (['INVALID_ARGUMENT', 'FAILED_PRECONDITION', 'UNAUTHENTICATED', 'PERMISSION_DENIED', 'NOT_FOUND', 'RESOURCE_EXHAUSTED', 'INTERNAL', 'UNAVAILABLE', 'DEADLINE_EXCEEDED'].includes(status)) code = status;
    }
  } catch { /* Never print raw Error/message/stack/body/prompt/credentials. */ }
  console.log(JSON.stringify({ status: 'FAILED', httpStatus, code, diagnostic: gemini400Diagnostic(error, httpStatus ?? undefined), realRequests: dispatches, mockRequests: mockDispatches }));
  process.exitCode = 1;
}
