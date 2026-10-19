// Test-only lifecycle simulation: no DB, environment configuration or SDK calls.
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { serialize } from 'node:v8';
import { candidateGroups, revision, type SourceSnapshot } from '../../src/services/translation/group-plan.js';
import { GroupDraftStore } from '../../src/services/translation/group-draft-store.js';
import { mapGroupResponse } from '../../src/services/translation/gemini-group-translation.provider.js';

const count = Number(process.argv[2]);
const concurrency = Number(process.argv[3]);
const expanded = process.argv[4] === 'expanded';
assert.ok([100, 1027, 2000, 5000].includes(count));
assert.ok([1, 4, 16].includes(concurrency));
const began = performance.now();
const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value));
const sample = () => { global.gc?.(); const m = process.memoryUsage(); return { heap: m.heapUsed, rss: m.rss, external: m.external }; };
const baseline = sample();
const segments = Array.from({ length: count }, (_, i) => ({ id: (i + 1).toString(16).padStart(24, '0'), sequence: i + 1,
  text: expanded ? 'Nội dung tổng hợp dùng để kiểm tra bộ nhớ. '.repeat(20).trim() : `từ${i % 10}${(i + 1) % 14 === 0 ? '.' : ''}`,
  startTime: i / 4, endTime: (i + 1) / 4 }));
const source: SourceSnapshot = { transcriptId: 'a'.repeat(24), transcriptRevision: 1, languageCode: 'vi', fullText: segments.map(s => s.text).join(' '), segments };
const digestBefore = revision(source);
const planningStart = performance.now();
const groups = candidateGroups(source);
const planningMs = performance.now() - planningStart;
assert.deepEqual(groups.flatMap(g => g.sourceSegmentIds), segments.map(s => s.id));
const compact = { ...source, segments: segments.map(s => [s.id, s.sequence, s.text, s.startTime, s.endTime] as const) };
// Serialize and parse to test an actual wire/storage round trip, not shared references.
const decoded = JSON.parse(JSON.stringify(compact)) as typeof compact;
const restored = { ...decoded, segments: decoded.segments.map(([id, sequence, text, startTime, endTime]) => ({ id, sequence, text, startTime, endTime })) };
assert.deepEqual(restored, source);
assert.equal(revision(restored), digestBefore);
const input = { fullText: source.fullText, sourceLanguage: 'vi', targetLanguage: 'en', groups: groups.map(g => ({ groupId: g.groupId, sourceText: g.sourceText })) };
const response = { outcome: 'translated', groups: groups.map(g => ({ groupId: g.groupId, translatedText: expanded ? 'Synthetic output. '.repeat(100) : 'Synthetic English output for memory tests.' })) };
const raw = JSON.stringify(response);
const output = mapGroupResponse(raw, input);
const translated = groups.map((g, i) => ({ ...g, translatedText: output[i]!.translatedText }));
const draftValue = { ownerId: 'synthetic-owner', projectId: 'synthetic-project', transcriptId: source.transcriptId, transcriptRevision: 1,
  sourceLanguage: 'vi', targetLanguage: 'en', sourceRevision: digestBefore, groupingVersion: 'phrase-candidates-v1', groups: translated, outputDigest: 'b'.repeat(64) };
let clock = 0;
const store = new GroupDraftStore(() => clock, 1000, 50);
let release!: () => void;
const gate = new Promise<void>(resolve => { release = resolve; });
const contexts = Array.from({ length: concurrency }, () => ({ source: structuredClone(source), groups: structuredClone(groups), input: structuredClone(input) }));
const promises = contexts.map((context, index) => store.preview(`key-${index}`, `signature-${index}`, async () => {
  await gate;
  assert.equal(context.source.segments.length, count);
  // Model response string, parse result and transformed groups all alive together.
  const localRaw = JSON.stringify(response);
  const parsed = mapGroupResponse(localRaw, context.input);
  return { ...draftValue, groups: context.groups.map((g, i) => ({ ...g, translatedText: parsed[i]!.translatedText })) };
}));
const completion = Promise.allSettled(promises);
await Promise.resolve();
const pending = sample();
release();
const results = await completion;
const completed = sample();
const responseClones = results.flatMap(result => result.status === 'fulfilled' ? [store.get(result.value.draftId, 'synthetic-owner', 'synthetic-project')] : []);
const delivered = sample();
const failures = results.flatMap(result => result.status === 'rejected' ? [String(result.reason?.code ?? 'UNKNOWN')] : []);
assert.ok(failures.every(code => code === 'TRANSLATION_DRAFT_TOO_LARGE'));
// Touch every response so retention is observable, not optimized away.
assert.ok(responseClones.every(draft => draft.groups.length === groups.length));
contexts.length = 0; responseClones.length = 0; results.length = 0; promises.length = 0;
clock = 1001;
// TTL is currently lazy. Access triggers pruning; no timer performs cleanup.
assert.throws(() => store.get('missing', 'synthetic-owner', 'synthetic-project'));
const afterPrune = sample();
console.log(JSON.stringify({ count, concurrency, expanded, groupCount: groups.length,
  snapshotBytes: bytes(source), compactBytes: bytes(compact), providerInputBytes: bytes(input), rawOutputBytes: Buffer.byteLength(raw),
  draftPayloadBytes: bytes(draftValue), v8SourceBytes: serialize(source).byteLength,
  snapshotGateWouldReject: bytes(source) > 96 * 1024, draftFailures: failures.length,
  baseline, pending, completed, delivered, afterPrune, planningMs: Math.round(planningMs), elapsedMs: Math.round(performance.now() - began),
  note: 'Retained-stage samples, not SDK/HTTP/transient peak or production capacity proof' }));
