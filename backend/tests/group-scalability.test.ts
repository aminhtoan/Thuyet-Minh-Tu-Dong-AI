import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { candidateGroups, validateSource } from '../src/services/translation/group-plan.js';
import { GroupDraftStore } from '../src/services/translation/group-draft-store.js';
import { GeminiGroupTranslationProvider, mapGroupResponse } from '../src/services/translation/gemini-group-translation.provider.js';

test('isolated synthetic lifecycle benchmark: size, concurrency, coverage and lossless digests', { timeout: 180_000 }, () => {
  const worker = fileURLToPath(new URL('./benchmarks/group-memory.worker.ts', import.meta.url));
  for (const size of [100, 1027, 2000, 5000]) {
    for (const concurrency of [1, 4, 16]) {
      const output = execFileSync(process.execPath, ['--expose-gc', '--import', 'tsx', worker, String(size), String(concurrency)], { encoding: 'utf8', timeout: 45_000, windowsHide: true });
      const row = JSON.parse(output.trim());
      assert.equal(row.count, size); assert.equal(row.concurrency, concurrency);
      assert.ok(row.compactBytes < row.snapshotBytes);
      assert.ok(row.elapsedMs >= 0);
      console.log('GROUP_SCALABILITY', JSON.stringify(row));
    }
  }
  // Same segment count, very different text/output sizes: counts are not budgets.
  const expanded = JSON.parse(execFileSync(process.execPath, ['--expose-gc', '--import', 'tsx', worker, '100', '4', 'expanded'], { encoding: 'utf8', timeout: 45_000, windowsHide: true }).trim());
  assert.ok(expanded.snapshotGateWouldReject);
  assert.equal(expanded.draftFailures, 4);
  console.log('GROUP_SCALABILITY', JSON.stringify(expanded));
});

test('over-limit source count rejected before grouping', () => {
  const source = { transcriptId: 'a'.repeat(24), fullText: 'synthetic', languageCode: 'vi',
    segments: Array.from({ length: 10001 }, (_, i) => ({ id: (i + 1).toString(16).padStart(24, '0'), sequence: i + 1, text: 'từ', startTime: i, endTime: i + 1 })) };
  assert.throws(() => candidateGroups(source), /TRANSLATION_MAPPING_FAILED|Các cụm/);
  assert.doesNotThrow(() => validateSource({ ...source, segments: source.segments.slice(0, 10000) }));
});

test('provider schema group/text output boundaries are enforced independently from token limits', () => {
  const input = { fullText: 'synthetic', sourceLanguage: 'vi', targetLanguage: 'en', groups: [{ groupId: 'one', sourceText: 'synthetic' }] };
  const output = (length: number) => JSON.stringify({ outcome: 'translated', groups: [{ groupId: 'one', translatedText: 'x'.repeat(length) }] });
  assert.equal(mapGroupResponse(output(32000), input)[0]!.translatedText.length, 32000);
  assert.throws(() => mapGroupResponse(output(32001), input), /TRANSLATION_INVALID_RESPONSE/);
  const groups = Array.from({ length: 1001 }, (_, i) => ({ groupId: String(i), translatedText: 'synthetic' }));
  assert.throws(() => mapGroupResponse(JSON.stringify({ outcome: 'translated', groups }), { ...input, groups: groups.map(g => ({ groupId: g.groupId, sourceText: 'synthetic' })) }), /TRANSLATION_INVALID_RESPONSE/);
});

