import assert from 'node:assert/strict';
import test from 'node:test';
import { assertGeminiTranslationGranularity, GeminiTranslationError } from '../src/services/translation/gemini-translation.provider.js';

// Characterization, not a claim that the mixed-granularity safety gap is fixed.
test('legacy granularity audit: all-word sources remain rejected', () => {
  assert.throws(() => assertGeminiTranslationGranularity(['Tiểu', 'học'].map(text => ({ text }))),
    (error: unknown) => error instanceof GeminiTranslationError && error.code === 'TRANSLATION_MAPPING_FAILED');
});

test('legacy granularity audit: reproduces 1026 words plus one phrase bypass without network', () => {
  const segments = Array.from({ length: 1027 }, (_, index) => ({ text: index === 585 ? 'cụm từ' : 'từ' }));
  assert.doesNotThrow(() => assertGeminiTranslationGranularity(segments), 'KNOWN SAFETY GAP: one merged phrase bypasses the all-word test');
});

test('legacy granularity audit: phrase-level sources still pass the existing structural check', () => {
  assert.doesNotThrow(() => assertGeminiTranslationGranularity([{ text: 'Xin chào mọi người.' }, { text: 'Đây là bảo tàng.' }]));
});

test('legacy granularity audit: any-single-word replacement would reject a legitimate standalone reply', () => {
  const standaloneReply = [{ text: 'Bạn đã sẵn sàng chưa?' }, { text: 'Có.' }];
  assert.doesNotThrow(() => assertGeminiTranslationGranularity(standaloneReply));
  assert.ok(standaloneReply.some(segment => !/\s/u.test(segment.text.trim())));
  // Whitespace alone cannot prove semantic boundaries or annotation provenance.
});
