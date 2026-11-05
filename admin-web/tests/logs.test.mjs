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

test('logs preserve GET contract, mapping, full text and supported role filters', async () => {
  const calls = [];
  const description = 'Nội dung <script> không thực thi & giữ nguyên\n'.repeat(80);
  const dto = { id: 'log1', actor: null, action: 'UPDATED', entityType: 'Project', entityId: 'entity1', description, createdAt: '2026-01-01T10:00:00Z' };
  const { adminLogService } = compile('services/adminLogService.ts', { '../lib/api': { adminApi: async (url, init = {}) => {
    calls.push({ url, init }); return { items: [dto], pagination: { page: 2, limit: 10, total: 30, totalPages: 3 } };
  } } });
  const controller = new AbortController();
  const data = await adminLogService.getLogs({ search: ' Museum ', category: 'PROCESSING', role: 'ADMIN', days: 7, page: 2, limit: 10, signal: controller.signal });
  assert.deepEqual(Object.fromEntries(new URL(calls[0].url, 'http://fixture').searchParams), { page: '2', limit: '10', search: 'Museum', role: 'ADMIN', entityType: 'ProcessingJob', days: '7' });
  assert.equal(calls[0].init.method, undefined);
  assert.equal(calls[0].init.signal, controller.signal);
  assert.equal(data.items[0].description, description);
  assert.equal(data.items[0].userRole, 'UNKNOWN');
  assert.equal(data.items[0].category, 'PROJECT');
  await adminLogService.getLogs({ role: 'ALL' });
  assert.equal(new URL(calls[1].url, 'http://fixture').searchParams.has('role'), false);
  const { AdminLogsPage } = compile('pages/AdminLogsPage.tsx', { '../hooks/useAdminLogs': { useAdminLogs: () => ({ data, loading: false, error: false, retry() {} }) } });
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AdminLogsPage)));
  assert.ok(html.includes('Nhật ký hệ thống'));
  assert.ok(html.includes('Không xác định'));
  const roleSelect = html.match(/<label[^>]*><span>Vai trò<\/span>[\s\S]*?<\/label>/)?.[0];
  assert.ok(roleSelect);
  assert.ok(!roleSelect.includes('SYSTEM') && !roleSelect.includes('UNKNOWN'));
  assert.ok(roleSelect.includes('CUSTOMER') && roleSelect.includes('ADMIN') && roleSelect.includes('ALL'));
  assert.ok(html.includes('aria-label="Xem chi tiết nhật ký log1"'));
  assert.ok(!html.includes(description));
  assert.ok(!html.includes('<script>'));
});

test('role mapping preserves records and valid actors; ALL, CUSTOMER and ADMIN keep their GET contract', async () => {
  const rows = [
    { id: 'customer', actor: { id: 'u1', fullName: 'Customer fixture', role: 'CUSTOMER' } },
    { id: 'admin', actor: { id: 'u2', fullName: 'Admin fixture', role: 'ADMIN' } },
    { id: 'null-actor', actor: null },
    { id: 'missing-actor' },
  ].map(row => ({ action: 'READ_FIXTURE', entityType: 'Project', entityId: 'p', description: 'Original description', createdAt: '2026-01-01', ...row }));
  const calls = [];
  const { adminLogService } = compile('services/adminLogService.ts', { '../lib/api': { adminApi: async url => {
    calls.push(url); return { items: rows, pagination: { page: 1, limit: 10, total: 4, totalPages: 1 } };
  } } });
  for (const role of ['ALL', 'CUSTOMER', 'ADMIN']) {
    const result = await adminLogService.getLogs({ role });
    assert.equal(new URL(calls.at(-1), 'http://fixture').searchParams.get('role'), role === 'ALL' ? null : role);
    assert.deepEqual(Array.from(result.items, row => row.id), rows.map(row => row.id));
    assert.equal(result.pagination.total, 4);
    assert.equal(result.items[0].userRole, 'CUSTOMER');
    assert.equal(result.items[0].userName, 'Customer fixture');
    assert.equal(result.items[1].userRole, 'ADMIN');
    assert.equal(result.items[1].userName, 'Admin fixture');
    for (const row of result.items.slice(2)) {
      assert.equal(row.userName, 'Không xác định');
      assert.equal(row.userRole, 'UNKNOWN');
      assert.equal(row.description, 'Original description');
    }
  }
});

