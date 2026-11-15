import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function compile(file, overrides = {}, globals = {}) {
  const exports = {};
  const source = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  runInNewContext(code, { exports, require: key => key.endsWith('.css') ? {} : overrides[key] ?? require(key), AbortController, setTimeout, clearTimeout, ...globals });
  return exports;
}
const result = { id: 'result', projectId: 'project', narrationId: 'narration', targetLanguage: 'en', mimeType: 'video/mp4', fileSize: 12, duration: 1 };
const initial = { resultId: result.id, projectId: result.projectId, enabled: false, version: 0 };
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) { const found = find(child, predicate); if (found) return found; }
  return null;
}
function harness(overrides = {}, parent = false) {
  let cursor = 0, tree, calls = 0, state = initial, finish, gets = 0;
  const slots = [], effects = [], cleanups = [];
  const React = { ...require('react'), useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], value => { slots[i] = value; }]; },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useCallback(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((d, n) => d !== slots[i].deps[n])) slots[i] = { fn, deps }; return slots[i].fn; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((d, n) => d !== slots[i][n])) { slots[i] = deps; effects.push(fn); } } };
  const service = {
    list: async () => [result],
    get: async () => { gets++; return state; },
    verify: async () => {},
    set: () => { calls++; return new Promise((resolve, reject) => { finish = (value, error) => error ? reject(error) : resolve(state = value); }); },
    ...overrides,
  };
  const components = compile('components/operations/VideoPublication.tsx', { react: React,
    '../common/Card': { Card: 'section' }, '../common/Button': { Button: 'button' }, '../common/AdminDialog': { AdminDialog: 'dialog' },
    '../../services/videoPublicationService': { videoPublicationService: service },
  });
  const render = () => { cursor = 0; tree = parent ? components.VideoPublication({ projectId: result.projectId }) : components.VideoPublicationItem({ result }); return tree; };
  const settle = async () => { render(); effects.splice(0).forEach(fn => { const cleanup = fn(); if (cleanup) cleanups.push(cleanup); }); await new Promise(resolve => setImmediate(resolve)); return render(); };
  return { render, settle, unmount: () => cleanups.forEach(fn => fn()), find: predicate => find(tree, predicate),
    button: text => find(tree, node => node.props?.children === text), checkbox: () => find(tree, node => node.props?.type === 'checkbox'),
    get calls() { return calls; }, get gets() { return gets; }, finish: (value, error) => finish(value, error) };
}

test('no current Result is an empty state and never enables publication', async () => {
  const h = harness({ list: async () => [] }, true); await h.settle();
  assert.match(h.find(node => node.props?.role === 'status').props.children, /Chưa có MP4 hiện hành/);
  assert.equal(h.checkbox(), null); assert.equal(h.calls, 0); h.unmount();
});
test('created OFF video needs explicit protected MP4 verification and confirmation; no auto mutation', async () => {
  const h = harness(); await h.settle();
  assert.equal(h.checkbox().props.disabled, true); assert.equal(h.checkbox().props.checked, false); assert.equal(h.calls, 0);
  await h.button('Kiểm tra MP4').props.onClick(); await h.settle();
  assert.equal(h.checkbox().props.disabled, false);
  h.checkbox().props.onChange({ target: { checked: true } }); h.render();
  assert.equal(h.find(node => node.type === 'dialog').props.open, true); assert.equal(h.calls, 0); h.unmount();
});
test('ON/OFF requires Backend confirmation, disables duplicates and announces success after completion', async () => {
  const h = harness(); await h.settle(); h.button('Kiểm tra MP4').props.onClick(); await h.settle();
  h.checkbox().props.onChange({ target: { checked: true } }); h.render();
  const confirm = h.button('Xác nhận công khai video'); confirm.props.onClick(); confirm.props.onClick(); h.render();
  assert.equal(h.calls, 1); assert.equal(h.checkbox().props.checked, false); assert.equal(h.checkbox().props.disabled, true);
  assert.equal(h.find(node => node.props?.children === 'Đã bật công khai video MP4.'), null);
  h.finish({ ...initial, enabled: true, version: 1 }); await h.settle();
  assert.equal(h.checkbox().props.checked, true); assert.ok(h.find(node => node.props?.children === 'Đã bật công khai video MP4.'));
  h.checkbox().props.onChange({ target: { checked: false } }); h.render(); assert.equal(h.checkbox().props.checked, true);
  h.finish({ ...initial, version: 2 }); await h.settle();
  assert.equal(h.checkbox().props.checked, false); assert.ok(h.find(node => node.props?.children === 'Đã tắt công khai video MP4.')); h.unmount();
});
test('Backend refusal does not announce success or automatically retry and requires state reload', async () => {
  const h = harness(); await h.settle(); h.button('Kiểm tra MP4').props.onClick(); await h.settle();
  h.checkbox().props.onChange({ target: { checked: true } }); h.render(); h.button('Xác nhận công khai video').props.onClick();
  h.finish(null, Error('409 VIDEO_ARTIFACT_INVALID')); await h.settle();
  assert.equal(h.checkbox().props.checked, false); assert.equal(h.checkbox().props.disabled, true); assert.equal(h.calls, 1);
  assert.ok(h.find(node => node.props?.role === 'alert')); assert.equal(h.find(node => node.props?.children === 'Đã bật công khai video MP4.'), null);
  h.button('Tải lại trạng thái').props.onClick(); await h.settle(); assert.equal(h.gets, 2); h.unmount();
});
test('invalid MP4 cannot be enabled; load/verification failures have retry guidance', async () => {
  const h = harness({ verify: async () => { throw Error('corrupt file'); } }); await h.settle();
  h.button('Kiểm tra MP4').props.onClick(); await h.settle();
  assert.equal(h.checkbox().props.disabled, true); assert.match(h.find(node => node.props?.role === 'alert').props.children, /Tải lại/);
  assert.equal(h.calls, 0); h.unmount();
  const failed = harness({ get: async () => { throw Error('network'); } }); await failed.settle();
  assert.equal(failed.checkbox().props.disabled, true); assert.ok(failed.find(node => node.props?.role === 'alert')); failed.unmount();
});
test('loading, failed listing and unmount ignore stale async completion', async () => {
  let complete;
  const h = harness({ list: () => new Promise(resolve => { complete = resolve; }) }, true); await h.settle();
  assert.match(h.find(node => node.props?.role === 'status').props.children, /Đang tải/);
  h.unmount(); complete([result]); await h.settle();
  assert.equal(h.find(node => typeof node.type === 'function' && node.props?.result), null);
  const failed = harness({ list: async () => { throw Error('offline'); } }, true); await failed.settle();
  assert.ok(failed.find(node => node.props?.role === 'alert')); assert.ok(failed.button('Thử lại')); failed.unmount();
});

