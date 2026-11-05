import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

test('shared pagination, labeled fields, busy table and recovery states', async () => {
  const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-admin-foundation', optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const load = file => server.ssrLoadModule(`/src/${file}`);
  try {
    const { paginationItems } = await load('utils/pagination.ts');
    assert.deepEqual(paginationItems(1, 0), []);
    assert.deepEqual(paginationItems(1, 1), [1]);
    for (const page of [1, 2, 3, 500, 999999, 1000000]) {
      const items = paginationItems(page, 1000000);
      assert.ok(items.length <= 9, 'bounded DOM for very large datasets');
      assert.ok(items.includes(1) && items.includes(page) && items.includes(1000000));
      assert.equal(new Set(items).size, items.length);
    }
    const { Pagination } = await load('components/common/Pagination.tsx');
    const empty = renderToStaticMarkup(createElement(Pagination, { value: { page: 1, totalPages: 0, total: 0, limit: 10 }, onPage() {} }));
    assert.equal((empty.match(/disabled=""/g) ?? []).length, 2);
    const { SearchField, FilterSelect } = await load('components/common/FormFields.tsx');
    const html = renderToStaticMarkup(createElement('div', null,
      createElement(SearchField, { label: 'Tìm kiếm', value: 'test', onChange() {} }),
      createElement(FilterSelect, { label: 'Trạng thái' }, createElement('option', null, 'Tất cả'))));
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(new Set(ids).size, 2);
    for (const id of ids) assert.ok(html.includes(`for="${id}"`));
    assert.ok(html.includes('type="search"') && html.includes('Tìm kiếm') && html.includes('Trạng thái'));
    const { LoadingState } = await load('components/common/LoadingState.tsx');
    const children = createElement(SearchField, { id: 'stable-search', label: 'Tìm kiếm' });
    for (const loading of [false, true]) {
      const markup = renderToStaticMarkup(createElement(LoadingState, { loading }, children));
      assert.ok(markup.includes('id="stable-search"'), 'refresh never removes the control');
      assert.ok(markup.includes(`aria-busy="${loading}"`));
    }
    const { DataTable } = await load('components/common/DataTable.tsx');
    const table = renderToStaticMarkup(createElement(DataTable, { caption: 'Danh sách', loading: true }, createElement('tbody', null, createElement('tr', null, createElement('td', null, 'Giữ dữ liệu')))));
    assert.ok(table.includes('<caption') && table.includes('Giữ dữ liệu') && table.includes('tabindex="0"'));
    const { ErrorState } = await load('components/common/ErrorState.tsx');
    const error = renderToStaticMarkup(createElement(ErrorState, { title: 'Lỗi', description: 'Thử lại', onRetry() {} }));
    assert.ok(error.includes('role="alert"') && error.includes('<button'));
  } finally { await server.close(); }
});

test('dialog lifecycle opens modal, handles Escape/pending, restores trigger focus', () => {
  const require = createRequire(import.meta.url);
  const source = readFileSync(new URL('../src/components/common/AdminDialog.tsx', import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  let cleanup, focused = 0, closed = 0, dismissed = 0;
  class Element { isConnected = true; focus() { focused++; } }
  const trigger = new Element();
  const dialog = { open: false, showModal() { this.open = true; }, close() { this.open = false; closed++; } };
  const exports = {};
  runInNewContext(output, { exports, HTMLElement: Element, document: { activeElement: trigger }, require: key => key === 'react' ? {
    useRef: () => ({ current: dialog }), useEffect: fn => { cleanup = fn(); },
  } : require(key) });
  for (const busy of [false, true]) {
    const node = exports.AdminDialog({ open: true, busy, labelledBy: 'title', onClose() { dismissed++; } });
    assert.equal(dialog.open, true);
    let prevented = false;
    node.props.onCancel({ preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(dismissed, 1, 'busy Escape must not close');
    cleanup();
    assert.equal(dialog.open, false);
  }
  assert.equal(closed, 2);
  assert.equal(focused, 2);
});
