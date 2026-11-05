import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import path from 'node:path';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const require = createRequire(import.meta.url);
const root = path.resolve('src');
function compile(file, overrides = {}, cache = new Map()) {
  const full = path.resolve(root, file);
  if (cache.has(full)) return cache.get(full);
  const exports = {}; cache.set(full, exports);
  const code = ts.transpileModule(readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  runInNewContext(code, { exports, URLSearchParams, require: key => {
    if (overrides[key]) return overrides[key];
    if (key.endsWith('.css')) return {};
    if (!key.startsWith('.')) return require(key);
    const target = path.resolve(path.dirname(full), key);
    return compile(path.relative(root, target + (key.endsWith('.ts') || key.endsWith('.tsx') ? '' : readFileExists(target + '.tsx') ? '.tsx' : '.ts')), overrides, cache);
  } });
  return exports;
}
function readFileExists(file) { try { readFileSync(file); return true; } catch { return false; } }

test('settings values distinguish missing, false, zero, empty and malformed data without exposing secrets', () => {
  const { formatSettingValue: format, settingsGroups } = compile('utils/settingsPresentation.ts');
  assert.equal(format(false), 'Không (false)');
  assert.equal(format(false, 'configured'), 'Chưa cấu hình');
  assert.equal(format(0, 'size'), '0 MB');
  assert.equal(format(''), 'Chuỗi rỗng ("")');
  assert.equal(format(null), 'Không có dữ liệu');
  assert.equal(format(undefined), 'Không có dữ liệu');
  assert.equal(format([], 'list'), 'Danh sách rỗng');
  assert.equal(format({ secret: 'DO_NOT_RENDER' }), 'Dữ liệu không đúng định dạng');
  assert.equal(format(['audio/wav', { secret: 'DO_NOT_RENDER' }], 'list'), 'audio/wav · Dữ liệu không đúng định dạng');
  for (const value of ['mongodb+srv://DO_NOT_RENDER', 'Bearer DO_NOT_RENDER', 'apiKey=DO_NOT_RENDER', 'password:DO_NOT_RENDER', 'sk-DO_NOT_RENDER', 'eyJtest.payload.signature']) {
    assert.equal(format(value), 'Đã ẩn thông tin nhạy cảm');
  }
  for (const value of [null, undefined, {}, { apiKey: 'DO_NOT_RENDER' }, { editable: false }]) assert.equal(settingsGroups(value).length, 0);
});

test('settings page renders only existing allowlisted fields and handles all resource states', async () => {
  const calls = [];
  const { adminSettingsService } = compile('services/adminSettingsService.ts', { '../lib/api': { adminApi: async (url, init) => { calls.push({ url, init }); return { settings: null }; } } });
  const controller = new AbortController();
  assert.equal(await adminSettingsService.getSettings({ signal: controller.signal }), null);
  assert.equal(calls[0].url, '/admin/settings');
  assert.equal(calls[0].init.signal, controller.signal);
  assert.equal(calls[0].init.method, undefined);
  const render = resource => {
    const { AdminSettingsPage } = compile('pages/AdminSettingsPage.tsx', { '../hooks/useAdminSettings': { useAdminSettings: () => ({ retry() {}, ...resource }) } });
    return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AdminSettingsPage)));
  };
  const data = { environment: 'development', upload: { maxSizeMb: 0, supportedMediaTypes: ['audio/wav'] }, authentication: { accessTokenTtl: '', refreshTokenTtl: null, secret: 'DO_NOT_RENDER' }, processing: { sttProviderConfigured: false, ttsProviderConfigured: true, mode: { key: 'DO_NOT_RENDER' } }, secret: 'DO_NOT_RENDER' };
  const html = render({ data, loading: false, error: false });
  for (const text of ['0 MB', 'Chưa cấu hình', 'Đã cấu hình', 'Chuỗi rỗng', 'Không có dữ liệu']) assert.ok(html.includes(text));
  for (const text of ['DO_NOT_RENDER', '[object Object]', '>undefined<', '>null<', '<input', '<button']) assert.ok(!html.includes(text));
  assert.ok(render({ data: null, loading: true, error: false }).includes('aria-busy="true"'));
  assert.ok(render({ data: null, loading: false, error: false }).includes('Chưa có dữ liệu cấu hình'));
  const errorHtml = render({ data, loading: false, error: true });
  assert.ok(errorHtml.includes('Thử lại') && !errorHtml.includes('0 MB'));
});

