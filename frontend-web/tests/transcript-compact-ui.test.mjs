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
  assert.match(html, /<span>Phát<\/span>/);
  assert.doesNotMatch(html, /Phát từ 00:06/);
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

test('editing states expose unsaved and saving feedback without submitting automatically', () => {
  const render = (props) => renderToStaticMarkup(React.createElement(exports.TranscriptSegmentEditor, { segment, editing: true, draftText: segment.text, ...props }));
  assert.match(render({}), /Đang chỉnh sửa · Chưa có thay đổi/);
  const changed = render({ draftText: 'Nội dung mới.' });
  assert.match(changed, /transcript-segment--editing/);
  assert.match(changed, /Nội dung chưa được lưu/);
  assert.match(changed, /aria-describedby="transcript-segment-segment-test-counter transcript-segment-segment-test-edit-status"/);
  const saving = render({ draftText: 'Nội dung mới.', saving: true });
  assert.match(saving, /aria-busy="true"/);
  assert.match(saving, /Đang lưu phân đoạn/);
  assert.equal((saving.match(/disabled=""/g) || []).length, 3);
});

test('invalid text and conflict errors stay linked, preserving entered content', () => {
  const empty = renderToStaticMarkup(React.createElement(exports.TranscriptSegmentEditor, { segment, editing: true, draftText: '   ' }));
  assert.match(empty, /aria-invalid="true"/);
  assert.match(empty, /Nội dung phân đoạn không được để trống/);
  assert.match(empty, /edit-error/);
  const conflict = renderToStaticMarkup(React.createElement(exports.TranscriptSegmentEditor, { segment, editing: true, draftText: 'Giữ nội dung nhập.', editError: 'Bản ghi đã thay đổi ở phiên khác.' }));
  assert.match(conflict, /Giữ nội dung nhập/);
  assert.match(conflict, /role="alert"/);
  assert.match(conflict, /Bản ghi đã thay đổi ở phiên khác/);
});

test('transcript list uses page scrolling and retains responsive and reduced-motion guards', async () => {
  const css = await readFile(new URL('../src/styles/transcript.css', import.meta.url), 'utf8');
  const list = css.match(/\.transcript-segment-list \{([^}]*)\}/)[1];
  assert.doesNotMatch(list, /max-height|overflow-y/);
  assert.match(css, /max-width: 900px/);
  assert.match(css, /max-width: 600px/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /transcript-segment__editor-actions \.button:focus-visible/);
});