test('test-only aggregate reservation specification: admission, state transfer and release', () => {
  // Byte units are arbitrary test credits, NOT proposed production thresholds.
  // Runtime does not use this ledger. Real reservations must be made before
  // loading source data, not merely before calling the provider.
  class Ledger {
    used = 0;
    entries = new Map<string, { bytes: number; phase: 'pending' | 'draft' | 'response' }>();
    constructor(readonly processLimit: number, readonly requestLimit: number) {}
    reserve(id: string, bytes: number) {
      if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > this.requestLimit || this.entries.has(id) || this.used + bytes > this.processLimit) return false;
      this.entries.set(id, { bytes, phase: 'pending' }); this.used += bytes; return true;
    }
    transfer(id: string, bytes: number, phase: 'draft' | 'response') {
      const previous = this.entries.get(id);
      if (!previous || bytes < 0 || bytes > previous.bytes) return false;
      this.used -= previous.bytes - bytes; this.entries.set(id, { bytes, phase }); return true;
    }
    release(id: string) { const entry = this.entries.get(id); if (entry) { this.used -= entry.bytes; this.entries.delete(id); } }
  }
  const ledger = new Ledger(1000, 600);
  let providerCalls = 0;
  const admit = (id: string, bytes: number) => { if (!ledger.reserve(id, bytes)) return false; providerCalls++; return true; };
  assert.ok(admit('first', 600));
  assert.equal(admit('too-large', 601), false);
  assert.equal(admit('second', 500), false);
  assert.equal(admit('first', 600), false, 'duplicate must join the existing request, not allocate or regenerate');
  assert.equal(providerCalls, 1);
  assert.equal(ledger.transfer('first', 700, 'draft'), false, 'pre-reserved response/draft ceiling cannot grow');
  assert.ok(ledger.transfer('first', 300, 'draft')); assert.equal(ledger.used, 300);
  assert.ok(admit('second', 600)); assert.equal(ledger.used, 900);
  // Abort/timeout request alone does not free buffers while transport still owns them.
  assert.equal(ledger.used, 900);
  ledger.release('second'); // transport has settled and references are released
  assert.equal(ledger.used, 300);
  assert.ok(ledger.reserve('response-copy', 150));
  assert.ok(ledger.transfer('response-copy', 150, 'response'));
  assert.equal(ledger.used, 450, 'cached draft and in-flight response copies both count');
  ledger.release('response-copy'); // HTTP sent/closed; cached draft still owns its reservation
  assert.equal(ledger.used, 300);
  ledger.release('first'); // draft TTL cleanup
  ledger.release('first'); assert.equal(ledger.used, 0, 'idempotent cleanup');
  assert.ok(admit('failure', 600)); ledger.release('failure'); assert.equal(ledger.used, 0);
  assert.ok(admit('expired-draft', 500)); assert.ok(ledger.transfer('expired-draft', 200, 'draft'));
  ledger.release('expired-draft'); assert.equal(ledger.used, 0);
});

test('mock MAX_TOKENS provider output is rejected, not retained as a partial draft', async () => {
  const previous = { key: process.env.GEMINI_API_KEY, provider: process.env.TRANSLATION_PROVIDER };
  process.env.GEMINI_API_KEY = 'synthetic-not-real'; process.env.TRANSLATION_PROVIDER = 'gemini';
  let generated = 0;
  const provider = new GeminiGroupTranslationProvider({
    async metadata() { return { supportedActions: ['generateContent'] }; },
    async generate() { generated++; return { text: '{"outcome":"translated","groups":[]}', finishReason: 'MAX_TOKENS' }; },
  });
  const store = new GroupDraftStore();
  const create = async () => { await provider.translate({ fullText: 'synthetic', sourceLanguage: 'vi', targetLanguage: 'en', groups: [{ groupId: 'group', sourceText: 'synthetic' }] }); throw new Error('must reject'); };
  try {
    await assert.rejects(store.preview('output', 'signature', create), /TRANSLATION_INVALID_RESPONSE/);
    await assert.rejects(store.preview('output', 'signature', create), /TRANSLATION_INVALID_RESPONSE/);
    assert.equal(generated, 1, 'failed result is not automatically retried');
  } finally {
    if (previous.key === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous.key;
    if (previous.provider === undefined) delete process.env.TRANSLATION_PROVIDER; else process.env.TRANSLATION_PROVIDER = previous.provider;
  }
});
