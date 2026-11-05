import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

test('eight parent entries, nine unique destinations and exact breadcrumbs', async () => {
  const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-navigation-test', optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { navigation, navigationLinks, navigationTitle } = await server.ssrLoadModule('/src/components/layout/navigation.ts');
    assert.equal(navigation.reduce((n, g) => n + g.items.length, 0), 8);
    assert.equal(navigationLinks.length, 9);
    assert.equal(new Set(navigationLinks.map(x => x.to)).size, 9);
    assert.deepEqual(navigation.map(x => x.group), ['TỔNG QUAN', 'QUẢN LÝ NỘI DUNG', 'KHÁCH THAM QUAN', 'HỆ THỐNG']);
    for (const item of navigationLinks) assert.equal(navigationTitle(item.to), item.label);
    assert.equal(navigationTitle('/users/person'), 'Quản lý người dùng');
    assert.equal(navigationTitle('/projects/project'), 'Dự án thuyết minh');
    assert.equal(navigationTitle('/jobs/job'), 'Công việc xử lý');
    assert.equal(navigationTitle('/users-extra'), 'Không tìm thấy trang');
    const { AdminSidebar } = await server.ssrLoadModule('/src/components/layout/AdminSidebar.tsx');
    for (const route of ['/languages', '/voices', '/dashboard']) {
      const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [route] }, createElement(AdminSidebar)));
      assert.ok(html.includes(`aria-expanded="${route !== '/dashboard'}"`));
      assert.ok(html.includes('aria-current="page"'));
      assert.equal((html.match(/class="nav-link nav-link--active"/g) ?? []).length, 1);
    }
  } finally { await server.close(); }
});
