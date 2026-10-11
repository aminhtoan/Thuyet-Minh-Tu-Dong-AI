import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getProfileIdentity } from '../src/features/auth/profileIdentity.mjs';

const source = await readFile(new URL('../src/pages/SettingsPlaceholder.tsx', import.meta.url), 'utf8');
const realRequire = createRequire(import.meta.url);
const exports = {};
runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, {
  exports,
  require: (name) => name === 'react' || name === 'react/jsx-runtime' ? realRequire(name) : name.includes('profileIdentity') ? { getProfileIdentity } : name.includes('profileUpdate') ? { createNameSaver: () => () => {}, validateDisplayName: () => null } : name.includes('authService') ? { authService: {} } : name.endsWith('/Button') ? { Button: ({ children, className, disabled, onClick }) => React.createElement('button', { className, disabled, onClick }, children) } : {},
});

test('rendered SaaS profile has one card, grouped identity and two detail rows', () => {
  const html = renderToStaticMarkup(React.createElement(exports.AccountProfile, { user: { id: 'test', fullName: 'Nguyễn Ánh', email: 'anh@example.test', role: 'CUSTOMER' } }));
  assert.equal((html.match(/<section /g) || []).length, 1);
  for (const value of ['Nguyễn Ánh', 'anh@example.test']) assert.equal(html.split(value).length - 1, 2);
  assert.equal(html.split('Khách hàng').length - 1, 1);
  assert.match(html, /account-profile__avatar[^>]*>N<\/span>/);
  assert.match(html, /account-profile__summary[^>]*><span class="account-profile__avatar"/);
  assert.match(html, /account-profile__identity/);
  assert.doesNotMatch(html, /account-profile__cover/);
  assert.equal((html.match(/<dt>/g) || []).length, 2);
  assert.match(html, /Thông tin cá nhân/);
  assert.doesNotMatch(html, /<input|<textarea|<button|<svg|Bảo mật/);
});

test('profile maps actual role and escapes account text', () => {
  const html = renderToStaticMarkup(React.createElement(exports.AccountProfile, { user: { id: 'test', fullName: '', email: 'fallback@example.test', role: 'ADMIN' } }));
  assert.match(html, /Quản trị viên/);
  assert.match(html, /account-profile__avatar[^>]*>F<\/span>/);
  const escaped = renderToStaticMarkup(React.createElement(exports.AccountProfile, { user: { id: 'test', fullName: '<script>', email: '', role: 'OTHER' } }));
  assert.doesNotMatch(escaped, /<script>/);
  assert.match(escaped, /Không xác định/);
});

test('SaaS edit action is in profile header, role is unique and success is not shown initially', () => {
  const html = renderToStaticMarkup(React.createElement(exports.AccountProfile, { user: { id: 'test', fullName: 'Nguyễn Ánh', email: 'anh@example.test', role: 'CUSTOMER' }, onUpdated: () => {} }));
  assert.match(html, /account-profile__summary[\s\S]*account-profile__edit-button[\s\S]*Chỉnh sửa[\s\S]*account-profile__content/);
  assert.equal((html.match(/<button/g) || []).length, 1);
  assert.doesNotMatch(html, /<dt>Vai trò|Đã cập nhật họ và tên|<input/);
});

test('Account route, loader and dropdown logout stay intact', async () => {
  const header = await readFile(new URL('../src/components/layout/Topbar.tsx', import.meta.url), 'utf8');
  const routes = await readFile(new URL('../src/routes/AppRouter.tsx', import.meta.url), 'utf8');
  assert.match(routes, /path="\/settings" element=\{<SettingsPlaceholder \/>\}/);
  assert.match(source, /authService\.me\(\)/);
  assert.match(source, /<AccountProfile user=\{user\} onUpdated=\{setUser\} \/>/);
  assert.match(header, /authService\.logout\(\)/);
  assert.match(header, /confirmationMessages\.logout/);
  assert.match(header, /!isAccountPage && <form className="topbar__search"/);
});

test('compact profile CSS removes cover/waves and keeps information close and responsive', async () => {
  const css = await readFile(new URL('../src/styles/account.css', import.meta.url), 'utf8');
  assert.match(css, /max-width: 820px/);
  assert.match(css, /width: 80px; height: 80px/);
  assert.match(css, /grid-template-columns: minmax\(100px, 1fr\) minmax\(0, 2fr\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.doesNotMatch(css, /linear-gradient|::before|::after|account-profile__cover|text-align: right/);
  assert.doesNotMatch(css, /margin-top: -44px/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.doesNotMatch(css + source, /account-banner|account-details|account-information|account-card__heading/);
});

test('compact profile stays in normal flow with divider and adjacent labels/values', async () => {
  const css = await readFile(new URL('../src/styles/account.css', import.meta.url), 'utf8');
  const shell = await readFile(new URL('../src/styles/shell.css', import.meta.url), 'utf8');
  assert.match(shell, /\.topbar \{ position: sticky/);
  assert.match(css, /\.account-page \{[^}]*margin: 8px auto 0/);
  assert.match(css, /\.account-profile__content \{[^}]*border-top: 1px solid var\(--color-border\)/);
  assert.match(css, /\.account-profile__summary \{[^}]*gap: 24px/);
  assert.doesNotMatch(css, /margin(?:-top)?: -/);
  assert.match(css, /gap: 6px/);
  assert.match(css, /\.account-profile__details > div \+ div \{ border-top/);
  assert.doesNotMatch(css, /background: var\(--color-background\)/);
});

test('final Account spacing is compact without clipping and edit button aligns to name row', async () => {
  const css = await readFile(new URL('../src/styles/account.css', import.meta.url), 'utf8');
  assert.match(css, /\.account-profile \{ padding: 24px 32px/);
  assert.match(css, /\.account-profile__content \{ margin-top: 20px; padding-top: 16px/);
  assert.match(css, /\.account-profile \.account-profile__edit-button \{ align-self: flex-start;[^}]*min-height: 44px/);
  assert.match(css, /\.account-profile__details > div:last-child \{ padding-bottom: 8px/);
  assert.doesNotMatch(css, /overflow: hidden|\.account-profile \{[^}]*\bheight:/);
  assert.match(css, /\.account-profile__summary \.account-profile__edit-button \{ flex-basis: 100%/);
  assert.doesNotMatch(source, /setFeedback|Đã cập nhật họ và tên/);
});
