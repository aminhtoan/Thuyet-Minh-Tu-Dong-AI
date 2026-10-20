import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { GroupAdmission, groupTestPolicy } from '../src/services/translation/group-admission.js';
import { GroupDraftStore } from '../src/services/translation/group-draft-store.js';
import { collectBoundedSource, SOURCE_BYTE_LIMIT } from '../src/services/translation/bounded-source.js';
import { candidateGroups, revision } from '../src/services/translation/group-plan.js';

process.env.NODE_ENV = 'test';
const MiB = 1024 * 1024;
const policy = { sourceBytes: 128 * 1024, requestCredits: 5 * MiB, processCredits: 32 * MiB, maxActive: 4, maxActivePerUser: 2 };
const capacity = (error: any) => error.code === 'TRANSLATION_CAPACITY_EXHAUSTED';
function source(count = 100, text = 'từ') {
  const segments = Array.from({ length: count }, (_, i) => ({ id: (i + 1).toString(16).padStart(24, '0'), sequence: i + 1, text: `${text}${i % 10}${(i + 1) % 14 === 0 ? '.' : ''}`, startTime: i / 4, endTime: (i + 1) / 4 }));
  return { transcriptId: 'a'.repeat(24), transcriptRevision: 1, languageCode: 'vi', fullText: segments.map(s => s.text).join(' '), segments };
}
const value = () => { const s = source(); return { ownerId: 'owner', projectId: 'project', transcriptId: s.transcriptId, transcriptRevision: 1, sourceLanguage: 'vi', targetLanguage: 'en', sourceRevision: revision(s), groupingVersion: 'phrase-candidates-v1', groups: candidateGroups(s).map(g => ({ ...g, translatedText: 'Synthetic output.' })), outputDigest: 'b'.repeat(64) }; };
function timer() {
  let now = 0; const timers = new Set<{ callback: () => void; due: number }>();
  return { clock: () => now, schedule: (callback: () => void, delay: number) => { const item = { callback, due: now + delay }; timers.add(item); return () => { timers.delete(item); }; }, advance: (time: number) => { now = time; for (const item of [...timers]) if (item.due <= now) { timers.delete(item); item.callback(); } } };
}
test('policy is explicit, immutable, test-only; no environment activation or arbitrary oversized sources', () => {
  assert.ok(Object.isFrozen(groupTestPolicy(policy)));
  for (const change of [{ sourceBytes: 128 * 1024 + 1 }, { requestCredits: 1 }, { maxActive: 0 }, { maxActivePerUser: 5 }, { processCredits: MiB }, { sourceBytes: NaN }]) assert.throws(() => groupTestPolicy({ ...policy, ...change }));
  process.env.NODE_ENV = 'production';
  try { assert.throws(() => new GroupAdmission(policy), /REQUIRES_TEST_ENV/); } finally { process.env.NODE_ENV = 'test'; }
});
test('per-user, aggregate retained-draft credits and idempotent release', () => {
  const ledger = new GroupAdmission(policy);
  const a = ledger.acquire('a'), b = ledger.acquire('a'); assert.throws(() => ledger.acquire('a'), capacity);
  a.settled(); b.settled();
  const remaining = Array.from({ length: 4 }, (_, i) => { const lease = ledger.acquire(`owner${i}`); lease.settled(); return lease; });
  assert.equal(ledger.snapshot().reservedCredits, 30 * MiB); assert.throws(() => ledger.acquire('free'), capacity);
  a.release(); a.release(); b.release(); remaining.forEach(lease => lease.release());
  assert.deepEqual(ledger.snapshot(), { reservedCredits: 0, active: 0 });
});
test('concurrency 1/4/16 bounded admission with actual draft retention, profiling separate from credits', async t => {
  for (const concurrency of [1, 4, 16]) await t.test(String(concurrency), async () => {
    const ledger = new GroupAdmission(policy), time = timer(), store = new GroupDraftStore(time.clock, 100, 50, time.schedule);
    let release!: () => void, calls = 0;
    const gate = new Promise<void>(resolve => { release = resolve; }); const before = process.memoryUsage();
    const requests = Array.from({ length: concurrency }, (_, i) => store.preview(String(i), 'sig', async () => { calls++; await gate; return value(); }, { ownerId: String(i), controller: ledger }));
    const outcomes = Promise.allSettled(requests); await Promise.resolve();
    const admitted = Math.min(4, concurrency);
    assert.equal(calls, admitted); assert.equal(ledger.snapshot().active, admitted);
    const pending = process.memoryUsage(); release(); const results = await outcomes;
    assert.equal(results.filter(r => r.status === 'fulfilled').length, admitted);
    assert.ok(results.filter(r => r.status === 'rejected').every(r => r.status === 'rejected' && capacity(r.reason)));
    assert.deepEqual(ledger.snapshot(), { active: 0, reservedCredits: admitted * policy.requestCredits });
    time.advance(100); assert.equal(ledger.snapshot().reservedCredits, 0);
    console.log('ADMISSION_PROFILE', JSON.stringify({ concurrency, admitted, rejected: concurrency - admitted, reservedCredits: admitted * policy.requestCredits, baselineHeap: before.heapUsed, pendingHeap: pending.heapUsed, completedHeap: process.memoryUsage().heapUsed, rss: process.memoryUsage().rss }));
  });
});
test('single-flight shares one reservation; timeout/disconnect cannot release active underlying work', async () => {
  const ledger = new GroupAdmission(policy), time = timer(), store = new GroupDraftStore(time.clock, 100, 50, time.schedule);
  let release!: () => void, calls = 0; const gate = new Promise<void>(resolve => { release = resolve; });
  const create = async () => { calls++; await gate; return value(); };
  const a = store.preview('key', 'sig', create, { ownerId: 'owner', controller: ledger });
  const b = store.preview('key', 'sig', create, { ownerId: 'owner', controller: ledger });
  const outcomes = Promise.allSettled([a, b]); await Promise.resolve(); time.advance(200);
  assert.equal(calls, 1); assert.deepEqual(ledger.snapshot(), { active: 1, reservedCredits: policy.requestCredits });
  await assert.rejects(store.preview('key', 'different', create, { ownerId: 'owner', controller: ledger }));
  assert.equal(ledger.snapshot().active, 1); release();
  assert.ok((await outcomes).every(r => r.status === 'rejected'));
  assert.deepEqual(ledger.snapshot(), { active: 0, reservedCredits: 0 }); time.advance(201);
});
test('HTTP mock load 1/4/16; disconnect preserves the admitted operation until underlying settlement', { timeout: 30000 }, async t => {
  for (const concurrency of [1, 4, 16]) await t.test(String(concurrency), async () => {
    const ledger = new GroupAdmission(policy), time = timer(), store = new GroupDraftStore(time.clock, 10000, 50, time.schedule);
    let release!: () => void, calls = 0;
    const gate = new Promise<void>(resolve => { release = resolve; });
    // Synthetic HTTP surface only; not an application route or auth bypass.
    const app = express();
    app.post('/fixture/:key', async (req, res) => {
      try {
        const draft = await store.preview(String(req.params.key), 'sig', async () => { calls++; await gate; return value(); }, { ownerId: String(req.params.key), controller: ledger });
        if (!res.destroyed) res.json(draft);
      } catch { if (!res.destroyed) res.sendStatus(503); }
    });
    const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address(); assert.ok(address && typeof address !== 'string');
    const url = `http://127.0.0.1:${address.port}/fixture/`;
    const abort = new AbortController(), before = process.memoryUsage();
    const cancelled = fetch(url + '0', { method: 'POST', signal: abort.signal }).catch(() => null);
    const requests = Array.from({ length: concurrency }, (_, i) => fetch(url + i, { method: 'POST' }).then(async res => { const status = res.status; await res.text(); return status; }));
    try {
      const admitted = Math.min(4, concurrency), deadline = Date.now() + 5000;
      while (calls < admitted && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 5));
      assert.equal(calls, admitted); abort.abort(); await cancelled;
      assert.equal(ledger.snapshot().active, admitted);
      const pending = process.memoryUsage(); release(); const statuses = await Promise.all(requests);
      assert.equal(statuses.filter(status => status === 200).length, admitted);
      assert.equal(statuses.filter(status => status === 503).length, concurrency - admitted);
      assert.equal(calls, admitted); assert.equal(ledger.snapshot().active, 0);
      time.advance(10000); assert.equal(ledger.snapshot().reservedCredits, 0);
      console.log('HTTP_ADMISSION_PROFILE', JSON.stringify({ concurrency, admitted, baselineHeap: before.heapUsed, pendingHeap: pending.heapUsed, completedHeap: process.memoryUsage().heapUsed, rss: process.memoryUsage().rss }));
    } finally { release(); await Promise.allSettled(requests); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
  });
});
test('provider failure, overflow and source revision rejection release once; no draft or automatic retry', async () => {
  for (const kind of ['failure', 'overflow', 'revision']) {
    const ledger = new GroupAdmission(policy), store = new GroupDraftStore(); let calls = 0;
    const create = async () => { calls++; if (kind !== 'overflow') throw new Error(kind); const v = value(); v.groups[0]!.translatedText = 'x'.repeat(128 * 1024); return v; };
    await assert.rejects(store.preview(kind, 'sig', create, { ownerId: 'owner', controller: ledger }));
    await assert.rejects(store.preview(kind, 'sig', create, { ownerId: 'owner', controller: ledger }));
    assert.equal(calls, 1); assert.deepEqual(ledger.snapshot(), { active: 0, reservedCredits: 0 });
  }
});
test('test source policy preserves IDs/text/times/digest/coverage; default remains 98304', async () => {
  for (const count of [100, 1027, 2000, 5000]) {
    const s = source(count), { segments, ...header } = s;
    const rows = async function* () { yield* segments; };
    const bytes = Buffer.byteLength(JSON.stringify(s));
    if (bytes <= policy.sourceBytes) {
      const loaded = await collectBoundedSource(header, rows(), policy.sourceBytes);
      assert.deepEqual(loaded, s); assert.equal(revision(loaded), revision(s));
      assert.deepEqual(candidateGroups(loaded).flatMap(g => g.sourceSegmentIds), segments.map(s => s.id));
    } else await assert.rejects(collectBoundedSource(header, rows(), policy.sourceBytes));
    if (count === 1027) { assert.ok(bytes > SOURCE_BYTE_LIMIT); await assert.rejects(collectBoundedSource(header, rows())); }
    console.log('ADMISSION_SOURCE', JSON.stringify({ count, bytes, accepted: bytes <= policy.sourceBytes }));
  }
  const s = source(1), { segments, ...header } = s;
  header.fullText += 'x'.repeat(policy.sourceBytes - Buffer.byteLength(JSON.stringify(s)));
  const rows = async function* () { yield* segments; };
  assert.equal(Buffer.byteLength(JSON.stringify(await collectBoundedSource(header, rows(), policy.sourceBytes))), policy.sourceBytes);
  await assert.rejects(collectBoundedSource({ ...header, fullText: header.fullText + 'é' }, rows(), policy.sourceBytes));
  const long = source(10, 'x'.repeat(10000));
  await assert.rejects(collectBoundedSource(long, (async function* () { yield* long.segments; })(), policy.sourceBytes));
  process.env.NODE_ENV = 'production';
  try { await assert.rejects(collectBoundedSource(header, rows(), policy.sourceBytes), /POLICY_INVALID/); } finally { process.env.NODE_ENV = 'test'; }
});
