// S26.2: identical to S26.1 except no structured-output parameters sent.
// Independent synthetic diagnostic; no app imports, database, attempt or quota.
// Default is prepare-only. --execute-once requires separate user confirmation.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import { z } from 'zod';

const model = 'gemini-3.8-flash';
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const sentence = 'Xin chào, tôi là sinh viên.';
const args = process.argv.slice(2);
let dispatchCount = 0, httpStatus = null;
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value;
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');

async function main() {
  if (args.length && !(args.length === 1 && args[0] === '--execute-once')) throw new Error('INVALID_ARGUMENTS');
  const pkg = JSON.parse(await readFile(new URL('../node_modules/@google/genai/package.json', import.meta.url), 'utf8'));
  if (pkg.version !== '2.28.0') throw new Error('SDK_VERSION_MISMATCH');
  // Read the exact current provider declarations, not a simplified test schema.
  // Do not import the provider/application dependency graph or initialize MongoDB.
  const code = await readFile(new URL('../src/services/translation/gemini-group-translation.provider.ts', import.meta.url), 'utf8');
  const expression = code.match(/^export const responseSchema = (.+);\r?$/m)?.[1];
  const instruction = code.match(/^export const groupTranslationInstructions = '([^']+)';\r?$/m)?.[1];
  const planCode = await readFile(new URL('../src/services/translation/group-plan.ts', import.meta.url), 'utf8');
  const groupingVersion = planCode.match(/^export const GROUPING_VERSION = '([^']+)';\r?$/m)?.[1];
  if (!expression || !instruction || !groupingVersion) throw new Error('SOURCE_CONTRACT_UNAVAILABLE');
  // Evaluate only the trusted repository's schema declaration with its Zod object.
  const schema = Function('z', 'return (' + expression + ')')(z);
  const jsonSchema = z.toJSONSchema(schema);
  const segment = { id: '111111111111111111111111', sequence: 1, text: sentence, startTime: 0, endTime: 2 };
  const source = { transcriptId: '222222222222222222222222', transcriptRevision: 1, languageCode: 'vi', fullText: sentence, segments: [segment] };
  const group = { groupId: digest([digest(source), groupingVersion, [segment.id]]), sequence: 1, sourceSegmentIds: [segment.id], sourceText: sentence, translatedText: '', startTime: segment.startTime, endTime: segment.endTime };
  // Same GroupProviderInput projection used by the real service. Timestamps/IDs
  // remain local fixture metadata, not extra fields sent to generateContent.
  const input = { fullText: source.fullText, sourceLanguage: 'vi', targetLanguage: 'en', groups: [{ groupId: group.groupId, sourceText: group.sourceText }] };
  const generationConfig = { candidateCount: 1, maxOutputTokens: 8192 };
  if (!args.length) {
    console.log(JSON.stringify({ mode: 'PREPARED_NOT_SENT', model, sdk: pkg.version, apiVersion: 'v1beta', syntheticSegments: 1, groups: 1, schemaFromCurrentProvider: true, instructionFromCurrentProvider: true, structuredOutputSent: false, localSchemaValidation: true, schemaDigest: digest(jsonSchema), instructionDigest: digest(instruction), thinkingConfig: false, maxOutputTokens: 8192, timeoutMs: 120000, maximumGenerationRequests: 1, generationRequests: 0, metadataRequests: 0, retries: 0 }));
    return;
  }
  const env = dotenv.parse(await readFile(new URL('../.env', import.meta.url), 'utf8'));
  const key = (process.env.GEMINI_API_KEY ?? env.GEMINI_API_KEY)?.trim();
  if (!key) throw new Error('API_KEY_MISSING');
  const { GoogleGenAI } = await import('@google/genai');
  const nativeFetch = globalThis.fetch;
  const once = async (url, init) => {
    const address = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
    assert.equal(address, endpoint); assert.equal(init?.method, 'POST'); assert.equal(dispatchCount, 0);
    const body = JSON.parse(String(init.body));
    assert.deepEqual(body.generationConfig, generationConfig);
    assert.deepEqual(body.contents, [{ role: 'user', parts: [{ text: JSON.stringify(input) }] }]);
    assert.deepEqual(body.systemInstruction.parts, [{ text: instruction }]);
    dispatchCount++; // Count BEFORE dispatch: never retry an ambiguous failure.
    const response = await nativeFetch(url, { ...init, redirect: 'error' });
    httpStatus = response.status;
    const reader = response.body?.getReader();
    if (!reader) return response;
    const chunks = []; let bytes = 0;
    try {
      while (true) {
        const next = await reader.read(); if (next.done) break;
        bytes += next.value.byteLength;
        if (bytes > 131072) { await reader.cancel(); throw new Error('RESPONSE_TOO_LARGE'); }
        chunks.push(next.value);
      }
    } finally { reader.releaseLock(); }
    return new Response(Buffer.concat(chunks), { status: response.status, statusText: response.statusText, headers: response.headers });
  };
  const ai = new GoogleGenAI({ apiKey: key, httpOptions: { apiVersion: 'v1beta', timeout: 120000, retryOptions: { attempts: 1 }, fetch: once } });
  const result = await ai.models.generateContent({ model, contents: JSON.stringify(input), config: { systemInstruction: instruction, ...generationConfig, abortSignal: AbortSignal.timeout(120000) } });
  const parsed = schema.safeParse(JSON.parse(result.text ?? ''));
  if (result.candidates?.[0]?.finishReason !== 'STOP' || !parsed.success || parsed.data.outcome !== 'translated' || parsed.data.groups.length !== 1 || parsed.data.groups[0].groupId !== group.groupId) throw new Error('INVALID_TRANSLATION_RESPONSE');
  console.log(JSON.stringify({ httpStatus, requestCount: dispatchCount, status: 'SUCCESS', jsonValid: true, groupCoverage: '1/1', translation: parsed.data.groups[0].translatedText }));
}

