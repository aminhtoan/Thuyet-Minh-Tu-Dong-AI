import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const registerPage = await readFile(new URL('../src/pages/RegisterPlaceholder.tsx', import.meta.url), 'utf8');
const registerForm = await readFile(new URL('../src/features/auth/RegisterForm.tsx', import.meta.url), 'utf8');
const loginPage = await readFile(new URL('../src/pages/LoginPlaceholder.tsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles/register.css', import.meta.url), 'utf8');

test('Register polish is independently scoped and leaves approved Login wrapper intact', () => {
  assert.match(registerPage, /className="register-page"/);
  assert.match(loginPage, /className="login-page"/);
  assert.doesNotMatch(loginPage, /register-page/);
  assert.match(css, /\.register-page \.login-museum/);
});

test('Register retains all supported fields, visibility controls and navigation', () => {
  for (const label of ['Họ và tên', 'Email', 'Mật khẩu', 'Xác nhận mật khẩu']) assert.match(registerForm, new RegExp(`label="${label}"`));
  assert.equal((registerForm.match(/<PasswordField/g) ?? []).length, 2);
  assert.match(registerForm, /authService\.register/);
  assert.match(registerForm, /navigate\('\/login'/);
});

test('Register keeps synchronous duplicate-submit protection and compact viewport rules', () => {
  assert.match(registerForm, /submitLock\.current/);
  assert.match(registerForm, /loading=\{submitting\}/);
  assert.match(css, /register-page[\s\S]*100svh/);
  assert.match(css, /max-width: 1023px/);
  assert.match(css, /max-width: 767px/);
});
