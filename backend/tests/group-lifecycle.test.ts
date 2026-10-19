import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { GroupDraftStore } from '../src/services/translation/group-draft-store.js';
import { candidateGroups, digest, GROUPING_VERSION, revision, validatePlan } from '../src/services/translation/group-plan.js';
import { GeminiGroupTranslationProvider } from '../src/services/translation/gemini-group-translation.provider.js';

const source = (count = 100) => {
  const segments = Array.from({ length: count }, (_, i) => ({ id: (i + 1).toString(16).padStart(24, '0'), sequence: i + 1, text: `từ${i}${(i + 1) % 14 === 0 ? '.' : ''}`, startTime: i / 4, endTime: (i + 1) / 4 }));
  return { transcriptId: 'a'.repeat(24), transcriptRevision: 1, languageCode: 'vi', fullText: segments.map(s => s.text).join(' '), segments };
};
const value = () => {
  const s = source();
  return { ownerId: 'owner', projectId: 'project', transcriptId: s.transcriptId, transcriptRevision: 1, sourceLanguage: 'vi', targetLanguage: 'en', sourceRevision: revision(s), groupingVersion: GROUPING_VERSION,
    groups: candidateGroups(s).map(g => ({ ...g, translatedText: 'Synthetic translation' })), outputDigest: 'b'.repeat(64) };
};
const maps = (store: GroupDraftStore) => store as unknown as { drafts: Map<string, unknown>; requests: Map<string, unknown> };
function fakeTimer() {
  let now = 0;
  const timers = new Set<{ due: number; callback: () => void }>();
  return {
    clock: () => now,
    schedule: (callback: () => void, delay: number) => { const timer = { due: now + delay, callback }; timers.add(timer); return () => { timers.delete(timer); }; },
    advance: (time: number) => { now = time; for (const timer of [...timers]) if (timer.due <= now) { timers.delete(timer); timer.callback(); } },
    count: () => timers.size,
  };
}

test('group IDs/contents/boundaries match the previous per-group digest formula exactly', () => {
  for (const count of [100, 1027, 2000, 5000]) {
    const s = source(count), before = JSON.stringify(s), groups = candidateGroups(s);
    for (const group of groups) {
      assert.equal(group.groupId, digest([revision(s), GROUPING_VERSION, group.sourceSegmentIds]));
      const members = s.segments.filter(segment => group.sourceSegmentIds.includes(segment.id));
      assert.equal(group.sourceText, members.map(segment => segment.text).join(' '));
      assert.equal(group.startTime, members[0]!.startTime); assert.equal(group.endTime, members.at(-1)!.endTime);
    }
    assert.deepEqual(groups.flatMap(g => g.sourceSegmentIds), s.segments.map(segment => segment.id));
    assert.deepEqual(validatePlan(s, groups.map(g => g.sourceSegmentIds)), groups);
    assert.equal(JSON.stringify(s), before);
    s.transcriptRevision++;
    assert.notEqual(candidateGroups(s)[0]!.groupId, groups[0]!.groupId, 'no digest cache survives across revisions');
  }
});

test('active TTL releases both draft clone and fulfilled promise without another request', async () => {
  const timer = fakeTimer();
  const store = new GroupDraftStore(timer.clock, 100, 1, timer.schedule);
  const draft = await store.preview('key', 'sig', async () => value());
  assert.equal(maps(store).drafts.size, 1); assert.equal(maps(store).requests.size, 1);
  assert.equal(timer.count(), 1);
  timer.advance(100);
  assert.equal(maps(store).drafts.size, 0); assert.equal(maps(store).requests.size, 0);
  assert.equal(timer.count(), 0);
  assert.throws(() => store.get(draft.draftId, 'owner', 'project'));
});

test('pending single-flight stays claimed after client timeout; late work never creates a partial draft', async () => {
  const timer = fakeTimer();
  const store = new GroupDraftStore(timer.clock, 100, 1, timer.schedule);
  let release!: () => void; let calls = 0;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const create = async () => { calls++; await gate; return value(); };
  const a = store.preview('key', 'sig', create);
  const b = store.preview('key', 'sig', create);
  const outcomes = Promise.allSettled([a, b]);
  await Promise.resolve(); timer.advance(200);
  assert.equal(calls, 1); assert.equal(timer.count(), 0);
  assert.equal(maps(store).requests.size, 1); assert.equal(maps(store).drafts.size, 0);
  await assert.rejects(store.preview('other', 'sig', create), /Bộ nhớ/);
  release();
  assert.ok((await outcomes).every(result => result.status === 'rejected'));
  assert.equal(maps(store).drafts.size, 0);
  timer.advance(201); assert.equal(maps(store).requests.size, 0);
});

