import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { formatPreciseTimestamp } from '../src/features/transcript/transcriptPresentation.mjs';
import { TRANSCRIPT_SEGMENT_MAX_LENGTH, validateTranscriptSegmentText } from '../src/features/transcript/transcriptEditing.mjs';

const source = await readFile(new URL('../src/features/transcript/TranscriptSegmentEditor.tsx', import.meta.url), 'utf8');
const realRequire = createRequire(import.meta.url);
const exports = {};
runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, {
  exports,
  require: (name) => name.endsWith('transcriptPresentation.mjs') ? { formatPreciseTimestamp }
    : name.endsWith('transcriptEditing.mjs') ? { TRANSCRIPT_SEGMENT_MAX_LENGTH, validateTranscriptSegmentText }
      : realRequire(name),
});
const segment = { id: 'segment-test', sequence: 1, startTime: 6.7, endTime: 10.123, text: 'Thuyết minh tiếng Việt.\nGiữ nguyên lời nói <nguyên bản>.' };

test('compact transcript renders selectable read-only text, precise timestamps and accessible play', () => {
  const html = renderToStaticMarkup(React.createElement(exports.TranscriptSegmentEditor, { segment, onSeek: () => {}, canSeek: true, active: true }));
  assert.match(html, /00:06\.700 → 00:10\.123/);
  assert.match(html, /role="region" tabindex="0"/);
  assert.match(html, /Thuyết minh tiếng Việt\.\nGiữ nguyên lời nói &lt;nguyên bản&gt;\./);
  assert.match(html, /transcript-segment--active/);
  assert.match(html, /Đang phát/);
  assert.match(html, /aria-label="Phát phân đoạn 1 từ 00:06\.700"/);
  assert.equal((html.match(/<button/g) || []).length, 1);
  assert.match(html, /<svg[^>]*aria-hidden="true"/);
  assert.doesNotMatch(html, /<textarea|<input|contenteditable|Lưu thay đổi/);
});

test('play preserves exact start time and remains disabled until media is ready', () => {
  let sought;
  const tree = exports.TranscriptSegmentEditor({ segment, onSeek: (time) => { sought = time; }, canSeek: true });
  const button = tree.props.children[0].props.children[1].props.children[0];
  button.props.onClick();
  assert.equal(sought, 6.7);
  const html = renderToStaticMarkup(React.createElement(exports.TranscriptSegmentEditor, { segment, onSeek: () => {}, canSeek: false }));
  assert.match(html, /<button[^>]*disabled=""/);
  assert.doesNotMatch(html, /Đang phát|transcript-segment--active/);
});

test('compact CSS keeps natural text height, active cascade, wrapping and native player lifecycle', async () => {
  const css = await readFile(new URL('../src/styles/transcript.css', import.meta.url), 'utf8');
  const player = await readFile(new URL('../src/features/transcript/SourceMediaPlayer.tsx', import.meta.url), 'utf8');
  const textRule = css.match(/\.transcript-segment__text \{([^}]*)\}/)[1];
  assert.match(textRule, /white-space: pre-wrap/);
  assert.match(textRule, /user-select: text/);
  assert.match(textRule, /overflow-wrap: anywhere/);
  assert.doesNotMatch(textRule, /(?:^|;)\s*(?:min-|max-)?height:|overflow-y:/);
  assert.ok(css.indexOf('.transcript-segment--active {') > css.indexOf('.transcript-segment {'));
  assert.match(css, /min-height: 44px/);
  assert.match(css, /transcript-segment__header \{[^}]*flex-wrap: wrap/);
  assert.match(player, /<audio[^\r\n]* controls /);
  assert.match(player, /<video[^\r\n]* controls /);
  for (const event of ['onTimeUpdate', 'onSeeked', 'onPlay', 'onPause', 'onEnded']) assert.ok(player.includes(event));
  assert.doesNotMatch(player, /autoPlay/);
});
