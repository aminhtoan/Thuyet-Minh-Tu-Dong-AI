import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogMode, GEMINI_VOICE_CATALOG, hasVoiceUniqueIndex, planGeminiVoices, verifyGeminiTarget, voiceInsertOperation } from '../src/scripts/gemini-voice-catalog-data.js';

test('fixed catalog and explicit apply; wrong targets denied', () => {
  assert.deepEqual(GEMINI_VOICE_CATALOG.map(v => [v.providerVoiceId, v.gender]), [['Kore', 'FEMALE'], ['Fenrir', 'MALE']]);
  assert.ok(GEMINI_VOICE_CATALOG.every(v => v.provider === 'gemini' && v.isActive));
  assert.equal(catalogMode([]), 'dry-run');
  assert.equal(catalogMode(['--apply']), 'apply');
  assert.throws(() => catalogMode(['--apply', '--dry-run']));
  assert.throws(() => verifyGeminiTarget('mongodb://localhost/test', 'development', 'gemini'));
  verifyGeminiTarget('mongodb+srv://cluster.example.mongodb.net/multilingual_ai_narration', 'development', 'gemini');
});
test('unique index must cover the exact key without partial filtering', () => {
  const index = { unique: true, key: { provider: 1, providerVoiceId: 1, languageId: 1 } };
  assert.ok(hasVoiceUniqueIndex([index]));
  assert.equal(hasVoiceUniqueIndex([{ ...index, unique: false }]), false);
  assert.equal(hasVoiceUniqueIndex([{ ...index, partialFilterExpression: { isActive: true } }]), false);
});
test('insert-only simulation is idempotent and preserves OpenAI documents', () => {
  const rows = [{ languageId: 'en-id', provider: 'openai', providerVoiceId: 'coral', name: 'Coral', gender: 'FEMALE', isActive: true }];
  const original = structuredClone(rows);
  const first = planGeminiVoices(rows, 'en-id');
  assert.equal(first.planned.length, 2);
  for (const v of first.planned) {
    const op = voiceInsertOperation(v, 'en-id', new Date());
    assert.deepEqual(Object.keys(op.update), ['$setOnInsert']);
    assert.deepEqual(op.filter, { provider: 'gemini', providerVoiceId: v.providerVoiceId, languageId: 'en-id' });
    rows.push(op.update.$setOnInsert as typeof rows[number]);
  }
  const second = planGeminiVoices(rows, 'en-id');
  assert.equal(second.planned.length, 0);
  assert.equal(second.existing, 2);
  assert.deepEqual(rows.filter(v => v.provider === 'openai'), original);
});
test('inactive, case variants, metadata mismatch and duplicates block', () => {
  const voice = { ...GEMINI_VOICE_CATALOG[0], languageId: 'en-id' };
  for (const rows of [[{ ...voice, isActive: false }], [{ ...voice, providerVoiceId: 'kore' }], [{ ...voice, gender: 'MALE' }], [voice, voice]]) {
    assert.deepEqual(planGeminiVoices(rows, 'en-id').conflicts, ['Kore']);
  }
});
