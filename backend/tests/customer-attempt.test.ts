import test from 'node:test';
import assert from 'node:assert/strict';
import { CustomerAttemptStore } from '../src/services/translation/customer-attempt.js';
import { GroupDraftStore, type GroupDraft } from '../src/services/translation/group-draft-store.js';
import { customerDispatch, customerResponse } from '../src/services/translation/customer-execution.js';
import { TranslationProviderFailure } from '../src/services/translation/provider-failure.js';
// Small explicit test profile. Production defaults are tested independently.
process.env.CUSTOMER_TRANSLATION_DAILY_USER_LIMIT = '3';
process.env.CUSTOMER_TRANSLATION_DAILY_GLOBAL_LIMIT = '20';
const metadata = async () => { await customerDispatch('METADATA'); await customerResponse('METADATA'); };
const s = { ownerId: '1'.repeat(24), projectId: '2'.repeat(24), targetLanguage: 'en', sourceRevision: '3'.repeat(64) };
const draft = (): GroupDraft => ({ draftId: '11111111-1111-4111-8111-111111111111', ...s, transcriptId: '4'.repeat(24), transcriptRevision: 1, sourceLanguage: 'vi', groupingVersion: 'phrase-candidates-v1', groups: [], outputDigest: '5'.repeat(64), expiresAt: new Date(Date.now() + 60000).toISOString(), alignmentFormat: 'GROUPS_V1', state: 'DRAFT' });
function fixture(patch = {}) {
  const rows = new Map<string, any>(); let quotas = 0;
  const key = (scope: typeof s) => JSON.stringify(scope);
  const repo = {
    read: async (scope: typeof s) => rows.get(key(scope)) ?? null,
    claim: async (scope: typeof s, binding: string) => { if (rows.has(key(scope))) throw { code: 11000 }; rows.set(key(scope), { ...scope, binding, state: 'CLAIMED' }); },
    quota: async () => { quotas++; },
    record: async (scope: typeof s, _binding: string, phase: string) => { rows.get(key(scope)).phase = phase; },
    fail: async (scope: typeof s, _binding: string, state: string, phase: string, diagnosticCode: string) => Object.assign(rows.get(key(scope)), { state, phase, diagnosticCode }),
    finish: async (scope: typeof s, binding: string, draftJson: string) => { const row = rows.get(key(scope)); assert.equal(row.binding, binding); assert.equal(row.state, 'CLAIMED'); Object.assign(row, { state: 'DRAFT', draftJson }); }, ...patch,
  };
  return { rows, repo: repo as any, quotaCount: () => quotas };
}

for (const afterDispatch of [false, true]) test(`timeout ${afterDispatch ? 'after' : 'before'} dispatch is durable and never rearms after restart`, async t => {
  t.mock.method(console, 'error', () => {});
  const f = fixture(); let calls = 0;
  const work = async () => {
    if (afterDispatch) { await metadata(); await customerDispatch('GENERATION'); calls++; }
    throw new TranslationProviderFailure(502, 'TRANSLATION_TIMEOUT', 'Safe timeout', afterDispatch ? 504 : undefined);
  };
  await assert.rejects(new CustomerAttemptStore(f.repo).execute(s, 'bound', work));
  const row = [...f.rows.values()][0];
  assert.equal(row.state, afterDispatch ? 'UNCERTAIN' : 'FAILED_PRE_DISPATCH');
  assert.equal(row.diagnosticCode, 'TRANSLATION_TIMEOUT'); assert.equal(row.draftJson, undefined);
  await assert.rejects(new CustomerAttemptStore(f.repo).execute(s, 'bound', work));
  assert.equal(calls, afterDispatch ? 1 : 0);
});