test('failed request receipt expires actively, without automatic generation retry', async () => {
  const timer = fakeTimer(); const store = new GroupDraftStore(timer.clock, 100, 1, timer.schedule);
  let calls = 0; const create = async () => { calls++; throw new Error('synthetic timeout'); };
  await assert.rejects(store.preview('key', 'sig', create));
  await assert.rejects(store.preview('key', 'sig', create));
  assert.equal(calls, 1); assert.equal(maps(store).drafts.size, 0);
  timer.advance(100); assert.equal(maps(store).requests.size, 0);
});

test('HTTP + real store + mocked SDK transport load; disconnected client does not free pending work', { timeout: 30_000 }, async (t) => {
  const oldKey = process.env.GEMINI_API_KEY, oldProvider = process.env.TRANSLATION_PROVIDER;
  process.env.GEMINI_API_KEY = 'mock-only'; process.env.TRANSLATION_PROVIDER = 'gemini';
  try {
    for (const concurrency of [1, 4, 16]) await t.test(`HTTP concurrency ${concurrency}`, async () => {
      const s = source(), base = value(), store = new GroupDraftStore();
      let release!: () => void; let calls = 0;
      const gate = new Promise<void>(resolve => { release = resolve; });
      const provider = new GeminiGroupTranslationProvider({
        async metadata() { return { supportedActions: ['generateContent'] }; },
        async generate(_model, input) { calls++; await gate; return { finishReason: 'STOP', text: JSON.stringify({ outcome: 'translated', groups: input.groups.map(g => ({ groupId: g.groupId, translatedText: 'Synthetic output' })) }) }; },
      });
      // Isolated fixture HTTP surface, not an application auth bypass or route.
      const app = express(); app.use(express.json());
      app.post('/fixture/:key', async (req, res) => {
        try {
          const draft = await store.preview(String(req.params.key), 'sig', async () => {
            const output = await provider.translate({ fullText: s.fullText, sourceLanguage: 'vi', targetLanguage: 'en', groups: base.groups.map(g => ({ groupId: g.groupId, sourceText: g.sourceText })) });
            return { ...base, groups: base.groups.map((g, i) => ({ ...g, translatedText: output[i]!.translatedText })) };
          });
          if (!res.destroyed) res.json(draft);
        } catch { if (!res.destroyed) res.status(503).json({ error: 'fixture failure' }); }
      });
      const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
      const address = server.address(); assert.ok(address && typeof address !== 'string');
      const url = `http://127.0.0.1:${address.port}/fixture/`;
      const baseline = process.memoryUsage();
      const abort = new AbortController();
      const cancelled = fetch(url + '0', { method: 'POST', signal: abort.signal }).catch(() => null);
      const requests = Array.from({ length: concurrency }, (_, i) => fetch(url + i, { method: 'POST' }).then(async response => { assert.equal(response.status, 200); return response.json(); }));
      try {
        const deadline = Date.now() + 5000;
        while (calls < concurrency && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 5));
        assert.equal(calls, concurrency);
        abort.abort(); await cancelled;
        assert.equal(maps(store).requests.size, concurrency); assert.equal(maps(store).drafts.size, 0);
        const pending = process.memoryUsage(); release();
        const results = await Promise.all(requests);
        const completed = process.memoryUsage();
        assert.equal(calls, concurrency); assert.equal(maps(store).drafts.size, concurrency);
        assert.ok(results.every(result => result.groups.length === base.groups.length));
        console.log('HTTP_MOCK_MEMORY', JSON.stringify({ concurrency, baselineHeap: baseline.heapUsed, pendingHeap: pending.heapUsed, completedHeap: completed.heapUsed, baselineRss: baseline.rss, pendingRss: pending.rss, completedRss: completed.rss }));
      } finally { release(); await Promise.allSettled(requests); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
    });
  } finally {
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey;
    if (oldProvider === undefined) delete process.env.TRANSLATION_PROVIDER; else process.env.TRANSLATION_PROVIDER = oldProvider;
  }
});
