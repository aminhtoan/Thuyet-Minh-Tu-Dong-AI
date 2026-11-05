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

test('catalog GET contracts and voice mapping remain read-only', async () => {
  const calls = [];
  const language = { id: 'en', code: 'en', name: 'English', nativeName: 'English', isActive: true, voiceCount: 2 };
  const voices = [{ id: 'v1', name: 'Kore', language: { id: 'en' }, provider: 'gemini', providerVoiceId: 'Kore', gender: 'FEMALE', description: 'Museum voice', isActive: true, previewUrl: null }, { id: 'v2', name: 'Unknown', language: null, provider: 'custom', providerVoiceId: 'raw-id', gender: 'NEUTRAL', description: '', isActive: false, previewUrl: null }];
  const overrides = { '../lib/api': { adminApi: async (url, init = {}) => { calls.push({ url, init }); return url.startsWith('/admin/languages') ? { languages: [language] } : { voices }; } } };
  const { adminLanguageService } = compile('services/adminLanguageService.ts', overrides);
  const { adminVoiceService } = compile('services/adminVoiceService.ts', overrides);
  const controller = new AbortController();
  assert.equal((await adminLanguageService.getLanguages({ signal: controller.signal }))[0], language);
  const result = await adminVoiceService.getVoices({ signal: controller.signal });
  assert.equal(result[0].languageId, 'en');
  assert.equal(result[1].languageId, '');
  assert.equal(result[1].provider, 'custom');
  assert.ok(calls.every(call => call.init.method === undefined && call.init.signal === controller.signal));
  assert.deepEqual(calls.map(call => call.url), ['/admin/languages?', '/admin/voices?']);
});

test('catalog pages preserve fields and show unknown languages without guessing', () => {
  const languages = [{ id: 'en', code: 'en', name: 'English', nativeName: 'English', isActive: true, voiceCount: 2 }];
  const voices = [{ id: 'v1', name: 'Kore', languageId: 'en', provider: 'gemini', providerVoiceId: 'Kore', gender: 'FEMALE', description: 'Museum voice', isActive: true }, { id: 'v2', name: 'Mystery', languageId: 'missing', provider: 'custom', providerVoiceId: 'raw-id', gender: 'MALE', description: 'Raw description', isActive: false }];
  const render = (file, exported, languageError = false) => {
    const page = compile(file, { '../lib/api': { adminApi() { throw Error('Unexpected API call'); } }, '../hooks/useCatalogResource': { useCatalogResource: load => ({ data: load.name === 'getVoices' ? voices : languageError ? null : languages, loading: false, error: load.name !== 'getVoices' && languageError, retry() {} }) } });
    return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(page[exported])));
  };
  const html = render('pages/AdminVoicesPage.tsx', 'AdminVoicesPage', true);
  assert.ok(html.includes('Kore') && html.includes('Museum voice') && html.includes('Gemini') && html.includes('Nữ') && html.includes('Nam'));
  assert.ok(html.includes('custom') && html.includes('ID: missing'));
  assert.ok(html.includes('Chưa có thông tin ngôn ngữ') && !html.includes('English'));
  assert.ok(html.includes('Thử lại ngôn ngữ') && !html.includes('<audio'));
  const languageHtml = render('pages/AdminLanguagesPage.tsx', 'AdminLanguagesPage');
  assert.ok(languageHtml.includes('English') && languageHtml.includes('EN') && languageHtml.includes('Đang hoạt động'));
});