try { await main(); }
catch (error) {
  let code = dispatchCount ? 'DISPATCH_OR_RESPONSE_UNCERTAIN' : 'PRE_DISPATCH_CHECK_FAILED';
  const parameters = new Set();
  const local = ['INVALID_ARGUMENTS', 'SDK_VERSION_MISMATCH', 'SOURCE_CONTRACT_UNAVAILABLE', 'API_KEY_MISSING', 'RESPONSE_TOO_LARGE', 'INVALID_TRANSLATION_RESPONSE'];
  if (local.includes(error?.message)) code = error.message;
  try {
    if (typeof error?.message === 'string' && Buffer.byteLength(error.message) <= 131072) {
      const body = JSON.parse(error.message)?.error;
      if (['INVALID_ARGUMENT', 'FAILED_PRECONDITION', 'UNAUTHENTICATED', 'PERMISSION_DENIED', 'NOT_FOUND', 'RESOURCE_EXHAUSTED', 'INTERNAL', 'UNAVAILABLE', 'DEADLINE_EXCEEDED'].includes(body?.status)) code = body.status;
      for (const detail of (Array.isArray(body?.details) ? body.details.slice(0, 8) : [])) {
        if (detail?.['@type'] !== 'type.googleapis.com/google.rpc.BadRequest') continue;
        for (const violation of (Array.isArray(detail.fieldViolations) ? detail.fieldViolations.slice(0, 16) : [])) {
          if (typeof violation?.field !== 'string' || violation.field.length > 512) continue;
          const field = violation.field.replaceAll('_', '').toLowerCase();
          for (const root of ['generationConfig.responseJsonSchema', 'generationConfig.responseMimeType', 'generationConfig.maxOutputTokens', 'generationConfig.candidateCount', 'systemInstruction', 'contents', 'model']) {
            const normalized = root.toLowerCase();
            if (field === normalized || field.startsWith(normalized + '.') || field.startsWith(normalized + '[')) { parameters.add(root); break; }
          }
        }
      }
    }
  } catch { /* Never print raw error, message, stack, headers, body or prompt. */ }
  console.log(JSON.stringify({ httpStatus, requestCount: dispatchCount, status: 'FAILED', code, parameterRoots: [...parameters], jsonValid: false }));
  process.exitCode = 1;
}
