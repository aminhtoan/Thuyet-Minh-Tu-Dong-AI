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

test('job GET filters, KPI and incomplete status100 retain API semantics', async () => {
  const rows = ['PROCESSING', 'FAILED', 'COMPLETED', 'QUEUED', 'CANCELLED'].map((status, i) => ({
    id: `6aea02a2dffc2cd10000000${i}`, project: { id: 'p', name: 'Museum' }, customer: null,
    type: 'TRANSCRIPTION', status, progress: 100, targetLanguage: null, errorMessage: null,
    createdAt: '2026-01-01', updatedAt: '2026-01-01', startedAt: null, completedAt: null,
  }));
  const summary = { queued: 17, processing: 23, completed: 41, failed: 7, cancelled: 9 };
  const calls = [];
  const { adminJobService } = compile('services/adminJobService.ts', { '../lib/api': { adminApi: async (url, init = {}) => {
    calls.push({ url, init });
    return { items: rows, summary, pagination: { page: 3, limit: 10, total: 1000, totalPages: 100 } };
  } } });
  const data = await adminJobService.getJobs({ page: 3, limit: 10, search: ' Museum ', type: 'TRANSCRIPTION', status: 'PROCESSING' });
  const url = new URL(calls[0].url, 'http://fixture');
  assert.equal(url.pathname, '/admin/jobs');
  assert.deepEqual(Object.fromEntries(url.searchParams), { page: '3', limit: '10', search: 'Museum', type: 'TRANSCRIPTION', status: 'PROCESSING' });
  assert.equal(calls[0].init.method, undefined);
  assert.equal(data.items[0].status, 'PROCESSING');
  assert.equal(data.items[0].progress, 100);
  const render = (resource) => {
    const { AdminJobsPage } = compile('pages/AdminJobsPage.tsx', { '../hooks/useOperations': { useJobs: () => resource } });
    return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AdminJobsPage)));
  };
  const html = render({ data, loading: false, error: false, retry() {} });
  assert.equal((html.match(/Trạng thái chưa phải Hoàn thành/g) ?? []).length, 4);
  assert.equal((html.match(/<details>/g) ?? []).length, 5);
  for (const value of [17, 23, 41, 7]) assert.ok(html.includes(`<strong>${value}</strong>`));
  assert.ok(html.includes('/jobs/6aea02a2dffc2cd100000000'));
  assert.ok(!html.includes('Duyệt') && !html.includes('Hủy công việc'));
  for (const resource of [{ data: null, loading: true, error: false }, { data: null, loading: false, error: true }]) {
    const stateHtml = render({ ...resource, retry() {} });
    assert.ok(stateHtml.includes('id="job-search"'));
    assert.ok(stateHtml.includes('Loại công việc'));
  }
});