test('lost save acknowledgement recovers only the already persisted validated bytes, not provider execution', async () => {
  const f = fixture(); let calls = 0, saves = 0; const finish = f.repo.finish;
  f.repo.finish = async (...args: Parameters<typeof finish>) => { saves++; await finish(...args); throw Error('lost acknowledgement'); };
  const work = async () => { await metadata(); await customerDispatch('GENERATION'); calls++; await customerResponse('GENERATION'); return draft(); };
  const saved = await new CustomerAttemptStore(f.repo).execute(s, 'bound', work);
  assert.equal((await new CustomerAttemptStore(f.repo).execute(s, 'bound', work)).draftId, saved.draftId);
  assert.equal(calls, 1); assert.equal(saves, 1);
});
test('16 concurrent duplicates, new client keys and process restart dispatch only once and return persisted same draft', async () => {
  const f = fixture(); let calls = 0;
  const work = async () => { await metadata(); calls++; await new Promise(resolve => setTimeout(resolve, 10)); return draft(); };
  const results = await Promise.allSettled(Array.from({ length: 16 }, () => new CustomerAttemptStore(f.repo).execute(s, 'binding', work)));
  assert.equal(calls, 1); assert.equal(f.quotaCount(), 1); assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const restarted = new CustomerAttemptStore(f.repo);
  assert.deepEqual(await restarted.execute(s, 'binding', work), draftWithExpiry(results)); assert.equal(calls, 1);
  function draftWithExpiry(values: typeof results) { const value = values.find(r => r.status === 'fulfilled'); assert.equal(value?.status, 'fulfilled'); return value!.status === 'fulfilled' ? value.value : null; }
});
test('source/project/owner scoping is independent, binding mismatch and foreign payload rejected', async () => {
  const f = fixture(), store = new CustomerAttemptStore(f.repo);
  await store.execute(s, 'binding', async () => draft());
  for (const other of [{ ...s, projectId: '6'.repeat(24) }, { ...s, ownerId: '7'.repeat(24) }, { ...s, sourceRevision: '8'.repeat(64) }]) assert.equal(await store.read(other), null);
  await assert.rejects(store.execute(s, 'different-plan/model', async () => { throw Error('no dispatch'); }), (e: any) => e.code === 'TRANSLATION_ATTEMPT_MISMATCH');
  const row = [...f.rows.values()][0]; row.draftJson = JSON.stringify({ ...draft(), ownerId: 'f'.repeat(24) });
  await assert.rejects(store.read(s));
});
for (const phase of ['claim-ambiguous', 'quota', 'provider-timeout', 'finish-ambiguous', 'invalid-response']) test(`${phase} never dispatches again after failure/restart`, async () => {
  const f = fixture(); let calls = 0;
  const originalClaim = f.repo.claim;
  if (phase === 'claim-ambiguous') f.repo.claim = async (...args: any[]) => { await originalClaim(...args); throw Error('lost acknowledgement'); };
  if (phase === 'quota') f.repo.quota = async () => { throw Error('exhausted'); };
  if (phase === 'finish-ambiguous') f.repo.finish = async () => { throw Error('lost save acknowledgement'); };
  const work = async () => { await metadata(); calls++; if (phase === 'provider-timeout' || phase === 'invalid-response') throw Error('synthetic'); return draft(); };
  await assert.rejects(new CustomerAttemptStore(f.repo).execute(s, 'binding', work));
  await assert.rejects(new CustomerAttemptStore(f.repo).execute(s, 'binding', work));
  assert.equal(calls, ['claim-ambiguous', 'quota'].includes(phase) ? 0 : 1);
});
test('expiry and oversized draft never authorize another provider request', async () => {
  for (const value of [{ ...draft(), expiresAt: new Date(1).toISOString() }, { ...draft(), extra: 'x'.repeat(131073) }]) {
    const f = fixture(), store = new CustomerAttemptStore(f.repo); let calls = 0;
    const work = async () => { calls++; return value; };
    try { await store.execute(s, 'binding', work); } catch { /* overflow spent */ }
    await assert.rejects(new CustomerAttemptStore(f.repo).execute(s, 'binding', work)); assert.equal(calls, 1);
  }
});
test('durable draft restore preserves identity/expiry without extending TTL', () => {
  const d = draft(), store = new GroupDraftStore();
  assert.deepEqual(store.restore(d), d); assert.deepEqual(store.get(d.draftId, s.ownerId, s.projectId), d);
  assert.throws(() => store.get(d.draftId, 'f'.repeat(24), s.projectId));
  assert.throws(() => store.restore({ ...d, expiresAt: new Date(1).toISOString() }));
});
test('Mongo repository uses unique _id and majority+journal claims/quotas; quota cannot exceed configured daily ceilings', async t => {
  const { TranslationAttempt } = await import('../src/models/TranslationAttempt.js');
  const rows = new Map<string, any>(), quotas = new Map<string, number>(); let calls = 0, claims = 0;
  const session = { async withTransaction(work: () => Promise<void>, options: any) {
    assert.deepEqual(options.writeConcern, { w: 'majority', j: true });
    const savedRows = structuredClone(rows), savedQuotas = new Map(quotas);
    try { await work(); } catch (e) { rows.clear(); for (const [k, v] of savedRows) rows.set(k, v); quotas.clear(); for (const [k, v] of savedQuotas) quotas.set(k, v); throw e; }
  }, async endSession() {} };
  t.mock.method(TranslationAttempt.db, 'startSession', async () => session as any);
  t.mock.method(TranslationAttempt.collection, 'findOne', async (filter: any) => rows.get(filter._id) ?? null);
  t.mock.method(TranslationAttempt, 'aggregate', async (pipeline: any) => { const row = rows.get(pipeline[0].$match._id); return row ? [{ row }] : []; });
  t.mock.method(TranslationAttempt.collection, 'insertOne', async (row: any, options: any) => {
    assert.deepEqual(options.writeConcern, { w: 'majority', j: true }); assert.match(row._id, /^[a-f\d]{64}$/); claims++;
    if (rows.has(row._id)) throw { code: 11000 }; rows.set(row._id, { ...row }); return {} as any;
  });
  t.mock.method(TranslationAttempt.collection, 'updateOne', async (filter: any, update: any, options: any) => {
    assert.equal(options.session, session);
    if (update.$set?.quotaReserved) { Object.assign(rows.get(filter._id), update.$set); return { modifiedCount: 1 } as any; }
    assert.equal(options.upsert, true); assert.equal(update.$inc.count, 1);
    const count = quotas.get(filter._id) ?? 0;
    if (count >= filter.count.$lt) throw { code: 11000 };
    quotas.set(filter._id, count + 1); return { modifiedCount: count ? 1 : 0, upsertedCount: count ? 0 : 1 } as any;
  });
  t.mock.method(TranslationAttempt, 'updateOne', async (filter: any, update: any, options: any) => {
    assert.deepEqual(options.writeConcern, { w: 'majority', j: true }); const row = rows.get(filter._id);
    assert.equal(row.state, 'CLAIMED'); assert.equal(filter.binding, row.binding); Object.assign(row, update.$set); return { modifiedCount: 1 } as any;
  });
  for (let i = 0; i < 4; i++) {
    const scope = { ...s, sourceRevision: String(i).repeat(64) };
    const work = async () => { await metadata(); calls++; return { ...draft(), ...scope }; };
    if (i < 3) await new CustomerAttemptStore().execute(scope, 'bound', work);
    else await assert.rejects(new CustomerAttemptStore().execute(scope, 'bound', work), (e: any) => e.code === 'TRANSLATION_DAILY_LIMIT');
  }
  assert.equal(calls, 3); assert.equal(claims, 4);
  assert.equal(quotas.get(`customer-day:${s.ownerId}:${new Date().toISOString().slice(0, 10)}`), 3);
  for (let i = 0; i < 18; i++) {
    const scope = { ...s, ownerId: (i + 16).toString(16).padStart(24, '0') };
    const work = async () => { await metadata(); calls++; return { ...draft(), ...scope }; };
    if (i < 17) await new CustomerAttemptStore().execute(scope, 'bound', work);
    else {
      const before = [...quotas];
      await assert.rejects(new CustomerAttemptStore().execute(scope, 'bound', work), (e: any) => e.code === 'TRANSLATION_DAILY_LIMIT');
      assert.deepEqual([...quotas], before); // Global denial cannot burn an owner's remaining allowance.
    }
  }
  assert.equal(calls, 20);
  assert.equal(quotas.get(`customer-global-day:${new Date().toISOString().slice(0, 10)}`), 20);
});
test('quota storage outage is not misreported as quota exhaustion and cannot dispatch provider', async t => {
  const { TranslationAttempt } = await import('../src/models/TranslationAttempt.js'); let row: any = null;
  t.mock.method(console, 'error', () => {});
  t.mock.method(TranslationAttempt, 'aggregate', async () => row ? [{ row }] : []);
  t.mock.method(TranslationAttempt.collection, 'insertOne', async (value: any) => { row = { ...value }; return {} as any; });
  t.mock.method(TranslationAttempt.db, 'startSession', async () => ({ withTransaction: async (work: () => Promise<void>) => work(), endSession: async () => {} }) as any);
  t.mock.method(TranslationAttempt.collection, 'findOne', async () => row);
  t.mock.method(TranslationAttempt.collection, 'updateOne', async () => { throw new Error('PRIVATE_DATABASE_DETAIL'); });
  t.mock.method(TranslationAttempt, 'updateOne', async (_filter: any, update: any) => { Object.assign(row, update.$set); return { modifiedCount: 1 } as any; });
  await assert.rejects(new CustomerAttemptStore().execute(s, 'b', async () => { await metadata(); assert.fail('NO_PROVIDER'); }), (e: any) => e.code === 'TRANSLATION_QUOTA_UNAVAILABLE' && e.statusCode === 503 && !e.message.includes('PRIVATE'));
  assert.equal(row.state, 'FAILED_PRE_DISPATCH'); assert.equal(row.diagnosticCode, 'TRANSLATION_QUOTA_UNAVAILABLE');
  await assert.rejects(new CustomerAttemptStore().execute(s, 'b', async () => assert.fail('NO_REPLAY')));
});
