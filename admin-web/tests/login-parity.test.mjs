import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function compile(path, dependencies) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: key => { if (key.endsWith('.css')) return {}; return dependencies[key] ?? require(key); },
    FormData: class { constructor(form) { this.values = form.values; } get(name) { return this.values[name]; } },
  });
  return exports;
}
function all(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap(v => all(v, predicate));
  if (!tree || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...all(tree.props?.children, predicate)];
}
function harness(login = async () => {}) {
  let cursor = 0; const state = [], calls = [], navigation = [], focus = [];
  const component = compile('pages/AdminLoginPage.tsx', {
    react: { useState(value) { const i = cursor++; if (!(i in state)) state[i] = value; return [state[i], value => { state[i] = value; }]; }, useRef(value) { const i = cursor++; return state[i] ??= { current: value }; } },
    'react-router-dom': { useNavigate: () => (...args) => navigation.push(args) },
    '../components/common/Button': { Button: 'button' },
    '../services/adminAuthService': { adminAuthService: { login: (...args) => { calls.push(args); return login(...args); } } },
    '../config/env': { environment: { publicMuseumUrl: 'https://museum.example.invalid/' } },
  }).AdminLoginPage;
  const render = () => { cursor = 0; return component(); };
  const form = { values: { email: ' admin@example.invalid ', password: 'unchanged-password' }, elements: { namedItem: name => ({ focus: () => focus.push(name) }) }, resets: 0, reset() { this.resets++; } };
  return { render, form, calls, navigation, focus, submit: () => all(render(), v => v.type === 'form')[0].props.onSubmit({ preventDefault() {}, currentTarget: form }) };
}
test('Admin login uses Customer brand, one task H1, native keyboard-friendly labels and public-origin home link', () => {
  const h = harness(), tree = h.render();
  assert.equal(all(tree, v => v.type === 'h1').length, 1);
  assert.equal(all(tree, v => v.type === 'h1')[0].props.children, 'Đăng nhập quản trị');
  const brand = all(tree, v => v.type === 'a')[0]; assert.equal(brand.props.href, 'https://museum.example.invalid/'); assert.match(brand.props['aria-label'], /Trang chủ bảo tàng/);
  assert.match(JSON.stringify(brand), /Thuyết minh bảo tàng/); assert.equal(all(brand, v => v.type === 'svg').length, 1);
  assert.doesNotMatch(JSON.stringify(tree), /Người kể chuyện AI|Foundation S12|ADMIN WORKSPACE|Mật khẩu không được lưu/);
  for (const name of ['email', 'password']) { const input = all(tree, v => v.type === 'input' && v.props.name === name)[0]; assert.equal(input.props.required, true); assert.ok(all(tree, v => v.type === 'label' && v.props.htmlFor === input.props.id).length); }
  assert.equal(h.calls.length, 0); assert.equal(h.navigation.length, 0);
});
test('original empty-field validation focuses first invalid field and retains entered data', async () => {
  const h = harness(); h.form.values.email = ''; await h.submit(); assert.equal(h.focus.at(-1), 'email');
  h.form.values.email = 'preserved@example.invalid'; h.form.values.password = ''; await h.submit(); assert.equal(h.focus.at(-1), 'password');
  assert.equal(h.calls.length, 0); assert.equal(h.form.values.email, 'preserved@example.invalid');
  const error = all(h.render(), v => v.props?.role === 'alert')[0]; assert.ok(error);
  for (const input of all(h.render(), v => v.type === 'input')) assert.equal(input.props['aria-describedby'], error.props.id);
});
test('login success preserves credentials/API contract and redirect; pending UI blocks duplicate submit', async () => {
  let resolve; const h = harness(() => new Promise(done => { resolve = done; }));
  const first = h.submit(); await h.submit(); assert.equal(h.calls.length, 1);
  assert.deepEqual(h.calls[0], ['admin@example.invalid', 'unchanged-password']);
  const pending = h.render(); assert.equal(all(pending, v => v.type === 'form')[0].props['aria-busy'], true);
  assert.equal(all(pending, v => v.type === 'button')[0].props.disabled, true); assert.equal(all(pending, v => v.type === 'input').every(v => v.props.disabled), true);
  resolve(); await first; assert.equal(h.form.resets, 1); assert.equal(h.navigation[0][0], '/dashboard'); assert.equal(h.navigation[0][1].replace, true);
});
test('request failure ends loading, reports only safe original error and preserves form without redirect', async () => {
  const h = harness(async () => { throw Error('PRIVATE_DATABASE_KEY'); }); await h.submit();
  const tree = h.render(); assert.equal(all(tree, v => v.type === 'button')[0].props.disabled, false);
  assert.equal(all(tree, v => v.props?.role === 'alert')[0].props.children, 'Không thể đăng nhập bằng tài khoản quản trị này.');
  assert.doesNotMatch(JSON.stringify(tree), /PRIVATE_DATABASE_KEY/); assert.equal(h.form.resets, 0); assert.equal(h.navigation.length, 0); assert.equal(h.form.values.password, 'unchanged-password');
});
test('existing auth service still rejects CUSTOMER, stores ADMIN only, enforces me role and clears logout session', async () => {
  let role = 'CUSTOMER', token = null; const requests = [];
  const { adminAuthService } = compile('services/adminAuthService.ts', { '../lib/api': {
    adminApi: async (path, options) => { requests.push({ path, options }); return { user: { id: 'synthetic', role }, accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh' }; },
    adminSession: { set: value => { token = value; }, get: () => token, clear: () => { token = null; } },
  } });
  await assert.rejects(adminAuthService.login('admin@example.invalid', 'secret'), /ADMIN_REQUIRED/); assert.equal(token, null);
  role = 'ADMIN'; await adminAuthService.login('admin@example.invalid', 'secret'); assert.equal(token.user.role, 'ADMIN');
  assert.equal(requests[0].path, '/auth/login'); assert.equal(requests[0].options.method, 'POST');
  role = 'CUSTOMER'; await assert.rejects(adminAuthService.me(), /ADMIN_REQUIRED/);
  await adminAuthService.logout(); assert.equal(token, null); assert.equal(requests.at(-1).path, '/auth/logout');
});
test('existing protected-route redirect remains in place; login UI does not grant access', () => {
  let authenticated = false;
  const { RequireAdmin } = compile('routes/RequireAdmin.tsx', { 'react-router-dom': { Navigate: 'navigate', Outlet: 'outlet', useLocation: () => ({ pathname: '/dashboard', search: '' }) }, '../lib/api': { adminSession: { isAuthenticated: () => authenticated } } });
  assert.equal(RequireAdmin().type, 'navigate'); assert.equal(RequireAdmin().props.to, '/login');
  authenticated = true; assert.equal(RequireAdmin().type, 'outlet');
});
test('scoped layout keeps42/58 desktop, single-column mobile, natural scrolling, focus and local asset parity', () => {
  const css = readFileSync(new URL('../src/styles/admin-login.css', import.meta.url), 'utf8');
  assert.match(css, /42fr\) minmax\(0, 58fr/); assert.match(css, /max-width: 767px/); assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /max-width: 420px/); assert.match(css, /:focus-visible/); assert.match(css, /overflow-wrap: anywhere/);
  assert.doesNotMatch(css, /:root|\.admin-shell|overflow:\s*hidden|(?:^|[;{])\s*height:\s*100vh|transform:\s*scale/);
  const hash = url => createHash('sha256').update(readFileSync(url)).digest('hex');
  assert.equal(hash(new URL('../public/images/admin-login-museum.jpg', import.meta.url)), hash(new URL('../../frontend-web/public/museum/images/hero.jpg', import.meta.url)));
  for (const name of ['regular.ttf', 'semibold.ttf', 'bold.ttf', 'OFL.txt']) assert.equal(hash(new URL(`../public/fonts/be-vietnam-pro/${name}`, import.meta.url)), hash(new URL(`../../frontend-web/src/assets/fonts/be-vietnam-pro/${name}`, import.meta.url)));
});
