import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createControlledPreviewClient, controlledPreviewTarget as policy, parseControlledStatus as parseStatus, parseControlledDraft as parseDraft } from '../src/features/translation/controlledPreviewClient.mjs';
const target = { ...policy, projectId: 'a'.repeat(24), revision: 1, digest: 'b'.repeat(64) };
const parseControlledStatus = value => parseStatus(value, target.projectId);
const parseControlledDraft = (value, id) => parseDraft(value, id, target);
const origin = 'http://127.0.0.1:18083';
const draftId = '11111111-1111-4111-8111-111111111111';
const ready = { state: 'READY', generationEnabled: false, scope: { projectId: target.projectId, transcriptRevision: 1, sourceDigest: target.digest, sourceLanguage: 'vi', targetLanguage: 'en', model: target.model, thinking: 'MEDIUM' }, source: { segmentCount: 1, groupCount: 1, coverage: 1 } };
const makeDraft = () => ({ draftId, projectId: target.projectId, transcriptRevision: 1, sourceRevision: target.digest, sourceLanguage: 'vi', targetLanguage: 'en', groupingVersion: 'phrase-candidates-v1', alignmentFormat: 'GROUPS_V1', state: 'DRAFT', outputDigest: 'a'.repeat(64), expiresAt: new Date(Date.now() + 60000).toISOString(), groups: [{ groupId: 'b'.repeat(64), sequence: 1, sourceSegmentIds: ['c'.repeat(24)], sourceText: 'Nội dung minh họa kiểm thử.', translatedText: 'Synthetic test content.', startTime: 0, endTime: 1 }] });
const json = data => new Response(JSON.stringify({ success: true, data }), { headers: { 'content-type': 'application/json' } });
function client(fetcher, options = {}) { return createControlledPreviewClient({ enabled: true, origin, projectId: target.projectId, getToken: () => 'synthetic-access-token', fetcher, ...options }); }

