import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { getDrawerTabTarget } from '../src/components/layout/drawerFocus.mjs';

test('drawer focus wrapping handles both directions and empty drawers', () => {
  assert.equal(getDrawerTabTarget(0, 5, true), 4);
  assert.equal(getDrawerTabTarget(4, 5, false), 0);
  assert.equal(getDrawerTabTarget(2, 5, false), null);
  assert.equal(getDrawerTabTarget(-1, 5, false), 0);
  assert.equal(getDrawerTabTarget(-1, 5, true), 4);
  assert.equal(getDrawerTabTarget(0, 0, false), null);
});

test('mobile drawer is inert while closed and manages escape, tab and restored focus', async () => {
  const [shell, sidebar] = await Promise.all([
    readFile(new URL('../src/components/layout/AppShell.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/layout/Sidebar.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(shell, /const drawerQuery = '\(max-width: 1023px\)'/);
  assert.match(shell, /window\.matchMedia\(drawerQuery\)/);
  assert.match(shell, /event\.key === 'Escape'/);
  assert.match(shell, /event\.key !== 'Tab'/);
  assert.match(shell, /getDrawerTabTarget/);
  assert.match(shell, /menuButtonRef\.current\?\.focus\(\)/);
  assert.match(shell, /document\.body\.style\.overflow = 'hidden'/);
  assert.match(shell, /inert=\{drawerMode && sidebarOpen \? true : undefined\}/);
  assert.match(shell, /tabIndex=\{-1\} aria-hidden="true"/);
  assert.match(sidebar, /inert=\{drawer && !open \? true : undefined\}/);
  assert.match(sidebar, /aria-modal=\{drawer && open \? true : undefined\}/);
  assert.match(sidebar, /data-sidebar-initial-focus/);
  assert.match(sidebar, /aria-label="Đóng điều hướng"/);
});

test('sidebar and header follow UI03 dimensions without changing brand tokens', async () => {
  const [css, tokens] = await Promise.all([
    readFile(new URL('../src/styles/shell.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/styles/tokens.css', import.meta.url), 'utf8'),
  ]);

  assert.match(css, /--app-sidebar-width: 252px/);
  assert.match(css, /\.app-shell__body \{[\s\S]*?margin-left: var\(--app-sidebar-width\)/);
  assert.match(css, /\.sidebar__link \{[\s\S]*?min-height: 48px;[\s\S]*?gap: 12px/);
  assert.match(css, /\.sidebar__icon \{[\s\S]*?width: 20px;[\s\S]*?height: 20px/);
  assert.match(css, /\.topbar \{[\s\S]*?min-height: 72px;[\s\S]*?grid-template-columns: minmax\(140px, 1fr\) minmax\(240px, 440px\) auto/);
  assert.match(css, /\.topbar__search \{[\s\S]*?width: min\(100%, 440px\);[\s\S]*?min-height: 44px/);
  assert.match(css, /@media \(max-width: 1023px\)/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.topbar--search \.topbar__center/);
  assert.match(css, /overflow-x: clip/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(tokens, /--color-sidebar:\s*var\(--brand-dark\)/);
  assert.match(tokens, /--color-primary:\s*var\(--brand-primary\)/);
});

test('topbar keeps route-aware headings, search destination, profile and logout', async () => {
  const topbar = await readFile(new URL('../src/components/layout/Topbar.tsx', import.meta.url), 'utf8');

  for (const label of ['Dự án của tôi', 'Tạo dự án mới', 'Lịch sử', 'Tài khoản']) assert.match(topbar, new RegExp(label));
  assert.match(topbar, /Thêm thông tin và phương tiện để bắt đầu tạo thuyết minh/);
  assert.match(topbar, /navigate\('\/projects\?q=' \+ encodeURIComponent\(query\.trim\(\)\)\)/);
  assert.match(topbar, /authService\.logout\(\)/);
  assert.match(topbar, /aria-expanded=\{profileOpen\}/);
  assert.match(topbar, /className="topbar__context"/);
  assert.match(topbar, /className="topbar__center"/);
  assert.match(topbar, /className="topbar__account-region"/);
});

test('all authenticated customer routes remain inside the shared AppShell', async () => {
  const router = await readFile(new URL('../src/routes/AppRouter.tsx', import.meta.url), 'utf8');
  assert.match(router, /<Route element=\{<RequireAuth \/>\}><Route element=\{<AppShell \/>\}>/);
  for (const route of ['/dashboard', '/projects', '/projects/new', '/projects/:projectId', '/history', '/settings']) {
    assert.match(router, new RegExp(`path="${route.replaceAll('/', '\\/')}"`));
  }
});
