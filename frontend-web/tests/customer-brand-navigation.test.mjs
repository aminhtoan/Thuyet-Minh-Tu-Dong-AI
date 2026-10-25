import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRouter, MemoryRouter } from 'react-router-dom';

const require = createRequire(import.meta.url);
const name = 'Thuyết minh bảo tàng';
function component(file) {
  const exports = {};
  const dependencies = {
    react: { useState: initial => [initial, () => {}], useEffect() {}, useId: () => 'profile', useRef: initial => ({ current: initial }) },
    'react-router-dom': { ...require('react-router-dom'), useLocation: () => ({ pathname: '/dashboard' }), useNavigate: () => () => assert.fail('Brand must use Link, not auth/imperative redirect') },
    '../common/Icon': { Icon: () => React.createElement('svg', { 'aria-hidden': true }) },
    './MuseumBrandIcon': { MuseumBrandIcon: () => React.createElement('svg', { 'data-museum-icon': true, 'aria-hidden': true }) },
    '../../design/customer.generated': { customerBrand: { name } },
    '../../localization/navigationLabels.mjs': { navigationLabels: { dashboard: 'Bảng điều khiển', projects: 'Dự án của tôi', create: 'Tạo thuyết minh', history: 'Thư viện thuyết minh', account: 'Tài khoản' } },
    '../../features/auth/authService': { authService: new Proxy({}, { get() { assert.fail('Brand must not call authentication'); } }) },
    '../../features/auth/profileUpdate.mjs': { subscribeProfileUpdates: () => () => {} },
    '../../features/auth/profileIdentity.mjs': { getProfileIdentity: () => ({ name: 'Synthetic', initial: 'S', email: '' }) },
    '../../localization/confirmationMessages.mjs': { confirmationMessages: {} },
  };
  const source = readFileSync(new URL(`../src/components/layout/${file}.tsx`, import.meta.url), 'utf8');
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: key => dependencies[key] ?? require(key) });
  return exports[file];
}
function nodes(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap(v => nodes(v, predicate));
  if (!tree || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}
for (const file of ['Sidebar', 'Topbar']) {
  for (const target of ['logo', 'text']) test(`${file} ${target}: one accessible Link reaches public Home while preserving session`, async () => {
    let closed = 0;
    const tree = component(file)({ asideRef: { current: null }, drawer: false, open: true, onClose() {}, onNavigate: () => closed++, menuButtonRef: { current: null }, title: 'Bảng điều khiển', onMenuClick() {}, sidebarOpen: false });
    const brand = nodes(tree, v => v.props?.className === (file === 'Sidebar' ? 'sidebar__brand' : 'topbar__brand'))[0];
    assert.ok(brand); assert.equal(brand.props.to, '/'); assert.match(brand.props['aria-label'], /Trang chủ bảo tàng/);
    assert.ok(nodes(brand, v => typeof v.type === 'function').length, 'Icon is inside the same link');
    assert.match(JSON.stringify(brand.props.children), /Thuyết minh bảo tàng/);
    const html = renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/dashboard'] }, tree));
    assert.match(html, new RegExp(`<a[^>]*class="${file === 'Sidebar' ? 'sidebar__brand' : 'topbar__brand'}"[^>]*href="/"`));
    const session = { userId: 'synthetic-user', token: 'synthetic-memory-only' }, before = JSON.stringify(session);
    const router = createMemoryRouter([{ path: '/', element: 'Public Museum Home' }, { path: '/dashboard', element: 'Dashboard' }, { path: '/projects', element: 'Projects' }], { initialEntries: ['/dashboard'] });
    try {
      // Both child targets bubble to this single native link; Enter uses the same
      // anchor destination. React Router performs navigation without an auth call.
      brand.props.onClick?.(); await router.navigate(brand.props.to);
      assert.equal(router.state.location.pathname, '/'); assert.equal(router.state.navigation.state, 'idle'); assert.equal(JSON.stringify(session), before);
      if (file === 'Sidebar') assert.equal(closed, 1);
      await router.navigate('/dashboard'); assert.equal(router.state.location.pathname, '/dashboard');
      await router.navigate('/projects'); assert.equal(router.state.location.pathname, '/projects');
    } finally { router.dispose(); }
  });
}
test('public root registration is outside RequireAuth; existing menu destinations and focus styles remain', () => {
  const router = readFileSync(new URL('../src/routes/AppRouter.tsx', import.meta.url), 'utf8');
  assert.match(router, /<Route path="\/" element=\{<MuseumHomePage \/>\} \/>/);
  assert.ok(router.indexOf('<Route path="/"') < router.indexOf('<Route element={<RequireAuth'));
  const sidebar = readFileSync(new URL('../src/components/layout/Sidebar.tsx', import.meta.url), 'utf8');
  for (const path of ['/dashboard', '/projects', '/projects/new', '/history', '/settings']) assert.ok(sidebar.includes(`'${path}'`));
  const css = readFileSync(new URL('../src/styles/shell.css', import.meta.url), 'utf8');
  assert.match(css, /\.topbar__brand:focus-visible\s*\{[^}]*outline:/); assert.match(css, /\.sidebar__brand:focus-visible/);
  assert.match(css, /\.topbar__brand:hover/); assert.match(css, /\.sidebar__brand:hover/);
});
