import assert from 'node:assert/strict';
import { serialize } from 'node:v8';
import test from 'node:test';
import { candidateGroups, revision, type SourceSnapshot } from '../src/services/translation/group-plan.js';

// Synthetic data only; no model, dotenv, provider or database imports.
test('1027-source/74-group budget evidence preserves complete snapshot and existing digest', () => {
  const segments = Array.from({ length: 1027 }, (_, i) => ({ id: (i + 1).toString(16).padStart(24, '0'), sequence: i + 1,
    text: `từ${i % 10}${(i + 1) % 14 === 0 ? '.' : ''}`, startTime: i / 4, endTime: (i + 1) / 4 }));
  const source: SourceSnapshot = { transcriptId: 'a'.repeat(24), transcriptRevision: 1, languageCode: 'vi', fullText: segments.map(s => s.text).join(' '), segments };
  const groups = candidateGroups(source);
  assert.equal(groups.length, 74);
  assert.deepEqual(groups.flatMap(g => g.sourceSegmentIds), segments.map(s => s.id));
  const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value));
  assert.ok(bytes(source) > 96 * 1024, 'existing gate still rejects a representative 1027-segment snapshot');
  // Design experiment only: no runtime budget/representation changes are enabled.
  const compact = { ...source, segments: segments.map(s => [s.id, s.sequence, s.text, s.startTime, s.endTime] as const) };
  const restored = { ...compact, segments: compact.segments.map(([id, sequence, text, startTime, endTime]) => ({ id, sequence, text, startTime, endTime })) };
  assert.deepEqual(restored, source);
  assert.equal(revision(restored), revision(source));
  const providerInput = { fullText: source.fullText, sourceLanguage: 'vi', targetLanguage: 'en', groups: groups.map(g => ({ groupId: g.groupId, sourceText: g.sourceText })) };
  const before = process.memoryUsage();
  const retained = Array.from({ length: 50 }, () => structuredClone(source));
  const after = process.memoryUsage();
  assert.ok(retained.every(s => revision(s) === revision(source)));
  console.log('SYNTHETIC_BUDGET_MEASUREMENT', {
    snapshotBytes: bytes(source), compactBytes: bytes(compact), providerInputBytes: bytes(providerInput),
    v8SnapshotBytes: serialize(source).byteLength, retainedCount: retained.length,
    heapUsedBefore: before.heapUsed, heapUsedAfter: after.heapUsed, rssBefore: before.rss, rssAfter: after.rss,
  });
  // Heap/RSS are real observations, not deterministic limits: allocator/GC noise
  // must not be mistaken for sufficient evidence to raise a production cap.
});
