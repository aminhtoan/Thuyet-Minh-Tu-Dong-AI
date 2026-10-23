import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import * as ReactJsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { simplePreflightView } from '../src/features/translation/simplePreflightView.mjs';
const good = { contract: 'CUSTOMER_SIMPLE_PREFLIGHT_V1', status: 'BLOCKED', generationAuthorized: false, transcript: 'PASS', revision: 1, sourceDigest: 'a'.repeat(64), sourceBytes: 500, inputBytes: 350, groups: 2, segments: 3, maxGroupBytes: 55, simpleLimits: 'PASS', orderedCoverage: '3/3', attempt: 'CLEAR', persistedEnglish: 'CLEAR', activeJobs: 'CLEAR', drafts: { count: 0 }, runtime: { method: 'GEMINI_SIMPLE_V1', customerEnabled: false, thinkingDefault: true }, limits: { groups: 32, groupBytes: 2000, inputBytes: 12000, sourceBytes: 98304, segments: 10000 } };

test('valid source displays safe counts/short digest; missing quota/deployment never READY', () => {
  const view = simplePreflightView(good);
  assert.equal(view.status, 'BLOCKED'); assert.equal(view.canGenerate, false);
  const rows = Object.fromEntries(view.rows);
  assert.equal(rows['Quota còn lại'], 'NOT VERIFIED'); assert.equal(rows['Deployment identity'], 'NOT VERIFIED');
  assert.equal(rows['Input JSON UTF-8 bytes'], '350 / 12.000'); assert.equal(rows['Source digest'], 'aaaaaaaaaaaa…aaaaaaaa');
  assert.equal(rows['Draft ở process khác'], 'UNKNOWN');
});
test('oversize, uncertain attempt, unknown runtime and forged READY fail closed', () => {
  assert.match(simplePreflightView({ ...good, simpleLimits: 'FAIL' }).message, /vượt giới hạn/);
  const uncertain = simplePreflightView({ ...good, attempt: 'BLOCKED', attemptStatus: 'UNCERTAIN' });
  assert.match(Object.fromEntries(uncertain.rows).Attempt, /UNCERTAIN/);
  assert.match(uncertain.message, /Không gửi lại/);
  assert.equal(Object.fromEntries(simplePreflightView({ ...good, runtime: {} }).rows)['Backend runtime method'], 'NOT VERIFIED');
  assert.equal(simplePreflightView({ ...good, status: 'READY', generationAuthorized: true }).status, 'BLOCKED');
  assert.doesNotMatch(simplePreflightView(undefined, 'SECRET_KEY').message, /SECRET_KEY/);
});
test('read-only user click only; no refresh/generation; production hides component; auth guard remains first', () => {
  const code = readFileSync(new URL('../src/features/translation/CustomerSimplePreflight.tsx', import.meta.url), 'utf8');
  assert.match(code, /method: 'GET'/); assert.match(code, /}, false\)/); assert.match(code, /if \(!import.meta.env.DEV\) return null/);
  assert.match(code, /operation.current/); assert.match(code, /onClick=\{\(\) => void check\(\)\}/);
  assert.doesNotMatch(code, /POST|customerGenerate|\.approve\(|console\.|sessionStorage|setInterval/);
  const page = readFileSync(new URL('../src/pages/TranslationPage.tsx', import.meta.url), 'utf8');
  assert.ok(page.indexOf('if (!access.allowed)') < page.indexOf('const simplePreflight'));
});
test('SSR renders accessible details and BLOCKED without network or sensitive bodies', () => {
  const view = simplePreflightView(good); let state = 0;
  const source = readFileSync(new URL('../src/features/translation/CustomerSimplePreflight.tsx', import.meta.url), 'utf8').replaceAll('import.meta.env.DEV', 'true');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  runInNewContext(code, { exports, require(name) {
    if (name === 'react') return { ...React, useState: () => [state++ === 0 ? view : false, () => {}], useRef: () => ({ current: null }), useEffect: () => {} };
    if (name === 'react/jsx-runtime') return ReactJsx;
    if (name.endsWith('/api')) return { api: () => { throw Error('NO_NETWORK'); }, ApiError: Error };
    if (name.endsWith('/Card')) return { Card: ({ children }) => React.createElement('section', null, children) };
    if (name.endsWith('/Button')) return { Button: ({ children }) => React.createElement('button', null, children) };
    if (name.endsWith('simplePreflightView.mjs')) return { simplePreflightView };
    throw Error(name);
  } });
  const html = renderToStaticMarkup(React.createElement(exports.CustomerSimplePreflight, { projectId: '1'.repeat(24) }));
  assert.match(html, /role="status"/); assert.match(html, /BLOCKED/); assert.match(html, /NOT VERIFIED/); assert.match(html, /12\.000/);
  assert.match(html, /<details class="translation-preflight"><summary>/);
  assert.doesNotMatch(html, /<details[^>]*\bopen[=>\s]/);
  assert.match(html, /Thông tin kỹ thuật/);
  assert.doesNotMatch(html, /a{64}|Authorization|PRIVATE/);
});

test('SIMPLE disclosure follows the main workflow in both Customer and legacy branches', () => {
  const page = readFileSync(new URL('../src/pages/TranslationPage.tsx', import.meta.url), 'utf8');
  assert.match(page, /customerMode \/>\{simplePreflight\}/);
  assert.match(page, /<\/TranslationSourcePreflight>\{simplePreflight\}/);
  const component = readFileSync(new URL('../src/features/translation/CustomerSimplePreflight.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(component, /onToggle|open=|setInterval|\.focus\(/);
});

test('READY is accepted only with full evidence; UNKNOWN is not rewritten CLEAR; GET never generates', () => {
  const value = { ...good, status: 'READY', readyForManualExecution: true, readinessScope: 'NORMAL_CUSTOMER_DURABLE_PATH', crossProcess: { status: 'CLEAR', ramOtherProcesses: 'UNKNOWN' }, quota: 'VERIFIED', quotaEvidence: { status: 'VERIFIED', available: true, userRemaining: 16, globalRemaining: 196, userLimit: 20, globalLimit: 200 }, runtime: { method: 'GEMINI_SIMPLE_V1', customerEnabled: true, thinkingDefault: true, deploymentEvidence: { status: 'VERIFIED', intendedTargetApproval: 'APPROVED_BY_USER', approvedDatabaseMatch: true } } };
  assert.equal(simplePreflightView(value).status, 'READY'); assert.equal(simplePreflightView(value).canGenerate, false);
  assert.equal(Object.fromEntries(simplePreflightView(value).rows)['Draft ở process khác'], 'UNKNOWN');
  assert.match(Object.fromEntries(simplePreflightView(value).rows)['Quota còn lại'], /16\/20.*196\/200/);
  for (const patch of [{ quota: 'NOT VERIFIED' }, { attempt: 'BLOCKED' }, { simpleLimits: 'FAIL' }, { crossProcess: { status: 'UNKNOWN' } }, { runtime: { ...value.runtime, deploymentEvidence: { intendedTargetApproval: 'MISMATCH' } } }]) assert.equal(simplePreflightView({ ...value, ...patch }).status, 'BLOCKED');
  assert.equal(simplePreflightView({ ...good, status: 'UNKNOWN' }).status, 'UNKNOWN');
});
