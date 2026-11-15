import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const compile = (file, overrides) => {
  const exports = {};
  const source = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  runInNewContext(code, { exports, require: key => overrides[key] ?? require(key), AbortController }); return exports;
};
const labels = { NOT_PUBLIC: 'Chưa công khai', READY: 'Sẵn sàng công khai', FAILED: 'Xử lý thất bại', PROCESSING: 'Đang chuẩn bị âm thanh', DISABLED: 'Đã tắt công khai', SOURCE_CHANGED: 'Nguồn đã thay đổi' };
const initial = { sourceFingerprint: 'a'.repeat(64), version: null, publicationId: null, enabled: false, status: 'NOT_PUBLIC', errorCode: null };
const find = (node, predicate) => {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) { const value = find(child, predicate); if (value) return value; }
  return null;
};
function harness() {
  let cursor = 0, tree, calls = 0, finish, state = initial;
  const slots = [], pending = [];
  const React = { ...require('react'), useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], value => { slots[i] = value; }]; },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useCallback(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((v, n) => v !== slots[i].deps[n])) slots[i] = { fn, deps }; return slots[i].fn; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((v, n) => v !== slots[i][n])) { slots[i] = deps; pending.push(fn); } } };
  const { OriginalAudioPublication } = compile('components/operations/OriginalAudioPublication.tsx', {
    react: React, '../common/Card': { Card: 'div' }, '../common/Button': { Button: 'button' }, '../common/AdminDialog': { AdminDialog: 'dialog' },
    '../../lib/api': { ApiError: class extends Error {} },
    '../../services/originalAudioService': { originalAudioStatus: status => labels[status], originalAudioService: {
      get: async () => state, set: () => { calls++; return new Promise((resolve, reject) => { finish = (value, error) => error ? reject(error) : resolve(state = value); }); },
    } },
  });
  const render = () => { cursor = 0; tree = OriginalAudioPublication({ projectId: 'project' }); return tree; };
  const settle = async () => { render(); pending.splice(0).forEach(fn => fn()); await new Promise(resolve => setImmediate(resolve)); return render(); };
  return { render, settle, get calls() { return calls; }, finish: (value, error) => finish(value, error),
    find: predicate => find(tree, predicate) };
}

test('Admin confirmation, no optimistic activation, duplicate lock, disable and uncertain failure', async () => {
  const h = harness(); await h.settle();
  const checkbox = () => h.find(node => node.props?.type === 'checkbox');
  const button = text => h.find(node => node.props?.children === text);
  assert.equal(checkbox().props.checked, false);
  checkbox().props.onChange({ target: { checked: true } }); h.render();
  assert.equal(h.find(node => node.type === 'dialog').props.open, true); assert.equal(h.calls, 0);
  const confirm = button('Xác nhận công khai');
  const request = confirm.props.onClick(); confirm.props.onClick(); h.render();
  assert.equal(h.calls, 1); assert.equal(checkbox().props.checked, false); assert.equal(checkbox().props.disabled, true);
  h.finish({ ...initial, enabled: true, status: 'READY', version: 2 }); await request; await new Promise(resolve => setImmediate(resolve)); h.render();
  assert.equal(checkbox().props.checked, true); assert.equal(h.find(node => node.props?.role === 'status').props.children, labels.READY);
  checkbox().props.onChange({ target: { checked: false } });
  h.finish({ ...initial, status: 'DISABLED', version: 3 }); await new Promise(resolve => setImmediate(resolve)); h.render();
  assert.equal(checkbox().props.checked, false);
  checkbox().props.onChange({ target: { checked: true } }); h.render();
  const failed = button('Xác nhận công khai').props.onClick(); h.finish(null, Error('timeout')); await failed; await new Promise(resolve => setImmediate(resolve)); h.render();
  assert.equal(checkbox().props.disabled, true); assert.ok(h.find(node => node.props?.role === 'alert'));
  assert.equal(h.calls, 3); // no automatic retry
});

test('Admin service binds enabled flag to Backend fingerprint and version without paths', async () => {
  const calls = [];
  const { originalAudioService, originalAudioStatus } = compile('services/originalAudioService.ts', { '../lib/api': { adminApi: async (...args) => { calls.push(args); return { publication: initial }; } } });
  await originalAudioService.set('project', initial, true);
  assert.deepEqual(JSON.parse(calls[0][1].body), { enabled: true, sourceFingerprint: initial.sourceFingerprint, version: null });
  for (const status of ['NOT_PUBLIC', 'PROCESSING', 'READY', 'FAILED', 'SOURCE_CHANGED', 'DISABLED']) assert.ok(originalAudioStatus(status));
});

test('project publication modal shows project name and reuses the existing control with a close action', () => {
  let closes = 0;
  const { OriginalAudioPublicationModal } = compile('components/operations/OriginalAudioPublicationModal.tsx', {
    '../common/AdminDialog': { AdminDialog: 'dialog' }, '../common/Button': { Button: 'button' },
    './OriginalAudioPublication': { OriginalAudioPublication: 'publication-control' },
  });
  const tree = OriginalAudioPublicationModal({ project: { id: 'selected-project', name: 'Bảo tàng' }, onClose: () => { closes++; } });
  assert.equal(tree.props.open, true);
  assert.equal(find(tree, node => node.props?.id === tree.props.labelledBy).props.children, 'Bảo tàng');
  assert.equal(find(tree, node => node.type === 'publication-control').props.projectId, 'selected-project');
  find(tree, node => node.props?.['aria-label'] === 'Đóng quản lý âm thanh gốc').props.onClick();
  assert.equal(closes, 1);
});
