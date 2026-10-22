// Standalone diagnostic. No application services, MongoDB, attempts or quota.
// Each --execute-once invocation requires separate explicit user authorization.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';

const model = 'gemini-3.8-flash';
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const prompt = 'Xin chào, tôi là sinh viên.';
const instruction = 'Translate Vietnamese to English. Return only the English translation.';
const config = { systemInstruction: instruction, candidateCount: 1, maxOutputTokens: 8192 };
const args = process.argv.slice(2);
let dispatchCount = 0;
let httpStatus = null;

async function main() {
  if (args.length && !(args.length === 1 && args[0] === '--execute-once')) {
    throw new Error('INVALID_ARGUMENTS');
  }
  const pkg = JSON.parse(await readFile(new URL('../node_modules/@google/genai/package.json', import.meta.url), 'utf8'));
  if (pkg.version !== '2.28.0') throw new Error('SDK_VERSION_MISMATCH');
  if (!args.length) {
    console.log(JSON.stringify({ mode: 'PREPARED_NOT_SENT', model, sdk: pkg.version, apiVersion: 'v1beta', metadataRequests: 0, generationRequests: 0, maximumGenerationRequests: 1, retries: 0, schema: false, thinkingConfig: false, maxOutputTokens: 8192, timeoutMs: 120000 }));
    return;
  }
  const env = dotenv.parse(await readFile(new URL('../.env', import.meta.url), 'utf8'));
  const key = (process.env.GEMINI_API_KEY ?? env.GEMINI_API_KEY)?.trim();
  if (!key) throw new Error('API_KEY_MISSING');
  const { GoogleGenAI } = await import('@google/genai');
  const nativeFetch = globalThis.fetch;
  const once = async (url, init) => {
    const address = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
    assert.equal(address, endpoint);
    assert.equal(init?.method, 'POST');
    assert.equal(dispatchCount, 0);
    const body = JSON.parse(String(init.body));
    assert.deepEqual(body.generationConfig, { candidateCount: 1, maxOutputTokens: 8192 });
    assert.deepEqual(body.contents, [{ role: 'user', parts: [{ text: prompt }] }]);
    assert.deepEqual(body.systemInstruction.parts, [{ text: instruction }]);
    // Increment BEFORE network dispatch; ambiguous failure must never resubmit.
    dispatchCount++;
    const response = await nativeFetch(url, { ...init, redirect: 'error' });
    httpStatus = response.status;
    // Bound error/success buffering before the SDK parses the response.
    const reader = response.body?.getReader();
    if (!reader) return response;
    const chunks = []; let bytes = 0;
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        bytes += next.value.byteLength;
        if (bytes > 131072) { await reader.cancel(); throw new Error('RESPONSE_TOO_LARGE'); }
        chunks.push(next.value);
      }
    } finally { reader.releaseLock(); }
    return new Response(Buffer.concat(chunks), { status: response.status, statusText: response.statusText, headers: response.headers });
  };
  const ai = new GoogleGenAI({ apiKey: key, httpOptions: { apiVersion: 'v1beta', timeout: 120000, retryOptions: { attempts: 1 }, fetch: once } });
  const result = await ai.models.generateContent({ model, contents: prompt, config: { ...config, abortSignal: AbortSignal.timeout(120000) } });
  const text = result.text?.trim();
  if (result.candidates?.[0]?.finishReason !== 'STOP' || !text || text.length > 4096) throw new Error('INVALID_TRANSLATION_RESPONSE');
  console.log(JSON.stringify({ httpStatus, requestCount: dispatchCount, status: 'SUCCESS', translation: text }));
}

try { await main(); }
catch (error) {
  // Never print Error/message/stack/raw body: SDK messages may contain secrets.
  let code = dispatchCount ? 'DISPATCH_OR_RESPONSE_UNCERTAIN' : 'PRE_DISPATCH_CHECK_FAILED';
  const local = ['INVALID_ARGUMENTS', 'SDK_VERSION_MISMATCH', 'API_KEY_MISSING', 'RESPONSE_TOO_LARGE', 'INVALID_TRANSLATION_RESPONSE'];
  if (local.includes(error?.message)) code = error.message;
  try {
    if (typeof error?.message === 'string' && Buffer.byteLength(error.message) <= 131072) {
      const status = JSON.parse(error.message)?.error?.status;
      if (['INVALID_ARGUMENT', 'FAILED_PRECONDITION', 'UNAUTHENTICATED', 'PERMISSION_DENIED', 'NOT_FOUND', 'RESOURCE_EXHAUSTED', 'INTERNAL', 'UNAVAILABLE', 'DEADLINE_EXCEEDED'].includes(status)) code = status;
    }
  } catch { /* No arbitrary provider message retained. */ }
  console.log(JSON.stringify({ httpStatus, requestCount: dispatchCount, status: 'FAILED', code }));
  process.exitCode = 1;
}
