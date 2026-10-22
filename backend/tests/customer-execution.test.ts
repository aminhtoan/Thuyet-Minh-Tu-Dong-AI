import test from 'node:test';
import assert from 'node:assert/strict';
import { CustomerAttemptStore } from '../src/services/translation/customer-attempt.js';
import { customerDispatch, customerResponse, recoverCustomerRead } from '../src/services/translation/customer-execution.js';
import { GeminiGroupTranslationProvider } from '../src/services/translation/gemini-group-translation.provider.js';
import { withCustomerTranslation } from '../src/services/translation/customer-scope.js';
import { AppError } from '../src/utils/app-error.js';
const s = { ownerId: '1'.repeat(24), projectId: '2'.repeat(24), sourceRevision: '3'.repeat(64), targetLanguage: 'en' };
const draft = () => ({ ...s, draftId: '11111111-1111-4111-8111-111111111111', transcriptId: '4'.repeat(24), transcriptRevision: 1, sourceLanguage: 'vi', groupingVersion: 'phrase-candidates-v1', groups: [], outputDigest: '5'.repeat(64), state: 'DRAFT' as const, alignmentFormat: 'GROUPS_V1' as const, expiresAt: new Date(Date.now() + 60000).toISOString() });
function fixture() {
  let row: any = null; let quota = 0; const events: string[] = [];
  const repo = {
    read: async () => row,
    claim: async () => { assert.equal(row, null); row = { ...s, binding: 'b', state: 'CLAIMED', executionVersion: 1, phase: 'PREPARING', updatedAt: new Date() }; },
    quota: async () => { quota++; },
    record: async (_s: any, _b: any, phase: string, previous: string) => { assert.equal(row.phase, previous); row.phase = phase; events.push(phase); },
    fail: async (_s: any, _b: any, state: string, phase: string, diagnosticCode: string) => { if (row.state === 'CLAIMED') Object.assign(row, { state, phase, diagnosticCode }); },
    finish: async (_s: any, _b: any, draftJson: string) => { row.state = 'DRAFT'; row.draftJson = draftJson; },
  };
  return { repo, events, store: new CustomerAttemptStore(repo as any), row: () => row, quota: () => quota };
}
test('durable phases precede fake dispatch, response and save; restart reads the exact draft', async () => {
  const f = fixture(); let calls = 0;
  const work = async () => {
    await customerDispatch('METADATA'); assert.equal(f.row().phase, 'METADATA_DISPATCHING'); calls++;
    await customerResponse('METADATA'); await customerDispatch('GENERATION'); assert.equal(f.row().phase, 'GENERATION_DISPATCHING'); calls++;
    await customerResponse('GENERATION'); return draft();
  };
  const result = await f.store.execute(s, 'b', work);
  assert.equal((await f.store.inspect(s))?.status, 'DRAFT_SAVED');
  assert.deepEqual(await new CustomerAttemptStore(f.repo as any).execute(s, 'b', work), result);
  assert.equal(calls, 2); assert.equal(f.quota(), 1);
  assert.deepEqual(f.events, ['METADATA_DISPATCHING', 'METADATA_RECEIVED', 'GENERATION_DISPATCHING', 'GENERATION_RECEIVED', 'SAVING']);
});
for (const phase of ['configuration', 'quota', 'metadata', 'generation', 'invalid-response', 'diagnostic-write']) test(`failure ${phase} is durable, sanitized and never redispatched`, async t => {
  const f = fixture(); let sends = 0; const logs: unknown[] = [];
  t.mock.method(console, 'error', (...args) => logs.push(args));
  if (phase === 'quota') f.repo.quota = async () => { throw new AppError(429, 'TRANSLATION_DAILY_LIMIT', 'PRIVATE'); };
  if (phase === 'diagnostic-write') f.repo.record = async () => { throw Error('PRIVATE'); };
  const work = async () => {
    if (phase === 'configuration') throw new AppError(503, 'TRANSLATION_NOT_CONFIGURED', 'PRIVATE');
    await customerDispatch('METADATA'); sends++;
    if (phase === 'metadata') throw Error('PRIVATE');
    await customerResponse('METADATA'); await customerDispatch('GENERATION'); sends++;
    if (phase === 'generation') throw new DOMException('PRIVATE', 'TimeoutError');
    await customerResponse('GENERATION'); throw new AppError(502, 'TRANSLATION_INVALID_RESPONSE', 'PRIVATE');
  };
  await assert.rejects(f.store.execute(s, 'b', work)); const before = sends;
  await assert.rejects(new CustomerAttemptStore(f.repo as any).execute(s, 'b', work)); assert.equal(sends, before);
  const expected = ['configuration', 'quota', 'diagnostic-write'].includes(phase) ? 'FAILED_PRE_DISPATCH' : phase === 'invalid-response' ? 'FAILED_RESPONSE' : 'UNCERTAIN';
  assert.equal((await f.store.inspect(s))?.status, expected); assert.doesNotMatch(JSON.stringify(logs), /PRIVATE/);
  if (phase === 'configuration' || phase === 'diagnostic-write') assert.equal(f.quota(), 0);
});
test('legacy CLAIMED never gains false dispatch evidence or authorization; stale processing remains uncertain', async () => {
  const f = fixture(); await f.repo.claim(); delete f.row().executionVersion;
  const original = JSON.stringify(f.row());
  assert.equal((await f.store.inspect(s))?.status, 'UNCERTAIN');
  await assert.rejects(f.store.execute(s, 'b', async () => assert.fail('NO_PROVIDER')));
  assert.equal(JSON.stringify(f.row()), original);
  f.row().executionVersion = 1; f.row().phase = 'GENERATION_DISPATCHING';
  assert.equal((await f.store.inspect(s))?.status, 'PROCESSING');
  f.row().updatedAt = new Date(1); assert.equal((await f.store.inspect(s))?.status, 'UNCERTAIN');
});
test('lost save acknowledgement recovers persisted draft; transient save failure reuses identical bytes without another provider call', async () => {
  for (const committed of [false, true]) {
    const f = fixture(), finish = f.repo.finish; let saves = 0, calls = 0;
    f.repo.finish = async (...args) => { saves++; if (saves === 1) { if (committed) await finish(...args); throw Error('LOST_ACK'); } await finish(...args); };
    const result = await f.store.execute(s, 'b', async () => { calls++; return draft(); });
    assert.equal(result.state, 'DRAFT'); assert.equal(calls, 1); assert.equal(saves, committed ? 1 : 2);
  }
});
test('only transient Mongo reads retry once; no retry of validation/configuration or repeated outages', async () => {
  let reads = 0;
  const outage = () => Object.assign(new Error('PRIVATE'), { name: 'MongoNetworkError' });
  assert.equal(await recoverCustomerRead(async () => { if (++reads === 1) throw outage(); return 7; }), 7); assert.equal(reads, 2);
  reads = 0; await assert.rejects(recoverCustomerRead(async () => { reads++; throw outage(); })); assert.equal(reads, 2);
  reads = 0; await assert.rejects(recoverCustomerRead(async () => { reads++; throw new AppError(409, 'SOURCE_CHANGED', 'PRIVATE'); })); assert.equal(reads, 1);
});
test('diagnostic DB outage never hides original safe code or redispatches; durable fence remains', async t => {
  const f = fixture(); const logs: unknown[] = []; t.mock.method(console, 'error', (...args) => logs.push(args));
  f.repo.fail = async () => { throw Error('PRIVATE_DATABASE_URI'); };
  await assert.rejects(f.store.execute(s, 'b', async () => { await customerDispatch('METADATA'); throw new AppError(502, 'TRANSLATION_NETWORK_ERROR', 'safe'); }), (error: any) => error.code === 'TRANSLATION_NETWORK_ERROR');
  assert.equal(f.row().state, 'CLAIMED'); assert.equal(f.row().phase, 'METADATA_DISPATCHING');
  assert.match(JSON.stringify(logs), /"diagnosticSaved":false/); assert.doesNotMatch(JSON.stringify(logs), /PRIVATE_DATABASE_URI/);
  await assert.rejects(f.store.execute(s, 'b', async () => assert.fail('NO_REPLAY')));
});
test('missing config fails before transport; failed durable fence blocks actual SDK fetch', async t => {
  const f = fixture(); process.env.GEMINI_API_KEY = ''; let calls = 0;
  t.mock.method(console, 'error', () => {});
  t.mock.method(globalThis, 'fetch', async () => { calls++; assert.fail('NO_HTTP'); });
  const work = async () => { await new GeminiGroupTranslationProvider().translate({ fullText: 'Synthetic', sourceLanguage: 'vi', targetLanguage: 'en', groups: [] }); return draft(); };
  await assert.rejects(f.store.execute(s, 'b', work)); assert.equal(f.row().state, 'FAILED_PRE_DISPATCH'); assert.equal(calls, 0);
  const blocked = fixture(); process.env.GEMINI_API_KEY = 'synthetic-only'; blocked.repo.record = async () => { throw Error('PRIVATE_DB_ERROR'); };
  await assert.rejects(blocked.store.execute(s, 'b', work), (e: any) => e.code === 'TRANSLATION_ATTEMPT_FENCE_FAILED');
  assert.equal(blocked.row().diagnosticCode, 'TRANSLATION_ATTEMPT_FENCE_FAILED'); assert.equal(calls, 0);
});
test('real SDK fetch boundary is fenced, MEDIUM unchanged, duplicate/concurrent dispatch cannot send again', async t => {
  process.env.GEMINI_API_KEY = 'synthetic-only'; process.env.GEMINI_TRANSLATION_MODEL = 'gemini-3.8-flash';
  process.env.CUSTOMER_TRANSLATION_ENABLED = 'true'; process.env.CUSTOMER_TRANSLATION_THINKING = 'MEDIUM'; delete process.env.CONTROLLED_PROVIDER_MODE;
  const f = fixture(); const sends: string[] = [];
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    const generation = init?.method === 'POST';
    assert.equal(f.row().phase, generation ? 'GENERATION_DISPATCHING' : 'METADATA_DISPATCHING'); sends.push(f.row().phase);
    if (!generation) return Response.json({ supportedGenerationMethods: ['generateContent'] });
    const body = JSON.parse(String(init?.body)); assert.equal(body.generationConfig.thinkingConfig.thinkingLevel, 'MEDIUM'); assert.equal(body.generationConfig.maxOutputTokens, 8192);
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ outcome: 'translated', groups: [{ groupId: 'g', translatedText: 'Synthetic only' }] }) }] } }] });
  });
  const input = { fullText: 'Synthetic only', sourceLanguage: 'vi', targetLanguage: 'en', groups: [{ groupId: 'g', sourceText: 'Synthetic only' }] };
  const results = await Promise.allSettled(Array.from({ length: 16 }, () => f.store.execute(s, 'b', () => withCustomerTranslation(async () => { await new GeminiGroupTranslationProvider().translate(input); return draft(); }))));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal(sends.length, 2);
});