test('service uses authenticated protected Result routes and exact versioned publication contract', async () => {
  const calls = [];
  const { videoPublicationService: service } = compile('services/videoPublicationService.ts', { '../lib/api': {
    adminApi: async (path, options) => { calls.push([path, options]); return { results: [result], publication: { ...initial, enabled: true, version: 1 } }; },
  } });
  await service.list('project'); await service.set(initial, true);
  assert.equal(calls[0][0], '/projects/project/results');
  assert.equal(calls[1][0], '/published-video-narrations/admin/projects/project/results/result/publication');
  assert.deepEqual(JSON.parse(calls[1][1].body), { enabled: true, version: 0 }); assert.equal(calls[2][1].signal, undefined);
  assert.equal(calls[2][1].method, undefined); assert.equal(calls.length, 3);
});
test('service rejects mismatch, failed PATCH, and failed synchronization without automatic retry', async () => {
  let calls = 0;
  const { videoPublicationService: service } = compile('services/videoPublicationService.ts', { '../lib/api': {
    adminApi: async () => { calls++; if (calls === 1) return { publication: { ...initial, enabled: true, version: 1 } }; return { publication: initial }; },
  } });
  await assert.rejects(service.set(initial, true), /Trạng thái đã thay đổi/); assert.equal(calls, 2);
  const { videoPublicationService: refused } = compile('services/videoPublicationService.ts', { '../lib/api': { adminApi: async () => { throw Error('403'); } } });
  await assert.rejects(refused.set(initial, true), /403/);
  const { videoPublicationService: mismatch } = compile('services/videoPublicationService.ts', { '../lib/api': { adminApi: async () => ({ publication: { ...initial, projectId: 'other' } }) } });
  await assert.rejects(mismatch.get('project', 'result'), /không hợp lệ/);
});
test('protected Blob verification checks bytes, never uses source or server-supplied URLs, and cleans decoder resources', async () => {
  const calls = [], revoked = []; let video;
  const blob = new Blob(['0000ftypdata'], { type: 'video/mp4' });
  const fixture = { ...result, fileSize: blob.size, fileUrl: 'https://untrusted.test/source.mp4' };
  const { videoPublicationService: service } = compile('services/videoPublicationService.ts', { '../lib/api': {
    adminApi: async path => { calls.push(path); return { result: fixture }; }, adminApiBlob: async path => { calls.push(path); return blob; },
  } }, { document: { createElement: () => video = { duration: 1, videoWidth: 64, videoHeight: 64, load() { if (this.src) queueMicrotask(() => this.onloadeddata?.()); }, removeAttribute() { this.src = ''; } } },
    URL: { createObjectURL: () => 'blob:synthetic', revokeObjectURL: url => revoked.push(url) },
  });
  await service.verify({ ...result, fileSize: blob.size });
  assert.deepEqual(calls, ['/projects/project/results/result', '/projects/project/results/result/file']);
  assert.deepEqual(revoked, ['blob:synthetic']); assert.equal(video.onloadeddata, null); assert.equal(video.src, '');
  const { videoPublicationService: corrupt } = compile('services/videoPublicationService.ts', { '../lib/api': {
    adminApi: async () => ({ result }), adminApiBlob: async () => new Blob(['not a video!'], { type: 'video/mp4' }),
  } });
  await assert.rejects(corrupt.verify(result), /không hợp lệ/);
});
test('decoder handles error, abort and timeout with resource cleanup and no autoplay', async () => {
  for (const outcome of ['error', 'abort', 'timeout']) {
    let video, timeout, revoked = 0;
    const controller = new AbortController();
    const { inspectVideoBlob } = compile('services/videoPublicationService.ts', { '../lib/api': {} }, {
      document: { createElement: () => video = { load() {}, removeAttribute() {} } },
      URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => { revoked++; } },
      setTimeout: fn => { timeout = fn; return 1; }, clearTimeout: () => {},
    });
    const promise = inspectVideoBlob(new Blob([]), controller.signal);
    if (outcome === 'error') video.onerror(); else if (outcome === 'abort') controller.abort(); else timeout();
    await assert.rejects(promise); assert.equal(revoked, 1); assert.equal(video.onloadeddata, null); assert.equal(video.autoplay, undefined);
  }
});
test('project detail mounts independent MP4 control only for VIDEO sources and preserves original audio', () => {
  const page = readFileSync(new URL('../src/pages/AdminProjectDetailPage.tsx', import.meta.url), 'utf8');
  const source = readFileSync(new URL('../src/services/videoPublicationService.ts', import.meta.url), 'utf8');
  assert.match(page, /p\.media\?\.mediaType === 'VIDEO' && <VideoPublication/); assert.match(page, /<OriginalAudioPublication/);
  assert.doesNotMatch(source, /updateNarrationApproval|isApproved|\/source|public-audio|\/public\//);
});

test('video modal binds project name/id to the existing publication control and supports close', () => {
  let closes = 0;
  const { VideoPublicationModal } = compile('components/operations/VideoPublicationModal.tsx', {
    '../common/AdminDialog': { AdminDialog: 'dialog' }, '../common/Button': { Button: 'button' },
    './VideoPublication': { VideoPublication: 'video-control' },
  });
  const tree = VideoPublicationModal({ project: { id: 'selected-project', name: 'Bảo tàng' }, onClose: () => { closes++; } });
  assert.equal(tree.props.open, true);
  assert.equal(find(tree, node => node.props?.id === tree.props.labelledBy).props.children, 'Bảo tàng');
  const control = find(tree, node => node.type === 'video-control');
  assert.equal(control.props.projectId, 'selected-project'); assert.equal(control.key, 'selected-project');
  find(tree, node => node.props?.['aria-label'] === 'Đóng quản lý video').props.onClick(); assert.equal(closes, 1);
});
test('reused publication control keeps multiple Results/languages separate', async () => {
  const second = { ...result, id: 'result-vi', targetLanguage: 'vi' };
  const h = harness({ list: async () => [result, second] }, true); await h.settle();
  const first = h.find(node => node.props?.result?.id === result.id), other = h.find(node => node.props?.result?.id === second.id);
  assert.equal(first.key, result.id); assert.equal(other.key, second.id);
  assert.equal(first.props.result.targetLanguage, 'en'); assert.equal(other.props.result.targetLanguage, 'vi');
  assert.equal(h.calls, 0); h.unmount();
});
test('publication mutations for separate Results preserve exact Result/project and CAS version', async () => {
  const calls = [], states = new Map();
  const { videoPublicationService: service } = compile('services/videoPublicationService.ts', { '../lib/api': {
    adminApi: async (path, options) => {
      calls.push([path, options]);
      const resultId = path.includes('/results/second/') ? 'second' : 'first';
      if (options?.method === 'PATCH') { const input = JSON.parse(options.body); states.set(resultId, { projectId: 'project', resultId, enabled: input.enabled, version: input.version + 1 }); }
      return { publication: states.get(resultId) };
    },
  } });
  await service.set({ ...initial, resultId: 'first' }, true);
  await service.set({ ...initial, resultId: 'second', enabled: true, version: 3 }, false);
  const writes = calls.filter(([, options]) => options?.method === 'PATCH');
  assert.equal(writes.length, 2);
  assert.equal(writes[0][0], '/published-video-narrations/admin/projects/project/results/first/publication');
  assert.equal(writes[1][0], '/published-video-narrations/admin/projects/project/results/second/publication');
  assert.deepEqual(JSON.parse(writes[0][1].body), { enabled: true, version: 0 });
  assert.deepEqual(JSON.parse(writes[1][1].body), { enabled: false, version: 3 });
});
