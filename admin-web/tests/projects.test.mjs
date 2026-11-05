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
const rows = ['TRANSLATING', 'FAILED', 'COMPLETED'].map((status, i) => ({ id: String(i), name: `Project ${i}`, user: { id: 'u', fullName: 'Editor', email: 'editor@example.test' }, sourceLanguage: 'vi', targetLanguages: ['en'], media: null, status, progress: 100, createdAt: '2026-01-01', updatedAt: '2026-01-01', narrationApproval: { status: 'NONE_APPROVED', approved: 0, total: 1 } }));

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

test('project GET filters and manual approval payload stay unchanged; status100 is not completed', async () => {
  const calls = [];
  const { mapProject, adminProjectService } = compile('services/adminProjectService.ts', { '../lib/api': { adminApi: async (url, init = {}) => {
    calls.push({ url, init });
    return url.includes('/approval') ? { narration: { id: 'n1' } } : { items: rows, summary: {}, pagination: {} };
  } } });
  const result = await adminProjectService.getProjects({ page: 3, limit: 10, search: 'Museum', status: 'TRANSLATING', mediaType: 'VIDEO' });
  const url = new URL(calls[0].url, 'http://fixture');
  assert.equal(url.searchParams.get('search'), 'Museum');
  assert.equal(url.searchParams.get('page'), '3');
  assert.equal(url.searchParams.get('mediaType'), 'VIDEO');
  assert.equal(url.searchParams.get('status'), 'TRANSLATING');
  assert.equal(calls[0].init.method, undefined);
  assert.equal(result.items[0].status, 'TRANSLATING');
  assert.equal(result.items[0].progress, 100);
  await adminProjectService.updateNarrationApproval('n1', true);
  assert.equal(calls[1].url, '/admin/narrations/n1/approval');
  assert.equal(calls[1].init.method, 'PATCH');
  assert.equal(calls[1].init.body, '{"isApproved":true}');
  const data = { items: rows.map(mapProject), pagination: { page: 1, total: 3, limit: 10, totalPages: 1 } };
  const { AdminProjectsPage } = compile('pages/AdminProjectsPage.tsx', {
    '../hooks/useOperations': { useProjects: () => ({ data, loading: false, error: false, retry() {} }) },
    '../components/operations/NarrationApprovalModal': { NarrationApprovalModal: () => null },
  });
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AdminProjectsPage)));
  assert.equal((html.match(/disabled=""/g) ?? []).length, 4, 'two unavailable approvals plus two pagination boundaries');
  assert.ok(html.includes('Đang dịch') && html.includes('Thất bại') && html.includes('Hoàn thành'));
  assert.equal((html.match(/Trạng thái chưa phải Hoàn thành/g) ?? []).length, 2);
});