test('transcript heading is consolidated while workflow and continue guards are unchanged', async () => {
  const page = await readFile(new URL('../src/pages/TranscriptPage.tsx', import.meta.url), 'utf8');
  const workspace = page.slice(page.indexOf('function TranscriptWorkspace'));
  assert.equal((workspace.match(/<PageHeader /g) || []).length, 1);
  assert.match(workspace, /description=\{`\$\{project.name\} · Ngôn ngữ nguồn:/);
  assert.doesNotMatch(workspace, /KHÔNG GIAN DỰ ÁN|className="transcript-intro"|Bản ghi được lưu trên máy chủ/);
  assert.match(workspace, /projectStatusLabels\[stage\]/);
  assert.match(workspace, /<WorkflowSteps workflow=\{project.workflow\} projectId=\{project.id\} pageStep="TRANSCRIPT" \/>/);
  assert.match(workspace, /const canContinue = Boolean\(sourceConfirmed && editor.draft && !editor.hasInvalidSegments && editor.status === 'SAVED'\)/);
  assert.match(workspace, /<Button variant="primary" disabled=\{!canContinue\} onClick=\{\(\) => navigate\(`\/projects\/\$\{project.id\}\/translation`\)\}>Tiếp tục đến bản dịch/);
  assert.match(workspace, /mediaState === 'READY' \? project.mediaName/);
  assert.match(workspace, /formatFileSize\(project.mediaSize\)/);
});

test('compact spacing is transcript-scoped, video frame is bounded and touch targets are preserved', async () => {
  const css = await readFile(new URL('../src/styles/transcript.css', import.meta.url), 'utf8');
  assert.match(css, /\.transcript-media \.source-player__video-frame \{[^}]*width: 100%;[^}]*aspect-ratio: 16 \/ 9; max-height: 360px/);
  assert.match(css, /\.source-player__video-frame > \.source-player__video \{[^}]*width: 100%; height: 100%; object-fit: contain/);
  assert.match(css, /\.transcript-layout > :is\(\.transcript-media, \.transcript-editor\) \{ align-self: start; \}/);
  assert.match(css, /\.transcript-segment-list \{[^}]*gap: 10px/);
  assert.match(css, /\.transcript-segment \{[^}]*padding: 10px/);
  assert.match(css, /\.transcript-segment__seek \{[^}]*min-height: 36px/);
  assert.match(css, /@media \(pointer: coarse\) \{ \.transcript-segment__seek \{ min-height: 44px/);
  assert.match(css, /\.transcript-actions__next \{[^}]*align-items: flex-end/);
  assert.match(css, /\.transcript-layout \{[^}]*grid-template-columns: minmax\(0, 2fr\) minmax\(0, 3fr\)/);
  assert.doesNotMatch(css, /word-break: break-all|overflow-x: hidden/);
});

test('only transcript opts into the bounded frame; video controls and callbacks are unchanged', async () => {
  const source = await readFile(new URL('../src/features/transcript/SourceMediaPlayer.tsx', import.meta.url), 'utf8');
  const playerExports = {};
  let ready, time;
  const ref = { current: { currentTime: 6.7, paused: false } };
  runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports: playerExports,
    require: name => name === 'react' ? {
      useState: initial => [initial === null ? 'blob:test-only' : initial, () => {}],
      useRef: initial => ({ current: initial }), useCallback: fn => fn, useEffect: () => {},
    } : name.endsWith('/api') ? { apiBlob: () => { throw new Error('NO_NETWORK_IN_UI_TEST'); } }
      : name.endsWith('/Button') ? { Button: 'button' }
        : name.endsWith('/Icon') ? { Icon: 'svg' }
          : name.endsWith('sourcePlayback.mjs') ? { sourceMediaInitialState: () => ({ status: 'READY', error: null }) }
            : realRequire(name),
  });
  const find = (node, type) => Array.isArray(node) ? node.map(n => find(n, type)).find(Boolean)
    : node && typeof node === 'object' ? node.type === type ? node : find(node.props?.children, type) : undefined;
  const props = { projectId: 'fixture-only', mediaType: 'VIDEO', mediaSize: 1024, metadataState: 'READY', playerRef: ref, onTimeChange: v => { time = v; }, onReadyChange: v => { ready = v; } };
  const framed = playerExports.SourceMediaPlayer({ ...props, framedVideo: true });
  const html = renderToStaticMarkup(framed);
  assert.match(html, /class="source-player__video-frame"><video/);
  const video = find(framed, 'video');
  assert.equal(video.props.controls, true); assert.equal(video.props.autoPlay, undefined);
  video.props.onLoadedMetadata(); video.props.onSeeked();
  assert.equal(ready, true); assert.equal(time, 6.7);
  video.props.onError();
  assert.equal(ready, false);
  assert.doesNotMatch(renderToStaticMarkup(playerExports.SourceMediaPlayer(props)), /source-player__video-frame/);
  assert.doesNotMatch(renderToStaticMarkup(playerExports.SourceMediaPlayer({ ...props, mediaType: 'AUDIO', framedVideo: true })), /source-player__video-frame/);
  const page = await readFile(new URL('../src/pages/TranscriptPage.tsx', import.meta.url), 'utf8');
  assert.match(page, /onReadyChange=\{setMediaReady\} framedVideo/);
  const detail = await readFile(new URL('../src/pages/ProjectDetailPage.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(detail, /framedVideo/);
});
