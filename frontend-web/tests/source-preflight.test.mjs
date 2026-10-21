import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { sourcePreflightView, sourceLimitMessage } from '../src/features/translation/sourcePreflight.mjs';
const good = { status: 'UNKNOWN', reasonCode: 'GROUP_TRANSLATION_DISABLED', sourceCapBytes: 98304, sourceSegmentLimit: 10000, generationAuthorized: false, sourceBytes: 1000, segmentCount: 10, transcript: 'PASS', groups: 'PASS', groupTranslationEnabled: false, persistedEnglish: 'PASS', activeEnglishJobs: 'PASS', drafts: { count: 0, visibility: 'PROCESS_LOCAL_ONLY', globalAbsence: 'UNKNOWN' } };
test('source below and exactly at cap report local checks only, never generation permission', () => {
  for (const bytes of [1000, 98304]) { const v = sourcePreflightView({ ...good, sourceBytes: bytes }); assert.equal(v.blocked, false); assert.equal(v.canGenerate, false); assert.equal(v.bytes, bytes); assert.match(v.message, /chưa được bật/); assert.match(v.notice, /process khác/); }
});
test('byte/segment overflow renders exact Vietnamese recovery copy and numeric limits only', () => {
  for (const patch of [{ sourceBytes: 98305 }, { reasonCode: 'BLOCKED_SOURCE_CAP', sourceBytes: 105958 }, { segmentCount: 10001 }, { segmentCount: null, segmentCountAtLeast: 10001 }]) {
    const view = sourcePreflightView({ ...good, ...patch }); assert.equal(view.message, sourceLimitMessage); assert.equal(view.blocked, true); assert.equal(view.canGenerate, false);
  }
});
test('not-ready, auth/ownership, GROUPS disabled, execution unapproved, and unexpected errors are distinct safe messages', () => {
  const messages = ['TOKEN_EXPIRED', 'PROJECT_NOT_FOUND', 'GROUP_TRANSLATION_DISABLED', 'CONTROLLED_EXECUTION_NOT_APPROVED', 'UNEXPECTED'].map(code => sourcePreflightView(undefined, code).message);
  assert.equal(new Set(messages).size, messages.length);
  assert.match(sourcePreflightView({ ...good, reasonCode: 'SOURCE_NOT_CURRENT', transcript: 'UNKNOWN' }).message, /chưa sẵn sàng/);
  assert.doesNotMatch(sourcePreflightView(undefined, 'private server error token=secret').message, /secret|private/);
  assert.equal(sourcePreflightView({ ...good, sourceCapBytes: 131072 }).blocked, true);
});
test('SSR renders Vietnamese limit error and size without transcript or sensitive error data', () => {
  const page = readFileSync(new URL('../src/features/translation/TranslationSourcePreflight.tsx', import.meta.url), 'utf8');
  const view = sourcePreflightView({ ...good, reasonCode: 'BLOCKED_SOURCE_CAP', sourceBytes: 105958 });
  let state = 0; const exports = {};
  const code = ts.transpileModule(page.replaceAll('import.meta.env.DEV', 'true'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  runInNewContext(code, { exports, require(name) {
    if (name === 'react') return { ...React, useState: () => [state++ === 0 ? view : false, () => {}], useEffect: () => {}, useRef: () => ({ current: null }) };
    if (name === 'react/jsx-runtime') return ReactJsx;
    if (name === 'react-router-dom') return { Link: ({ children, to }) => React.createElement('a', { href: to }, children) };
    if (name.endsWith('/Card')) return { Card: ({ children }) => React.createElement('section', null, children) };
    if (name.endsWith('/Button')) return { Button: ({ children, disabled }) => React.createElement('button', { disabled }, children) };
    if (name.endsWith('/api')) return { api: () => { throw new Error('NETWORK_FORBIDDEN'); }, ApiError: Error };
    if (name.endsWith('sourcePreflight.mjs')) return { sourcePreflightView };
    throw new Error(name);
  } });
  const html = renderToStaticMarkup(React.createElement(exports.TranslationSourcePreflight, { projectId: '1'.repeat(24) }, blocked => React.createElement('button', { disabled: blocked }, 'Dịch')));
  assert.ok(html.includes(sourceLimitMessage)); assert.match(html, /105\.958 bytes/); assert.match(html, /98\.304 bytes/); assert.match(html, /role="status"/); assert.match(html, /href="\/projects\/new"/); assert.match(html, /disabled="">Dịch/);
});
import * as ReactJsx from 'react/jsx-runtime';
test('preflight GET opts out of refresh; dev generation stays blocked and creation/upload paths are not invoked', () => {
  const source = readFileSync(new URL('../src/features/translation/TranslationSourcePreflight.tsx', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/pages/TranslationPage.tsx', import.meta.url), 'utf8');
  const groups = readFileSync(new URL('../src/features/translation/GroupTranslationWorkspace.tsx', import.meta.url), 'utf8');
  assert.match(source, /method: 'GET'/); assert.match(source, /\}, false\)/); assert.match(source, /if \(!import\.meta\.env\.DEV\)/); assert.match(source, /children\(true\)/);
  assert.match(page, /key=\{project.id \+ preferredTarget\} projectId=\{project.id\}/);
  assert.match(groups, /if \(blockGeneration \|\| !canMutate/);
  assert.doesNotMatch(source, /method: 'POST'|\.translate\(|\.preview\(|uploadService|projectRepository|console\.|permit/);
});
