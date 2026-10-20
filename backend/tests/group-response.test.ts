import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { GroupAdmission } from '../src/services/translation/group-admission.js';
import { GroupDraftStore } from '../src/services/translation/group-draft-store.js';
import { boundedGroupJson, groupResponseHandler, GROUP_RESPONSE_BYTES } from '../src/services/translation/group-response.js';
import { scopedGroupAdmission, withGroupSourceScope } from '../src/services/translation/group-source-scope.js';

process.env.NODE_ENV = 'test';
const credit = 5 * 1024 * 1024;
const ledger = () => new GroupAdmission({ sourceBytes: 128 * 1024, requestCredits: credit, processCredits: 32 * 1024 * 1024, maxActive: 4, maxActivePerUser: 2 });
class Response extends EventEmitter {
  destroyed = false; writableFinished = false; body = ''; writes = 0;
  type() { return this; }
  send(body: string) { this.body = body; this.writes++; return this; }
  finish() { this.writableFinished = true; this.emit('finish'); }
  destroy() { this.destroyed = true; this.emit('close'); return this; }
}
const req = (id = 'owner') => ({ user: { id } }) as any;
const tick = () => new Promise<void>(resolve => setImmediate(resolve));
test('bounded serialization preserves JSON semantics and counts Unicode/escape bytes exactly', () => {
  const value = { date: new Date('2026-01-01'), a: ['é\n"', null, 0], omitted: undefined };
  const expected = JSON.stringify(value), bytes = Buffer.byteLength(expected);
  assert.equal(boundedGroupJson(value, bytes), expected);
  assert.throws(() => boundedGroupJson(value, bytes - 1));
  assert.throws(() => boundedGroupJson({ text: 'x'.repeat(GROUP_RESPONSE_BYTES) }));
  const cyclic: any = {}; cyclic.self = cyclic; assert.throws(() => boundedGroupJson(cyclic));
  assert.throws(() => boundedGroupJson({ array: Array(100001).fill(0) }));
});
test('success keeps response reservation through serialization until finish; release idempotent', async () => {
  const admission = ledger(), res = new Response();
  const handler = groupResponseHandler(admission, async () => ({ success: true }));
  const pending = handler(req(), res as any, error => assert.fail(String(error)));
  await tick(); assert.equal(res.writes, 1); assert.equal(admission.snapshot().active, 1);
  assert.equal(admission.snapshot().reservedCredits, credit);
  res.finish(); res.destroy(); await pending;
  assert.deepEqual(admission.snapshot(), { active: 0, reservedCredits: 0 });
  assert.equal(res.listenerCount('close') + res.listenerCount('finish') + res.listenerCount('error'), 0);
});
test('disconnect/error before work settles does not release; late completion does not send', async () => {
  for (const event of ['close', 'error']) {
    const admission = ledger(), res = new Response(); let settle!: () => void;
    const gate = new Promise<void>(resolve => { settle = resolve; });
    const pending = groupResponseHandler(admission, async () => { await gate; return { ok: true }; })(req(), res as any, error => assert.fail(String(error)));
    if (event === 'close') res.destroy(); else res.emit('error', new Error('synthetic socket error'));
    await tick(); assert.equal(admission.snapshot().active, 1); settle(); await pending;
    assert.equal(res.writes, 0); assert.equal(admission.snapshot().reservedCredits, 0);
  }
});
test('failure/serialization overflow sends no partial success; error response still holds the slot', async () => {
  for (const overflow of [false, true]) {
    const admission = ledger(), res = new Response(); let error: any;
    const pending = groupResponseHandler(admission, async () => { if (!overflow) throw new Error('synthetic'); return { text: 'x'.repeat(GROUP_RESPONSE_BYTES) }; })(req(), res as any, e => { error = e; });
    await tick(); assert.ok(error); assert.equal(res.writes, 0); assert.equal(admission.snapshot().active, 1);
    res.finish(); await pending; assert.equal(admission.snapshot().reservedCredits, 0);
  }
});
test('duplicate waiters each own a response slot; only one retained work/draft reservation; TTL is independent', async () => {
  const admission = ledger(); let now = 0, expire!: () => void, complete!: () => void, calls = 0;
  const store = new GroupDraftStore(() => now, 100, 50, callback => { expire = callback; return () => {}; });
  const gate = new Promise<void>(resolve => { complete = resolve; });
  const create = async () => { calls++; await gate; return { ownerId: 'owner', projectId: 'project', transcriptId: 't', transcriptRevision: 1, sourceLanguage: 'vi', targetLanguage: 'en', sourceRevision: 'r', groupingVersion: 'g', groups: [], outputDigest: 'o' }; };
  const handler = groupResponseHandler(admission, async () => store.preview('key', 'sig', create, { ownerId: 'owner', controller: admission }));
  const a = new Response(), b = new Response(), c = new Response();
  const first = handler(req(), a as any, error => assert.fail(String(error)));
  const second = handler(req(), b as any, error => assert.fail(String(error)));
  let rejected: any; await handler(req(), c as any, error => { rejected = error; });
  await tick(); assert.equal(rejected.code, 'TRANSLATION_CAPACITY_EXHAUSTED'); assert.equal(calls, 1);
  assert.deepEqual(admission.snapshot(), { active: 2, reservedCredits: 3 * credit });
  complete(); await tick(); assert.equal(a.writes, 1); assert.equal(b.writes, 1);
  now = 100; expire(); assert.deepEqual(admission.snapshot(), { active: 2, reservedCredits: 2 * credit });
  a.finish(); b.finish(); await Promise.all([first, second]); assert.equal(admission.snapshot().reservedCredits, 0);
});
test('GET/approve operations share HTTP slot, reject exhaustion and do not borrow another owner scope', async () => {
  const admission = ledger(), leases = Array.from({ length: 4 }, (_, i) => admission.acquire(String(i)));
  for (const operation of ['get', 'approve']) await assert.rejects(admission.operation('owner', async () => operation));
  leases.forEach(lease => lease.release());
  await admission.responseScope('owner', async () => {
    await admission.operation('owner', async () => assert.equal(admission.snapshot().active, 1));
    await admission.operation('other', async () => assert.equal(admission.snapshot().active, 2));
  });
  assert.equal(admission.snapshot().active, 0);
});
test('detached async callback cannot borrow an expired response scope', async () => {
  const admission = ledger(); let release!: () => void, late!: Promise<void>;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await admission.responseScope('owner', async () => {
    late = gate.then(() => admission.operation('owner', async () => assert.equal(admission.snapshot().active, 1)));
  });
  assert.equal(admission.snapshot().active, 0); release(); await late;
  assert.deepEqual(admission.snapshot(), { active: 0, reservedCredits: 0 });
});
test('source policy is scoped, inherited by admitted readers, expires and refuses production activation', async () => {
  const admission = ledger(); let release!: () => void, late!: Promise<void>;
  assert.equal(scopedGroupAdmission(), undefined);
  const gate = new Promise<void>(resolve => { release = resolve; });
  await admission.responseScope('owner', async () => {
    assert.equal(scopedGroupAdmission(), admission);
    await admission.operation('owner', async () => assert.equal(scopedGroupAdmission(), admission));
    late = gate.then(() => { assert.equal(scopedGroupAdmission(), undefined); });
  });
  release(); await late; assert.equal(scopedGroupAdmission(), undefined);
  process.env.NODE_ENV = 'production';
  try { await assert.rejects(withGroupSourceScope(admission, async () => null), /REQUIRES_TEST_ENV/); }
  finally { process.env.NODE_ENV = 'test'; }
});
