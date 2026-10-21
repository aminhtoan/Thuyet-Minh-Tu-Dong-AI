import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OneUsePermitFence } from '../src/services/translation/one-use-permit.js';
import { ControlledGeminiProvider, assertControlledThinking } from '../src/services/translation/controlled-gemini.provider.js';
import { ThinkingLevel } from '@google/genai';
import { digest } from '../src/services/translation/group-plan.js';
import { GeminiGroupTranslationProvider } from '../src/services/translation/gemini-group-translation.provider.js';
import { controlledTarget, withPermittedSource } from '../src/services/translation/controlled-development.js';
import { GroupDraftStore } from '../src/services/translation/group-draft-store.js';
import { grant, owner, input, metadata, output, sdkJson } from './controlled-execution/fixtures.js';
const linux = { skip: process.platform !== 'linux' ? 'Run durable actual-SDK tests in Linux Docker.' : false };
async function fixture(work: (directory: string) => Promise<void>) {
  process.env.NODE_ENV = 'development'; process.env.CONTROLLED_PROVIDER_MODE = 'PERMIT';
  const directory = await mkdtemp(join(tmpdir(), 'controlled-sdk-'));
  try { await work(directory); } finally { await rm(directory, { recursive: true }); }
}
test('installed SDK exposes MEDIUM; serialized thinking must match the exact approved mode', () => {
  assert.equal(ThinkingLevel.MEDIUM, 'MEDIUM');
  const defaultBody = { generationConfig: { maxOutputTokens: 8192 } };
  const medium = { generationConfig: { thinkingConfig: { thinkingLevel: 'MEDIUM' } } };
  const low = { generationConfig: { thinkingConfig: { thinkingLevel: 'LOW' } } };
  assert.doesNotThrow(() => assertControlledThinking('MEDIUM', medium));
  assert.doesNotThrow(() => assertControlledThinking('LOW', low));
  assert.doesNotThrow(() => assertControlledThinking('DEFAULT', defaultBody));
  let dispatches = 0;
  for (const body of [defaultBody, low, null, {}, { generationConfig: { thinkingConfig: null } }, { generationConfig: { thinkingConfig: { thinkingLevel: 'MEDIUM', thinkingBudget: 1 } } }]) {
    assert.throws(() => { assertControlledThinking('MEDIUM', body); dispatches++; }, /CONTROLLED_THINKING_MISMATCH/);
  }
  assert.throws(() => assertControlledThinking('LOW', medium));
  assert.throws(() => assertControlledThinking('DEFAULT', medium));
  assert.equal(dispatches, 0);
});
test('MEDIUM permit binds persisted fingerprint, serializes explicitly and rejects concurrent/duplicate/rebound modes', linux, async () => fixture(async directory => {
  const p = { ...grant(), thinking: 'MEDIUM' }, fence = await OneUsePermitFence.open(directory, p);
  assert.equal(fence.permit.thinking, 'MEDIUM');
  assert.equal(await readFile(join(directory, `${p.id}.binding`), 'utf8'), digest(p));
  let gets = 0, posts = 0;
  const fetcher: typeof fetch = async (_url, init) => {
    if (init?.method !== 'POST') { gets++; return metadata(); }
    posts++;
    const body = JSON.parse(String(init.body));
    assert.equal(body.generationConfig.thinkingConfig.thinkingLevel, 'MEDIUM');
    assert.equal(body.generationConfig.maxOutputTokens, 8192);
    return output();
  };
  for (const thinking of ['DEFAULT', 'LOW']) {
    await assert.rejects(OneUsePermitFence.open(directory, { ...p, thinking, lowExplicitlyApproved: thinking === 'LOW' }), /PROVIDER_PERMIT_BINDING_MISMATCH/);
  }
  assert.equal(gets + posts, 0, 'known approval/permit mismatch dispatches nothing');
  assert.throws(() => { (fence.permit as any).thinking = 'LOW'; }, TypeError);
  const provider = new ControlledGeminiProvider(fence, 'mock-only', async () => {}, fetcher);
  const results = await Promise.allSettled(Array.from({ length: 16 }, () => withPermittedSource(fence, owner, () => provider.translate(input))));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(gets, 1); assert.equal(posts, 1);
  const reopened = await OneUsePermitFence.open(directory, p);
  await assert.rejects(withPermittedSource(reopened, owner, () => new ControlledGeminiProvider(reopened, 'mock-only', async () => {}, fetcher).translate(input)));
  assert.equal(gets + posts, 2);
}));
test('actual installed SDK: 16 concurrent attempts dispatch at most 1 metadata + 1 generation; duplicate/reopened fence stays spent', linux, async () => fixture(async directory => {
  const p = grant(), fence = await OneUsePermitFence.open(directory, p);
  let gets = 0, posts = 0, checks = 0; let usage: unknown;
  const fetcher: typeof fetch = async (url, init) => {
    assert.match(String(url), /^https:\/\/generativelanguage.googleapis.com\/v1beta\/models\/gemini-3.8-flash/);
    assert.equal(init?.redirect, 'error');
    if (init?.method === 'POST') { posts++; const body = JSON.parse(String(init.body)); assert.equal(body.generationConfig.maxOutputTokens, 8192); assert.equal(body.generationConfig.candidateCount, 1); assert.equal(body.generationConfig.thinkingConfig, undefined); return output(); }
    gets++; return metadata();
  };
  const provider = new ControlledGeminiProvider(fence, 'mock-only', async () => { checks++; }, fetcher, value => { usage = value; });
  const results = await Promise.allSettled(Array.from({ length: 16 }, () => withPermittedSource(fence, owner, () => provider.translate(input))));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal(gets, 1); assert.equal(posts, 1); assert.ok(checks >= 2);
  assert.deepEqual(usage, { promptTokenCount: 20, candidatesTokenCount: 10, thoughtsTokenCount: 5, totalTokenCount: 35 });
  const reopened = await OneUsePermitFence.open(directory, p);
  await assert.rejects(withPermittedSource(reopened, owner, () => new ControlledGeminiProvider(reopened, 'mock-only', async () => {}, fetcher).translate(input)));
  assert.equal(gets + posts, 2);
}));
test('unfenced default provider and absent/foreign scope cannot bypass permit', linux, async () => fixture(async directory => {
  const fence = await OneUsePermitFence.open(directory, grant()); let calls = 0;
  const provider = new ControlledGeminiProvider(fence, 'mock-only', async () => {}, async () => { calls++; return output(); });
  await assert.rejects(provider.translate(input));
  await assert.rejects(withPermittedSource(fence, 'f'.repeat(24), () => provider.translate(input)));
  await withPermittedSource(fence, owner, async () => { await assert.rejects(new GeminiGroupTranslationProvider().translate(input)); });
  assert.equal(calls, 0);
}));
test('LOW is serialized only with explicit approval, never enabled by default', linux, async () => fixture(async directory => {
  const p = { ...grant(), thinking: 'LOW', lowExplicitlyApproved: true }, fence = await OneUsePermitFence.open(directory, p);
  let low: unknown;
  const provider = new ControlledGeminiProvider(fence, 'mock-only', async () => {}, async (_url, init) => {
    if (init?.method !== 'POST') return metadata();
    low = JSON.parse(String(init.body)).generationConfig.thinkingConfig.thinkingLevel; return output();
  });
  await withPermittedSource(fence, owner, () => provider.translate(input)); assert.equal(low, 'LOW');
  await assert.rejects(OneUsePermitFence.open(directory, { ...grant(), thinking: 'LOW', lowExplicitlyApproved: false }));
}));
test('input mismatch or stale source blocks before dispatch; revision drift before generation blocks generation', linux, async () => fixture(async directory => {
  const fence = await OneUsePermitFence.open(directory, grant()); let calls = 0, checks = 0;
  const provider = new ControlledGeminiProvider(fence, 'mock-only', async () => { if (++checks === 2) throw new Error('source revision changed'); }, async () => { calls++; return metadata(); });
  await assert.rejects(withPermittedSource(fence, owner, () => provider.translate({ ...input, fullText: 'changed' })));
  assert.equal(calls, 0);
  await assert.rejects(withPermittedSource(fence, owner, () => provider.translate(input)));
  assert.equal(calls, 1);
  await assert.rejects(fence.generation(controlledTarget.model, input, async () => { throw new Error('stale'); }, async () => { calls++; return {}; }));
  assert.equal(calls, 1);
}));
test('metadata HTTP 429/network timeout is not retried; uncertain generation stays spent', linux, async () => {
  for (const phase of ['metadata-429', 'metadata-timeout', 'generation-timeout']) await fixture(async directory => {
    const p = grant(), fence = await OneUsePermitFence.open(directory, p); let calls = 0;
    const fetcher: typeof fetch = async (_url, init) => {
      calls++;
      if (phase === 'metadata-429') return sdkJson({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'synthetic' } }, 429);
      if (phase === 'metadata-timeout' || init?.method === 'POST') throw new DOMException('synthetic timeout', 'TimeoutError');
      return metadata();
    };
    const provider = new ControlledGeminiProvider(fence, 'mock-only', async () => {}, fetcher);
    await assert.rejects(withPermittedSource(fence, owner, () => provider.translate(input)));
    const count = calls;
    const reopened = await OneUsePermitFence.open(directory, p);
    await assert.rejects(withPermittedSource(reopened, owner, () => new ControlledGeminiProvider(reopened, 'mock-only', async () => {}, fetcher).translate(input)));
    assert.equal(calls, count); assert.equal(count, phase === 'generation-timeout' ? 2 : 1);
  });
});
test('truncated JSON/missing groups/oversized transport response never yields a draft', linux, async () => {
  for (const body of [sdkJson({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{}' }] } }] }), sdkJson({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{bad' }] } }] }), sdkJson({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"outcome":"translated","groups":[]}' }] } }] }), new Response('x'.repeat(131073))]) await fixture(async directory => {
    const fence = await OneUsePermitFence.open(directory, grant()); let calls = 0;
    const provider = new ControlledGeminiProvider(fence, 'mock-only', async () => {}, async (_url, init) => { calls++; return init?.method === 'POST' ? body : metadata(); });
    const store = new GroupDraftStore();
    await withPermittedSource(fence, owner, async () => {
      await assert.rejects(store.preview('only', 'same', async () => { await provider.translate(input); throw new Error('must not create a draft'); }));
      await assert.rejects(store.preview('only', 'same', async () => { throw new Error('no retry'); }));
    });
    assert.equal(calls, 2); assert.throws(() => store.get('missing', owner, controlledTarget.projectId));
  });
});
