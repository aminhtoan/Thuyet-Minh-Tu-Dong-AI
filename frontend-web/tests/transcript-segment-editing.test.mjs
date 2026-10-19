import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TRANSCRIPT_SEGMENT_MAX_LENGTH, hasConfirmedDownstreamArtifact, transcriptEditAccess, validateTranscriptSegmentText } from '../src/features/transcript/transcriptEditing.mjs';
import { formatPreciseTimestamp } from '../src/features/transcript/transcriptPresentation.mjs';

const readyWorkflow = { step: 'TRANSLATION', state: 'READY', canResume: true, processing: null, artifact: { narrationReady: false, resultReady: false } };

test('segment validation trims Unicode, rejects empty/oversize and detects no-op', () => {
  assert.deepEqual(validateTranscriptSegmentText('  tiếng Việt có dấu  ', 'cũ'), { valid: true, changed: true, text: 'tiếng Việt có dấu', error: null });
  assert.equal(validateTranscriptSegmentText('   ', 'cũ').valid, false);
  assert.equal(validateTranscriptSegmentText('giữ nguyên', 'giữ nguyên').changed, false);
  assert.equal(validateTranscriptSegmentText('x'.repeat(TRANSCRIPT_SEGMENT_MAX_LENGTH + 1), 'cũ').valid, false);
});

test('runtime and workflow editing policy fails closed', () => {
  assert.equal(transcriptEditAccess(false, readyWorkflow, 3, true).allowed, false);
  assert.equal(transcriptEditAccess(true, undefined, 3, true).allowed, false);
  assert.equal(transcriptEditAccess(true, { ...readyWorkflow, state: 'BLOCKED' }, 3, true).allowed, false);
  assert.equal(transcriptEditAccess(true, { ...readyWorkflow, step: 'TRANSCRIPT', state: 'PROCESSING', processing: { type: 'TRANSCRIPTION' } }, 3, true).allowed, false);
  assert.equal(transcriptEditAccess(true, readyWorkflow, null, true).allowed, false);
  assert.equal(transcriptEditAccess(true, readyWorkflow, 3, false).allowed, false);
  assert.equal(transcriptEditAccess(true, readyWorkflow, 3, true).allowed, true);
});

test('downstream notice only uses confirmed workflow evidence', () => {
  assert.equal(hasConfirmedDownstreamArtifact(readyWorkflow), false);
  assert.equal(hasConfirmedDownstreamArtifact({ ...readyWorkflow, step: 'VOICE' }), true);
  assert.equal(hasConfirmedDownstreamArtifact({ ...readyWorkflow, artifact: { narrationReady: true, resultReady: false } }), true);
});

test('editor markup keeps immutable timing and provides accessible controlled editing', async () => {
  const source = await readFile(new URL('../src/features/transcript/TranscriptSegmentEditor.tsx', import.meta.url), 'utf8');
  const realRequire = createRequire(import.meta.url); const exports = {};
  runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports,
    require: (name) => name.endsWith('transcriptPresentation.mjs') ? { formatPreciseTimestamp }
      : name.endsWith('transcriptEditing.mjs') ? { TRANSCRIPT_SEGMENT_MAX_LENGTH, validateTranscriptSegmentText }
        : realRequire(name),
  });
  const segment = { id: 'segment-1', backendSegmentId: 'backend-1', sequence: 1, startTime: 1.25, endTime: 2.75, text: 'Xin chào.' };
  const html = renderToStaticMarkup(React.createElement(exports.TranscriptSegmentEditor, { segment, editing: true, showEditControl: true, canEdit: true, draftText: 'Xin chào bạn.', editError: 'Lỗi thử nghiệm' }));
  assert.match(html, /<textarea[^>]*maxLength="4000"/);
  assert.match(html, /Nội dung phân đoạn 1/);
  assert.match(html, /13\/4000 ký tự/);
  assert.match(html, /Lưu thay đổi/); assert.match(html, />Hủy</);
  assert.match(html, /00:01\.250 → 00:02\.750/);
  assert.doesNotMatch(html, /input[^>]*(startTime|endTime|sequence)/);
});

test('page and service use the existing CAS endpoint without enabling runtime writes by default', async () => {
  const [page, service, gate, env] = await Promise.all([
    readFile(new URL('../src/pages/TranscriptPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/features/transcript/transcriptService.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/config/transcriptEditing.ts', import.meta.url), 'utf8'),
    readFile(new URL('../.env.example', import.meta.url), 'utf8'),
  ]);
  assert.match(service, /\/transcript\/segments\/\$\{segmentId\}/);
  assert.match(service, /expectedRevision/);
  assert.match(page, /TRANSCRIPT_REVISION_CONFLICT/);
  assert.match(page, /saveLockRef/);
  assert.match(page, /editor\.refreshTranscript\(\)/);
  assert.match(page, /onProjectReload/);
  assert.match(gate, /import\.meta\.env\.DEV/);
  assert.match(env, /VITE_TRANSCRIPT_SEGMENT_EDIT_ENABLED=false/);
  assert.doesNotMatch(page, /generateTranscript\([^)]*saveSegment/);
});
