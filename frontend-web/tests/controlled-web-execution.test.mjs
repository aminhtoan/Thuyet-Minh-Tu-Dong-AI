import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createControlledPreviewClient, parseExecutionReadiness } from '../src/features/translation/controlledPreviewClient.mjs';
const projectId = 'a'.repeat(24), hash = 'b'.repeat(64), draftId = '11111111-1111-4111-8111-111111111111';
let serial = 10;
const ready = () => ({ state: 'READY', executionAllowed: true, authorizationId: (++serial).toString(16).padStart(64, '0'), expiresAt: Date.now() + 60000,
  scope: { projectId, transcriptRevision: 1, sourceDigest: hash, sourceLanguage: 'vi', targetLanguage: 'en', model: 'gemini-3.8-flash', thinking: 'MEDIUM' },
  source: { segmentCount: 1, groupCount: 1, coverage: 1 }, limits: { metadataRequests: 1, generationRequests: 1, retries: 0, timeoutMs: 120000, maxOutputTokens: 8192 } });
const draft = () => ({ draftId, projectId, transcriptRevision: 1, sourceRevision: hash, sourceLanguage: 'vi', targetLanguage: 'en', groupingVersion: 'phrase-candidates-v1', alignmentFormat: 'GROUPS_V1', state: 'DRAFT', outputDigest: hash, expiresAt: new Date(Date.now() + 60000).toISOString(), groups: [{ groupId: hash, sequence: 1, sourceSegmentIds: ['c'.repeat(24)], sourceText: 'Synthetic only', translatedText: 'Synthetic only', startTime: 0, endTime: 1 }] });
const json = data => new Response(JSON.stringify({ success: true, data }));
const make = (fetcher, patch = {}) => createControlledPreviewClient({ enabled: true, executionEnabled: true, origin: 'http://127.0.0.1:18083', projectId, getToken: () => 'synthetic-test-token', fetcher, ...patch });
test('readiness states and malformed/mismatched/expired/over-budget data fail closed', () => {
  for (const state of ['LOCKED', 'EXPIRED', 'CONSUMED', 'MISMATCHED']) assert.equal(parseExecutionReadiness({ state, executionAllowed: false }, projectId).state, state);
  const r = ready();
  for (const bad of [{}, { ...r, expiresAt: 1 }, { ...r, scope: { ...r.scope, projectId: 'f'.repeat(24) } }, { ...r, scope: { ...r.scope, thinking: 'LOW' } }, { ...r, limits: { ...r.limits, retries: 1 } }]) assert.equal(parseExecutionReadiness(bad, projectId).executionAllowed, false);
});
test('no generation on creation/readiness; opt-in and explicit confirmation required', async () => {
  const calls = []; const raw = ready();
  const fetcher = async (url, init) => { calls.push({ url, init }); return json(raw); };
  const c = make(fetcher); assert.equal(calls.length, 0);
  const r = await c.readiness(); assert.equal(r.state, 'READY'); assert.equal(calls[0].init.method, 'GET');
  await assert.rejects(c.execute(r, false));
  await assert.rejects(make(fetcher, { executionEnabled: false }).execute(r, true));
  await assert.rejects(make(fetcher, { getToken: () => undefined }).execute(r, true));
  assert.equal(calls.length, 1);
});
test('manual POST once, duplicate/remount blocked, validated DRAFT retained with no approve/TTS/fallback', async () => {
  const raw = ready(); let posts = 0;
  const c = make(async (url, init) => {
    assert.match(url, /^http:\/\/127\.0\.0\.1:18083\/api\/projects\//);
    assert.equal(init.credentials, 'omit'); assert.equal(init.redirect, 'error');
    if (init.method === 'GET') return json(raw);
    posts++; assert.ok(url.endsWith('/controlled-preview'));
    assert.deepEqual(JSON.parse(init.body), { confirmation: 'EXECUTE_ONCE', authorizationId: raw.authorizationId });
    return json({ draft: draft() });
  });
  const r = await c.readiness(); const results = await Promise.allSettled([c.execute(r, true), c.execute(r, true)]);
  assert.equal(results.filter(v => v.status === 'fulfilled').length, 1); assert.equal(posts, 1);
  assert.equal(results.find(v => v.status === 'fulfilled').value.state, 'DRAFT');
  await assert.rejects(make(async () => { throw Error('must not fetch'); }).execute(r, true));
});
for (const failure of ['timeout', 'disconnect', '401', '403', '404', '503', 'invalid-draft', 'coverage-mismatch']) test(`${failure}: UNCERTAIN after POST, no retry/refresh/replacement`, async () => {
  let calls = 0; const raw = ready();
  const c = make(async () => {
    calls++;
    if (failure === 'timeout' || failure === 'disconnect') throw new DOMException('synthetic', 'AbortError');
    if (/^\d+$/.test(failure)) return new Response('', { status: Number(failure) });
    return json({ draft: failure === 'invalid-draft' ? {} : { ...draft(), groups: [draft().groups[0], { ...draft().groups[0], groupId: 'f'.repeat(64), sequence: 2, sourceSegmentIds: ['d'.repeat(24)], startTime: 1, endTime: 2 }] } });
  });
  const r = parseExecutionReadiness(raw, projectId);
  await assert.rejects(c.execute(r, true), /UNCERTAIN/);
  await assert.rejects(c.execute(r, true)); assert.equal(calls, 1);
});
test('readiness network/auth errors block and do not automatically generate or refresh', async () => {
  for (const status of [401, 403, 404, 503]) {
    let calls = 0; const c = make(async () => { calls++; return new Response('', { status }); });
    assert.equal((await c.readiness()).state, 'BLOCKED'); assert.equal(calls, 1);
  }
});
test('UI confirmation/gates are explicit, no automatic execution or approval', async () => {
  const page = await readFile(new URL('../src/pages/ControlledTranslationPreviewPage.tsx', import.meta.url), 'utf8');
  assert.match(page, /VITE_CONTROLLED_TRANSLATION_EXECUTION_ENABLED === 'true'/);
  assert.match(page, /type="checkbox"/); assert.match(page, /setSubmitted\(true\)/);
  assert.match(page, /onClick=\{\(\) => void executeOnce\(\)\}/);
  assert.doesNotMatch(page, /\.approve\(|\/approve|groupTranslationService|console\./);
});