for (const state of ['READY', 'BLOCKED', 'REQUEST_CONSUMED']) test(`preserves actual server status ${state}; generation always disabled`, async () => {
  const c = client(async (url, init) => { assert.equal(url, `${origin}/api/projects/${target.projectId}/translations/controlled-status`); assert.equal(init.method, 'GET'); return json(state === 'READY' ? ready : { state, generationEnabled: false, scope: ready.scope }); });
  const value = await c.status(); assert.equal(value.state, state); assert.equal(value.serverReported, true); assert.equal(value.generationEnabled, false);
});
for (const variant of ['network', 'expired-jwt', 'unauthorized-owner', 'runtime-locked', 'invalid-json', 'unknown-state']) test(`${variant} fails closed without refresh/retry/legacy fallback`, async () => {
  let calls = 0;
  const c = client(async () => {
    calls++;
    if (variant === 'network') throw new Error('private network details');
    if (variant === 'expired-jwt') return new Response('', { status: 401 });
    if (variant === 'unauthorized-owner') return new Response('', { status: 404 });
    if (variant === 'runtime-locked') return new Response('', { status: 503 });
    if (variant === 'invalid-json') return new Response('private invalid payload');
    return json({ state: 'DRAFT_READY', generationEnabled: false });
  });
  const result = await c.status(); assert.equal(result.state, 'BLOCKED'); assert.equal(result.serverReported, false); assert.equal(calls, 1); assert.doesNotMatch(JSON.stringify(result), /private|token|DRAFT_READY|\bLOCKED\b/);
});
test('development opt-in, exact project and explicit dedicated origin are required before sending JWT', async () => {
  let calls = 0;
  for (const options of [{ enabled: false }, { origin: undefined }, { origin: 'http://localhost:8080' }, { origin: 'https://attacker.invalid' }, { origin: origin + '/api' }, { projectId: 'invalid-project' }, { getToken: () => undefined }]) {
    assert.equal((await client(async () => { calls++; throw new Error(); }, options).status()).state, 'BLOCKED');
  }
  assert.equal(calls, 0);
});
test('unsupported scope or generationEnabled=true is blocked even if state says READY', () => {
  for (const value of [{ ...ready, generationEnabled: true }, { ...ready, scope: { ...ready.scope, thinking: 'LOW' } }, { ...ready, scope: { ...ready.scope, transcriptRevision: 0 } }, { ...ready, source: { ...ready.source, coverage: 0 } }]) assert.equal(parseControlledStatus(value).state, 'BLOCKED');
});
test('no draft returns a safe error; no provider, retry or fallback is attempted', async () => {
  let calls = 0;
  const c = client(async () => { calls++; return new Response('', { status: 410 }); });
  await assert.rejects(c.draft(draftId, parseControlledStatus(ready)), /Không thể xem bản nháp/); assert.equal(calls, 1);
  await assert.rejects(c.draft('', parseControlledStatus(ready))); assert.equal(calls, 1);
  await assert.rejects(c.draft(draftId, parseControlledStatus({ state: 'BLOCKED', generationEnabled: false }))); assert.equal(calls, 1);
});
test('valid authenticated draft GET retains vi/en groups without exposing extraneous fields or mutating', async () => {
  const paths = [];
  const c = client(async (url, init) => {
    paths.push(url); assert.equal(init.method, 'GET'); assert.equal(init.body, undefined); assert.equal(init.headers.Authorization, 'Bearer synthetic-access-token'); assert.equal(init.redirect, 'error'); assert.equal(init.cache, 'no-store'); assert.equal(init.credentials, 'omit');
    return url.endsWith('/controlled-status') ? json(ready) : json({ draft: { ...makeDraft(), ownerId: 'private-internal-field' } });
  });
  const status = await c.status(), draft = await c.draft(draftId, status);
  assert.equal(draft.groups[0].sourceText, 'Nội dung minh họa kiểm thử.'); assert.equal(draft.groups[0].translatedText, 'Synthetic test content.');
  assert.equal(draft.state, 'DRAFT'); assert.ok(!('ownerId' in draft)); assert.equal(paths.length, 2);
  assert.match(paths[1], new RegExp(`/drafts/${draftId}$`));
  assert.deepEqual(Object.keys(c).sort(), ['draft', 'status']);
});
test('consumed status may read an existing draft, never implying CURRENT or permitting generation', async () => {
  const c = client(async () => json({ draft: makeDraft() }));
  const result = await c.draft(draftId, parseControlledStatus({ state: 'REQUEST_CONSUMED', generationEnabled: false, scope: ready.scope }));
  assert.equal(result.state, 'DRAFT'); assert.ok(!('provenanceState' in result));
});
test('project A/B use server-derived independent bindings, while crossed status/draft scope fails closed', async () => {
  for (const [projectId, revision, sourceDigest] of [[target.projectId, 2, 'c'.repeat(64)], ['d'.repeat(24), 7, 'e'.repeat(64)]]) {
    const response = { ...ready, scope: { ...ready.scope, projectId, transcriptRevision: revision, sourceDigest } };
    const c = client(async url => url.endsWith('/controlled-status') ? json(response) : json({ draft: { ...makeDraft(), projectId, transcriptRevision: revision, sourceRevision: sourceDigest } }), { projectId });
    const status = await c.status(); assert.equal(status.state, 'READY'); assert.equal(status.generationEnabled, false);
    const draft = await c.draft(draftId, status); assert.equal(draft.projectId, projectId); assert.equal(draft.transcriptRevision, revision);
  }
  const foreign = client(async () => json(ready), { projectId: 'f'.repeat(24) });
  assert.equal((await foreign.status()).state, 'BLOCKED');
  assert.throws(() => parseDraft(makeDraft(), draftId, { ...target, projectId: 'f'.repeat(24) }));
});
test('wrong project/revision/language, expired draft, duplicate or reordered coverage fail closed', () => {
  for (const patch of [{ projectId: 'f'.repeat(24) }, { transcriptRevision: 2 }, { targetLanguage: 'fr' }, { sourceRevision: 'e'.repeat(64) }, { expiresAt: new Date(0).toISOString() }, { groups: [] }, { groups: [makeDraft().groups[0], makeDraft().groups[0]] }, { groups: [{ ...makeDraft().groups[0], sequence: 2 }] }]) assert.throws(() => parseControlledDraft({ ...makeDraft(), ...patch }, draftId));
});
test('abort is passed to GET and does not initiate retry or mutation', async () => {
  const controller = new AbortController(); let calls = 0;
  const pending = client(async (_url, init) => { calls++; return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true })); }).status(controller.signal);
  controller.abort(); assert.equal((await pending).state, 'BLOCKED'); assert.equal(calls, 1);
});
test('entry is DEV-only, opt-in, RequireAuth protected; viewer has no generation/approval controls', async () => {
  const router = await readFile(new URL('../src/routes/AppRouter.tsx', import.meta.url), 'utf8');
  const page = await readFile(new URL('../src/pages/ControlledTranslationPreviewPage.tsx', import.meta.url), 'utf8');
  const environment = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
  const transport = await readFile(new URL('../src/features/translation/controlledPreviewClient.mjs', import.meta.url), 'utf8');
  assert.match(router, /const ControlledTranslationPreviewPage = import\.meta\.env\.DEV/);
  assert.match(page, /import\.meta\.env\.DEV && import\.meta\.env\.VITE_CONTROLLED_TRANSLATION_PREVIEW_ENABLED === 'true'/);
  assert.match(router, /controlledTranslationPreviewEnabled && ControlledTranslationPreviewPage && <Route element=\{<RequireAuth/);
  assert.match(environment, /VITE_CONTROLLED_TRANSLATION_PREVIEW_ENABLED=false/);
  assert.match(page, /test\(projectId\)/);
  assert.doesNotMatch(page + transport, /6ad5c93a86cf95b7523704a5|81638f2cb62e5f5f/);
  assert.match(page, /aria-live="polite"/); assert.match(page, /htmlFor="controlled-draft-id"/);
  assert.doesNotMatch(page, /GroupTranslationWorkspace|groupTranslationService|translationService|\.approve\(|\.preview\(|window\.confirm|console\./);
  assert.doesNotMatch(transport, /method: 'POST'|method: 'PUT'|method: 'PATCH'|method: 'DELETE'|apiBaseUrl|\/auth\/refresh/);
});
