import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { buildTranslationPresentation, mapTranslationSegments } from '../src/features/translation/translationPresentation.mjs';
import { formatPreciseTimestamp } from '../src/features/transcript/transcriptPresentation.mjs';

const sources = Array.from({ length: 21 }, (_, index) => ({ id: `source-${index}`, backendSegmentId: `db-${index}`, sequence: index + 1, startTime: index * .3, endTime: index * .3 + .2, text: `từ${index}${index === 10 || index === 20 ? '.' : ''}` }));
const translations = mapTranslationSegments('translation', sources.map((_, index) => ({ index, sourceSegmentId: `db-${index}`, text: `word${index}` })), sources);

test('21 original words are grouped identically to Transcript without mutation or invented translation', () => {
  const before = JSON.stringify(sources);
  const result = buildTranslationPresentation(sources);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows.map(row => row.source.text).join(' '), sources.map(source => source.text).join(' '));
  assert.ok(result.rows.every(row => !row.translation));
  assert.equal(result.rows[0].source.startTime, sources[0].startTime);
  assert.equal(result.rows[0].source.endTime, sources[10].endTime);
  assert.equal(JSON.stringify(sources), before);
});

test('real translations group by verified source membership, not provider array order', () => {
  const before = JSON.stringify(translations);
  const result = buildTranslationPresentation(sources, [...translations].reverse());
  assert.equal(result.notice, null);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows.map(row => row.translation.translatedText).join(' '), translations.map(segment => segment.translatedText).join(' '));
  assert.ok(result.rows.every(row => row.source.startTime === row.translation.startTime && row.source.endTime === row.translation.endTime));
  assert.equal(JSON.stringify(translations), before);
});

test('missing, duplicate, unrelated, wrong sequence and wrong timestamp mappings never group unsafely', () => {
  for (const invalid of [translations.slice(1), [...translations, translations[0]], translations.map((segment, index) => index ? segment : { ...segment, transcriptSegmentId: 'other' }), translations.map((segment, index) => index ? segment : { ...segment, sequence: 999 }), translations.map((segment, index) => index ? segment : { ...segment, endTime: 99 })]) {
    const result = buildTranslationPresentation(sources, invalid);
    assert.equal(result.rows.length, 21);
    assert.match(result.notice, /Chưa thể nhóm/);
    assert.ok(!result.rows[0].translation);
  }
});

test('API mapping uses source sequence, rejects invalid indices and never invents zero timestamps', () => {
  assert.equal(mapTranslationSegments('t', [{ index: 0, sourceSegmentId: 'db-0', text: 'hello' }], [...sources].reverse())[0].transcriptSegmentId, 'source-0');
  for (const index of [-1, 30, .5]) assert.throws(() => mapTranslationSegments('t', [{ index, text: 'hello' }], sources), /không khớp/);
});

test('actual API sourceSegmentId is required; stale or absent backend IDs are never paired by index alone', () => {
  for (const sourceSegmentId of ['stale-db-id', undefined]) {
    const mapped = mapTranslationSegments('t', [{ index: 0, sourceSegmentId, text: 'old translation' }], sources);
    assert.equal(mapped[0].transcriptSegmentId, '');
    const result = buildTranslationPresentation(sources, mapped);
    assert.equal(result.rows.length, 21);
    assert.ok(result.rows.every(row => !row.translation));
    assert.match(result.notice, /Chưa thể nhóm/);
  }
});

const component = await readFile(new URL('../src/features/translation/TranslationSegmentRow.tsx', import.meta.url), 'utf8');
const exports = {};
const realRequire = createRequire(import.meta.url);
runInNewContext(ts.transpileModule(component, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: name => name.endsWith('transcriptPresentation.mjs') ? { formatPreciseTimestamp } : realRequire(name) });

test('rendered comparison keeps precise timestamps, waiting state and read-only translated text', () => {
  const source = { ...sources[0], startTime: 6.7, endTime: 9.123 };
  const waiting = renderToStaticMarkup(React.createElement(exports.TranslationSegmentRow, { source }));
  assert.match(waiting, /00:06\.700 → 00:09\.123/);
  assert.match(waiting, /Bản gốc/); assert.match(waiting, /Bản dịch/);
  assert.match(waiting, /Chưa có bản dịch/);
  assert.doesNotMatch(waiting, /word0/);
  const ready = renderToStaticMarkup(React.createElement(exports.TranslationSegmentRow, { source, translation: translations[0] }));
  assert.match(ready, /word0/);
  assert.match(ready, /role="region" tabindex="0"/);
  assert.doesNotMatch(ready, /<textarea|<input|contenteditable/);
});

test('invalid source timeline is not repaired; responsive UI retains language and translate handlers', async () => {
  assert.match(buildTranslationPresentation([{ ...sources[0], endTime: -1 }]).notice, /không hợp lệ/);
  const page = await readFile(new URL('../src/pages/TranslationPage.tsx', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/styles/translation.css', import.meta.url), 'utf8');
  assert.match(page, /if \(!blockGeneration\) void editor.translate\(\)/);
  assert.match(page, /editor.changeTarget\(event.target.value\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /overflow-wrap: anywhere/);
});
