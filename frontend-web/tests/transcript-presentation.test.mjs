import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { groupTranscriptSegments, formatPreciseTimestamp } from '../src/features/transcript/transcriptPresentation.mjs';
const words = (texts) => texts.map((text, index) => ({ id: `word-${index}`, sequence: index + 1, text, startTime: index * 0.3, endTime: index * 0.3 + 0.2 }));
test('word grouping keeps exact outer offsets, order and immutable source', () => {
  const source = words(['Xin', 'chào', 'tiếng', 'Việt']); const before = JSON.stringify(source);
  const result = groupTranscriptSegments(source);
  assert.equal(result.length, 1); assert.equal(result[0].text, 'Xin chào tiếng Việt'); assert.equal(result[0].startTime, source[0].startTime); assert.equal(result[0].endTime, source.at(-1).endTime);
  assert.equal(JSON.stringify(source), before); assert.notEqual(result[0], source[0]);
});
test('sentence punctuation and standalone punctuation preserve all words', () => {
  const result = groupTranscriptSegments(words(['Xin', 'chào.', 'Hôm', 'nay', 'tốt', '!']));
  assert.deepEqual(result.map(s => s.text), ['Xin chào.', 'Hôm nay tốt!']); assert.ok(result[0].endTime <= result[1].startTime);
});
test('pause boundary splits without inventing timing or inserting silence', () => {
  const source = words(['Xin', 'chào', 'bạn']); source[2].startTime = 2; source[2].endTime = 2.5;
  const result = groupTranscriptSegments(source); assert.equal(result.length, 2); assert.equal(result[0].endTime, source[1].endTime); assert.equal(result[1].startTime, 2);
});
test('existing phrase segments stay separate; empty transcript stays empty', () => {
  const source = words(['Xin chào.', 'Đây là bản ghi.']); assert.deepEqual(groupTranscriptSegments(source), source); assert.deepEqual(groupTranscriptSegments([]), []);
});
test('long word runs split at safe bounds with no dropped or duplicate words', () => {
  const source = words(Array.from({ length: 40 }, (_, i) => `từ${i}`)); const result = groupTranscriptSegments(source);
  assert.equal(result.length, 3); assert.deepEqual(result.flatMap(s => s.text.split(' ')), source.map(s => s.text));
  for (let i = 1; i < result.length; i++) assert.ok(result[i - 1].endTime <= result[i].startTime);
});
test('invalid timestamps fail closed without sorting or modifying input', () => {
  for (const change of [{ startTime: -1 }, { endTime: 0 }, { endTime: NaN }]) assert.throws(() => groupTranscriptSegments([{ ...words(['Xin'])[0], ...change }]));
  const source = words(['Xin', 'chào']); source[1].startTime = 0.1; const before = JSON.stringify(source); assert.throws(() => groupTranscriptSegments(source)); assert.equal(JSON.stringify(source), before);
});
test('subsecond display uses minutes:seconds.milliseconds instead of integer truncation', () => {
  assert.equal(formatPreciseTimestamp(0.12), '00:00.120'); assert.equal(formatPreciseTimestamp(0.48), '00:00.480');
  assert.equal(formatPreciseTimestamp(61.234), '01:01.234'); assert.equal(formatPreciseTimestamp(59.9999), '01:00.000'); assert.equal(formatPreciseTimestamp(3601.5), '60:01.500'); assert.equal(formatPreciseTimestamp(NaN), '—');
});
test('grouped view never replaces editor draft or changes translation timestamp helper', async () => {
  const page = await readFile(new URL('../src/pages/TranscriptPage.tsx', import.meta.url), 'utf8');
  const row = await readFile(new URL('../src/features/transcript/TranscriptSegmentEditor.tsx', import.meta.url), 'utf8');
  const translation = await readFile(new URL('../src/features/translation/TranslationSegmentRow.tsx', import.meta.url), 'utf8');
  assert.match(page, /displaySegments\.map/); assert.doesNotMatch(page, /setDraft|save.*displaySegments|generate.*displaySegments/); assert.match(row, /formatPreciseTimestamp/); assert.match(translation, /formatTimestamp.*transcriptUtils/);
});
